import astropy.units as u
import pandas as pd
from astropy.coordinates import AltAz, SkyCoord
from astropy.time import Time
from duckdb import DuckDBPyConnection
from src.api.schemas import ForecastData
from src.astro_logic.scoring import calculate_final_score
from src.astro_logic.visibility import (
    find_visible_window,
    get_astronomical_night,
    get_moon_quality,
    get_peak_altitudes,
)
from src.catalog.catalog_models import TelescopeProfile
from src.planner.planner_models import ObservationLocation


class DuckCatalogService:
    def __init__(self, conn: DuckDBPyConnection) -> None:
        self.conn = conn

    def list_catalogs(self) -> pd.DataFrame:
        return self.conn.execute("SELECT * FROM catalog_metadata ORDER by name").df()

    def get_catalog_metadata(self, catalog_id: str) -> dict | None:
        res = self.conn.execute(
            "SELECT * FROM catalog_metadata WHERE catalog_id = ?", [catalog_id]
        ).df()
        return res.to_dict(orient="records")[0] if not res.empty else None

    def search_targets(self, query: str, limit: int = 50) -> pd.DataFrame:
        sql = """
            SELECT identifier, common_name, target_type, constellation, magnitude
            FROM targets
            WHERE identifier ILIKE ?
              OR common_name ILIKE ?
            LIMIT ?
        """
        pattern = f"%{query}%"
        return self.conn.execute(sql, [pattern, pattern, limit]).df()

    def get_target_by_id(self, identifier: str) -> dict | None:
        res = self.conn.execute(
            "SELECT * FROM targets WHERE identifier = ?", [identifier]
        ).df()
        return res.to_dict(orient="records")[0] if not res.empty else None

    def list_profiles(self) -> list[TelescopeProfile]:
        df = self.conn.execute("SELECT * FROM profiles").df()
        return [TelescopeProfile(**row.to_dict()) for _, row in df.iterrows()]

    def get_profile_by_name(self, name: str) -> TelescopeProfile | None:
        res = self.conn.execute("SELECT * FROM profiles WHERE name = ?", [name]).df()
        return TelescopeProfile(**res.iloc[0].to_dict()) if not res.empty else None

    def get_recommendations(
        self,
        location: ObservationLocation,
        profile: TelescopeProfile,
        start_time: Time,
        min_alt: float = 30.0,
        catalog_ids: list[str] | None = None,
        weather_data: ForecastData | None = None,
    ) -> pd.DataFrame:
        observer = location.get_observer()

        where_clause = ""
        params = []
        if catalog_ids:
            placeholders = ",".join(["?" for _ in catalog_ids])
            where_clause = f"WHERE catalog_id in ({placeholders})"
            params = catalog_ids

        df = self.conn.execute(f"SELECT * FROM targets {where_clause}", params).df()
        if df.empty:
            return pd.DataFrame()

        night_window = get_astronomical_night(observer, start_time)
        if not night_window:
            return pd.DataFrame()

        targets = SkyCoord(
            ra=df["ra_deg"].values,
            dec=df["dec_deg"].values,
            unit=(u.deg, u.deg),
            frame="icrs",
        )

        df["peak_alt"] = get_peak_altitudes(observer, targets, night_window)
        candidates = df[df["peak_alt"] > (min_alt - 5.0)].copy()

        results = []
        cand_coords = SkyCoord(
            ra=candidates["ra_deg"].values,
            dec=candidates["dec_deg"].values,
            unit=(u.deg, u.deg),
        )

        altaz_frame = AltAz(
            obstime=start_time,
            location=observer.location,
        )
        moon_multiplier = get_moon_quality(observer, start_time)

        current_altazs = cand_coords.transform_to(altaz_frame)
        current_alts = current_altazs.alt.deg
        current_azs = current_altazs.az.deg

        for i, (_index, row) in enumerate(candidates.iterrows()):
            if location.is_blocked(current_azs[i], current_alts[i]):
                continue

            window = find_visible_window(
                observer, cand_coords[i], night_window, min_alt
            )
            if window:
                oss, aqs = calculate_final_score(
                    target=row,
                    profile=profile,
                    max_altitude=row["peak_alt"],
                    min_target_altitude=min_alt,
                    current_altaz=current_altazs[i],
                    weather_data=weather_data,
                    bortle_scale=location.bortle_scale,
                    moon_multiplier=moon_multiplier,
                )
                row_dict = row.to_dict()
                row_dict.update(
                    {
                        "visible_start": window[0],
                        "visible_end": window[1],
                        "oss": oss,
                        "aqs": aqs,
                    }
                )
                results.append(row_dict)
        if not results:
            return pd.DataFrame()

        final_df = pd.DataFrame(results)
        return final_df.sort_values(by="oss", ascending=False)
