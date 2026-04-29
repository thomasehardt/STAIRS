import asyncio
import logging
import os
from datetime import UTC, date, datetime
from pathlib import Path

import astropy.units as u
import numpy as np
import pandas as pd
from astropy.coordinates import AltAz, SkyCoord, get_body
from astropy.time import Time, TimeDelta
from src.astro_logic.visibility import get_astronomical_night, get_peak_altitudes
from src.db.duck_session import get_duck_db
from src.planner.planner_models import ObservationLocation
from src.utils.geo_cache import GeoCacheService

logger = logging.getLogger(__name__)
CACHE_ROOT = Path(os.getenv("CACHE_DIR", "cache"))


class EphemerisManager:
    """
    handles pre-calculation and caching of ephemeris data in parquet format
    """

    def __init__(self) -> None:
        self.geo_cache = GeoCacheService()

    def get_peak_alt_path(
        self,
        latitude: float,
        longitude: float,
        dt: date,
    ) -> Path:
        loc_key = self.geo_cache.get_location_key(latitude, longitude)
        return (
            CACHE_ROOT
            / "ephemeris"
            / "peak_altitudes"
            / f"loc={loc_key}"
            / f"date={dt.isoformat()}"
            / "data.parquet"
        )

    def get_moon_qual_path(
        self,
        latitude: float,
        longitude: float,
        dt: date,
    ) -> Path:
        loc_key = self.geo_cache.get_location_key(latitude, longitude)
        return (
            CACHE_ROOT
            / "ephemeris"
            / "moon_qualities"
            / f"loc={loc_key}"
            / f"date={dt.isoformat()}"
            / "data.parquet"
        )

    async def warm_up_cache(self, days: int = 30) -> None:
        """
        Calculates ephemeris data in batches for all missing days in the window.
        """
        await asyncio.sleep(5)
        logger.info(f"warming up ephemeris cache for {days} days")

        try:
            db = get_duck_db()
            tables = [table[0] for table in db.execute("SHOW TABLES").fetchall()]
            if "targets" not in tables or "locations" not in tables:
                logger.warning("database not initialized, skipping ephemeris warmup")
                return

            locations_df = db.execute("SELECT * FROM locations").df()
            if locations_df.empty:
                logger.warning("no locations in database, skipping ephemeris warmup")
                return

            targets_df = db.execute("SELECT identifier, ra_deg, dec_deg FROM targets").df()
            if targets_df.empty:
                logger.warning("no targets in database, skipping ephemeris warmup")
                return

            # Prepare coordinates for all targets
            coords = SkyCoord(
                ra=targets_df["ra_deg"].values,
                dec=targets_df["dec_deg"].values,
                unit=(u.deg, u.deg),
            )
            target_ids = targets_df["identifier"].tolist()

            start_time = Time.now()
            today = start_time.to_datetime(timezone=UTC).date()
            work_performed = False

            for _, loc_row in locations_df.iterrows():
                loc_dict = {k: (v if not (isinstance(v, float) and np.isnan(v)) else None) 
                           for k, v in loc_row.to_dict().items()}
                if loc_dict.get("horizon_mask") is None:
                    loc_dict["horizon_mask"] = []
                
                loc = ObservationLocation(**loc_dict)
                observer = loc.get_observer()
                
                # 1. Identify missing days
                missing_nights = []
                for day_idx in range(days):
                    check_date = today + pd.Timedelta(days=day_idx)
                    p_path = self.get_peak_alt_path(loc.latitude, loc.longitude, check_date)
                    m_path = self.get_moon_qual_path(loc.latitude, loc.longitude, check_date)
                    
                    if not p_path.exists() or not m_path.exists():
                        # We need the actual night window to be sure
                        night = get_astronomical_night(observer, Time(datetime.combine(check_date, datetime.min.time(), tzinfo=UTC)))
                        if night:
                            missing_nights.append(night)

                if not missing_nights:
                    continue

                logger.info(f"Warming up ephemeris cache for {len(missing_nights)} nights at {loc.name}")
                work_performed = True

                # 2. Vectorized Moon Quality Calculation
                all_times = []
                night_indices = []
                for i, (n_start, n_end) in enumerate(missing_nights):
                    duration_hours = (n_end - n_start).to(u.hour).value
                    num_slots = int(duration_hours * 4)
                    if num_slots > 0:
                        times = n_start + np.arange(num_slots) * TimeDelta(15 * u.minute)
                        all_times.append(times)
                        night_indices.extend([i] * num_slots)
                
                if all_times:
                    flat_times = Time(np.concatenate([t.jd for t in all_times]), format='jd')
                    moon_coords = get_body("moon", flat_times, observer.location)
                    altaz_frame = AltAz(obstime=flat_times, location=observer.location)
                    moon_alts = moon_coords.transform_to(altaz_frame).alt.deg
                    
                    # Illumination per night (sampled at midnight for simplicity in batch)
                    night_mids = Time([ (n[0].jd + n[1].jd)/2 for n in missing_nights], format='jd')
                    night_ills = np.array([observer.moon_illumination(t) for t in night_mids])
                    
                    flat_ills = night_ills[night_indices]
                    flat_moon_quals = 1.0 - (flat_ills * 0.5 * (np.maximum(0, moon_alts) / 90.0))
                    
                    # Partition and save moon quality
                    cursor = 0
                    for i, (n_start, _) in enumerate(missing_nights):
                        n_slots = len(all_times[i])
                        mq_df = pd.DataFrame({
                            "timestamp": [t.to_datetime(timezone=UTC) for t in all_times[i]],
                            "moon_quality": flat_moon_quals[cursor:cursor+n_slots]
                        })
                        self.get_moon_qual_path(loc.latitude, loc.longitude, n_start.to_datetime(timezone=UTC).date()).parent.mkdir(parents=True, exist_ok=True)
                        mq_df.to_parquet(self.get_moon_qual_path(loc.latitude, loc.longitude, n_start.to_datetime(timezone=UTC).date()), index=False)
                        cursor += n_slots

                # 3. Vectorized Peak Altitudes Calculation
                # We sample 5 points per night. For N nights, we calculate 5N samples for all targets.
                sample_times_list = []
                for n_start, n_end in missing_nights:
                    duration = n_end - n_start
                    sample_times_list.append(n_start + np.linspace(0, 1, 5) * duration)
                
                flat_sample_times = Time(np.concatenate([t.jd for t in sample_times_list]), format='jd')
                
                # result shape: (num_targets, num_total_samples)
                altaz_frame = AltAz(obstime=flat_sample_times[np.newaxis, :], location=observer.location)
                # Note: this can be memory intensive for huge target lists, but StAIRS targets are usually < 20k
                all_alts = coords[:, np.newaxis].transform_to(altaz_frame).alt.deg
                
                for i, (n_start, _) in enumerate(missing_nights):
                    # Slice the 5 samples for this night: (num_targets, 5)
                    night_alts = all_alts[:, i*5 : (i+1)*5]
                    peak_alts = np.max(night_alts, axis=1)
                    
                    alts_df = pd.DataFrame({"identifier": target_ids, "peak_alt": peak_alts})
                    self.get_peak_alt_path(loc.latitude, loc.longitude, n_start.to_datetime(timezone=UTC).date()).parent.mkdir(parents=True, exist_ok=True)
                    alts_df.to_parquet(self.get_peak_alt_path(loc.latitude, loc.longitude, n_start.to_datetime(timezone=UTC).date()), index=False)

                await asyncio.sleep(0.1)

            if work_performed:
                logger.info("ephemeris cache warming complete")
            else:
                logger.info("ephemeris cache is already warm")
        except Exception as e:
            logger.error(f"error during ephemeris cache warming: {e}", exc_info=True)

    def get_cached_peak_altitude(
        self, latitude: float, longitude: float, night_start: Time
    ) -> dict | None:
        night_date = night_start.to_datetime(timezone=UTC).date()
        peaks_path = self.get_peak_alt_path(
            latitude=latitude,
            longitude=longitude,
            dt=night_date,
        )
        if peaks_path.exists():
            try:
                df = pd.read_parquet(peaks_path)
                return dict(zip(df["identifier"], df["peak_alt"], strict=False))
            except Exception as e:
                logger.warning(
                    f"failed to read peak altitudes cache at {peaks_path}: {e}"
                )
        return None

    def get_cached_moon_qualities(
        self, latitude: float, longitude: float, night_start: Time
    ) -> pd.DataFrame | None:
        night_date = night_start.to_datetime(timezone=UTC).date()
        moon_path = self.get_moon_qual_path(
            latitude=latitude,
            longitude=longitude,
            dt=night_date,
        )
        if moon_path.exists():
            try:
                return pd.read_parquet(moon_path)
            except Exception as e:
                logger.warning(
                    f"failed to read moon qualities cache at {moon_path}: {e}"
                )
        return None
