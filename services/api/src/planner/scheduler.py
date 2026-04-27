import logging
from datetime import UTC

import astropy.units as u
import numpy as np
import pandas as pd
from astropy.time import Time, TimeDelta
from src.astro_logic.visibility import get_astronomical_night, get_peak_altitudes
from src.catalog.catalog_models import TelescopeProfile
from src.catalog.duck_service import DuckCatalogService
from src.planner.planner_models import ObservationLocation
from src.utils.weather import WeatherService

logger = logging.getLogger(__name__)


class NightScheduler:
    def __init__(
        self, location: ObservationLocation, catalog_service: DuckCatalogService
    ) -> None:
        self.location = location
        self.catalog_service = catalog_service

    def build_timeline(
        self,
        profile: TelescopeProfile,
        start_time: Time,
        min_alt: float = 30.0,
        block_size_minutes: int = 60,
        weather_service: WeatherService | None = None,
    ) -> dict:
        """
        Creates a list of sequential observations from astronomical dusk to dawn.
        """
        observer = self.location.get_observer()

        night_window = get_astronomical_night(observer, start_time)
        if not night_window:
            logger.warning(
                f"no night window found for latitude/longitude {self.location.latitude}, {self.location.longitude} at {start_time}"
            )
            return {
                "astronomical_night_start": None,
                "astronomical_night_end": None,
                "timeline": [],
                "recommendations": [],
            }

        night_start, night_end = night_window

        # 1. fetch all targets
        targets_df = self.catalog_service.conn.execute("SELECT * FROM targets").df()

        latitude = self.location.latitude
        targets_df["theoretical_max_alt"] = 90.0 - np.abs(latitude - targets_df["dec_deg"])
        targets_df = targets_df[
            targets_df["theoretical_max_alt"] > (min_alt - 5.0)
        ].copy()

        if targets_df.empty:
            logger.warning(
                f"no targets found for latitude/longitude {self.location.latitude}, {self.location.longitude} at {start_time}"
            )
            return {
                "astronomical_night_start": night_start.to_datetime(),
                "astronomical_night_end": night_end.to_datetime(),
                "timeline": [],
                "recommendations": [],
            }

        from src.utils.ephemeris_manager import EphemerisManager

        ephem_manager = EphemerisManager()
        cached_alts = ephem_manager.get_cached_peak_altitude(
            latitude=self.location.latitude,
            longitude=self.location.longitude,
            night_start=night_start,
        )

        if cached_alts:
            targets_df["peak_alt"] = targets_df["identifier"].map(cached_alts)
        else:
            from astropy.coordinates import SkyCoord

            coords = SkyCoord(
                ra=targets_df["ra_deg"].values,
                dec=targets_df["dec_deg"].values,
                unit=(u.deg, u.deg),
            )
            targets_df["peak_alt"] = get_peak_altitudes(observer, coords, night_window)

        candidates_pool = targets_df[targets_df["peak_alt"] > (min_alt - 5.0)].copy()
        from astropy.coordinates import SkyCoord

        pool_coords = SkyCoord(
            ra=candidates_pool["ra_deg"].values,
            dec=candidates_pool["dec_deg"].values,
            unit=(u.deg, u.deg),
        )

        weather_range = []
        if weather_service:
            weather_range = weather_service.get_forecast_range(
                latitude=self.location.latitude,
                longitude=self.location.longitude,
                start_dt=night_start.to_datetime(timezone=UTC),
                end_dt=night_end.to_datetime(timezone=UTC),
            )

        # 4. Pre-calculate Static OSS for all candidates
        from src.astro_logic.scoring import (
            calculate_oss_vectorized,
            calculate_sqs_vectorized,
            calculate_weather_score_vectorized,
        )

        static_oss, static_aqs = calculate_oss_vectorized(
            candidates_pool, profile, min_alt, bortle_scale=self.location.bortle_scale
        )
        candidates_pool["static_oss"] = static_oss
        candidates_pool["static_aqs"] = static_aqs

        blocks = []
        current_time = night_start
        block_delta = TimeDelta(block_size_minutes * u.minute)

        while current_time < night_end:
            block_end = min(current_time + block_delta, night_end)
            blocks.append((current_time, block_end))
            current_time = block_end

        timeline = []
        current_target_id = None
        target_best_stats = {}

        from astropy.coordinates import AltAz

        for b_start, b_end in blocks:
            midpoint = b_start + (b_end - b_start) / 2
            mid_dt = midpoint.to_datetime(timezone=UTC)

            w_mult = 1.0
            if weather_range:
                past = [
                    p
                    for p in weather_range
                    if pd.to_datetime(p["timestamp"]).tz_localize(None).replace(tzinfo=UTC) <= mid_dt
                ]
                weather_point = past[-1] if past else weather_range[0]
                w_mult = calculate_weather_score_vectorized(
                    weather_point.get("cloud_cover_pct", 0),
                    weather_point.get("humidity_pct", 0),
                    weather_point.get("seeing"),
                )[0]

            from src.astro_logic.visibility import get_moon_quality

            m_mult = get_moon_quality(observer, midpoint)

            altaz_frame = AltAz(obstime=midpoint, location=observer.location)
            current_altazs = pool_coords.transform_to(altaz_frame)
            current_alts = current_altazs.alt.deg
            current_azs = current_altazs.az.deg

            sqs_scores = calculate_sqs_vectorized(
                current_alts, current_azs, w_mult, m_mult
            )

            final_scores = candidates_pool["static_oss"].values * (sqs_scores / 100.0)
            final_aqs_scores = candidates_pool["static_aqs"].values * (
                sqs_scores / 100.0
            )

            # are we blocked?
            is_blocked = self.location.is_blocked_vectorized(current_azs, current_alts)
            final_scores[(current_alts < min_alt) | is_blocked] = 0
            final_aqs_scores[(current_alts < min_alt) | is_blocked] = 0

            # find the best targets
            best_idx = np.argmax(final_scores)
            best_score = final_scores[best_idx]

            if best_score <= 0:
                current_target_id = None
                continue

            selected_idx = best_idx
            if current_target_id is not None:
                curr_target_mask = (
                    candidates_pool["identifier"] == current_target_id
                ).values

                if any(curr_target_mask):
                    curr_idx = np.where(curr_target_mask)[0][0]
                    curr_score = final_scores[curr_idx]
                    if curr_score >= 0.8 * best_score:
                        selected_idx = curr_idx

            selected_row = candidates_pool.iloc[selected_idx]
            current_target_id = selected_row["identifier"]

            timeline.append(
                {
                    "target_id": selected_row["identifier"],
                    "common_name": (
                        None
                        if pd.isna(selected_row.get("common_name"))
                        else selected_row.get("common_name")
                    ),
                    "start_time": b_start.to_datetime(timezone=UTC),
                    "end_time": b_end.to_datetime(timezone=UTC),
                    "oss_score": round(float(final_scores[selected_idx]), 1),
                    "aqs_score": round(float(final_aqs_scores[selected_idx]), 1),
                }
            )

            # TODO: this "50" should be passed in to the method
            block_top_indices = np.argsort(final_scores)[-50:][::-1]
            for idx in block_top_indices:
                score = final_scores[idx]
                if score <= 0:
                    break
                tid = candidates_pool.iloc[idx]["identifier"]
                if (
                    tid not in target_best_stats
                    or score > target_best_stats[tid]["final"]
                ):
                    target_best_stats[tid] = {
                        "common_name": candidates_pool.iloc[idx].get("common_name"),
                        "oss": candidates_pool.iloc[idx]["static_oss"],
                        "aqs": candidates_pool.iloc[idx]["static_aqs"],
                        "sqs": sqs_scores[idx],
                        "final": score,
                        "final_aqs": final_aqs_scores[idx],
                        "idx": idx,
                    }

        # TODO: have the "20" be passed in as a parameter
        # Step 7: Format Recommendations
        recommendations = []
        sorted_recs = sorted(
            target_best_stats.items(), key=lambda x: x[1]["final"], reverse=True
        )[:20]
        from src.astro_logic.visibility import find_visible_window

        for tid, data in sorted_recs:
            idx = data["idx"]
            window = find_visible_window(
                observer, pool_coords[idx], night_window, min_alt
            )
            recommendations.append(
                {
                    "target_id": tid,
                    "common_name": (
                        data["common_name"]
                        if not pd.isna(data["common_name"])
                        else None
                    ),
                    "oss_score": round(float(data["oss"]), 1),
                    "aqs_score": round(float(data["aqs"]), 1),
                    "sqs_score": round(float(data["sqs"]), 1),
                    "final_score": round(float(data["final"]), 1),
                    "visible_start": window[0].to_datetime(timezone=UTC) if window else None,
                    "visible_end": window[1].to_datetime(timezone=UTC) if window else None,
                }
            )

        return {
            "astronomical_night_start": night_start.to_datetime(timezone=UTC),
            "astronomical_night_end": night_end.to_datetime(timezone=UTC),
            "timeline": timeline,
            "recommendations": recommendations,
        }
