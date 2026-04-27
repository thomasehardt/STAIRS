import logging
import os
import shutil
import time
from datetime import date, timedelta
from pathlib import Path

import pandas as pd
from src.api.schemas import ForecastData

logger = logging.getLogger(__name__)
CACHE_ROOT = Path(os.getenv("CACHE_DIR", "cache"))


class GeoCacheService:
    """
    Service for managing location-based analytical caches (weather, ephemeris).
    Uses 0.01-degree rounding to avoid excessive cache size.
    """

    @staticmethod
    def get_location_key(latitude: float, longitude: float) -> str:
        """
        normalize latitude/longitude to 0.01-degree precision
        :param latitude:
        :param longitude:
        :return:
        """
        return f"lat_{round(latitude, 2):.2f}_lon_{round(longitude, 2):.2f}"

    def get_ephemeris_path(self, latitude: float, longitude: float, dt: date) -> Path:
        """
        get the path to the ephemeris cache file for the given location and date
        :param latitude:
        :param longitude:
        :param dt:
        :return:
        """
        loc_key = self.get_location_key(latitude, longitude)
        date_str = dt.isoformat()
        return (
            CACHE_ROOT
            / "ephemeris"
            / f"loc={loc_key}"
            / f"date={date_str}"
            / "data.parquet"
        )

    def get_weather_path(
        self, latitude: float, longitude: float, fetch_date: date | None = None
    ) -> Path:
        """
        returns the path for a 15-day weather forecast cache file for the given location,
        partitioned by location and the "as_of" fetch date
        :param latitude:
        :param longitude:
        :param fetch_date:
        :return:
        """
        loc_key = self.get_location_key(latitude, longitude)
        as_of = (fetch_date or date.today()).isoformat()
        return (
            CACHE_ROOT
            / "weather"
            / f"loc={loc_key}"
            / f"as_of={as_of}"
            / "data.parquet"
        )

    def get_latest_weather_path(self, latitude: float, longitude: float) -> Path | None:
        """
        returns the path for the latest weather forecast cache file for the given location,
        partitioned by location and the "as_of" fetch date
        :param latitude:
        :param longitude:
        :return:
        """
        loc_key = self.get_location_key(latitude, longitude)
        loc_dir = CACHE_ROOT / "weather" / f"loc={loc_key}"

        if not loc_dir.exists():
            return None

        as_of_dirs = sorted(loc_dir.glob("as_of=*"), reverse=True)
        if not as_of_dirs:
            return None

        parquet_file = as_of_dirs[0] / "data.parquet"
        return parquet_file if parquet_file.exists() else None

    def save_weather_forecast(
        self, latitude: float, longitude: float, forecasts: list[ForecastData]
    ) -> None:
        """
        saves the given weather forecasts to the cache, partitioned by location and the "as_of" fetch date
        :param latitude:
        :param longitude:
        :param forecasts:
        :return:
        """
        if not forecasts:
            return

        weather_path = self.get_weather_path(latitude, longitude)
        weather_path.parent.mkdir(parents=True, exist_ok=True)

        df = pd.DataFrame(forecasts)
        df.to_parquet(weather_path, index=False)
        logger.info(f"saved {len(forecasts)} weather forecasts to {weather_path}")

    def get_latest_weather_forecast(
        self, latitude: float, longitude: float, ttl_seconds: int = 3600
    ) -> pd.DataFrame | None:
        """
        returns the latest weather forecast for the given location, if it is within the given ttl_seconds
        :param latitude:
        :param longitude:
        :param ttl_seconds:
        :return:
        """
        path = self.get_latest_weather_path(latitude, longitude)
        if not path or not path.exists():
            return None

        # TTL Check
        mtime = path.stat().st_mtime
        if (time.time() - mtime) > ttl_seconds:
            logger.debug(f"weather forecast for {latitude}, {longitude} is stale, removing")
            # TODO: should we also delete the file(s)?
            return None

        try:
            df = pd.read_parquet(path)
            if "timestamp" in df.columns:
                df["timestamp"] = pd.to_datetime(df["timestamp"])
            return df
        except Exception as e:
            logger.error(f"error reading weather forecast from {path}: {e}")
            return None

    def cleanup_stale_cache(self, days_to_keep_weather: int = 1) -> None:
        """
        removes weather forecast cache files that are older than the given number of
        days; we don't need to clean up ephemeris cache files, since they are only used
        for short-term predictions and don't require frequent cleanup
        :param days_to_keep_weather:
        :return:
        """
        weather_root = CACHE_ROOT / "weather"
        if not weather_root.exists():
            return

        cutoff_date = date.today() - timedelta(days=days_to_keep_weather)

        for loc_dir in weather_root.iterdir():
            if not loc_dir.is_dir():
                continue

            for as_of_dir in loc_dir.glob("as_of=*"):
                if not as_of_dir.is_dir():
                    continue

                try:
                    as_of_date_str = as_of_dir.name.split("=")[-1]
                    as_of_date = date.fromisoformat(as_of_date_str)

                    if as_of_date < cutoff_date:
                        try:
                            logger.info(
                                f"removing stale weather forecast cache for {loc_dir.name} as of {as_of_date}"
                            )
                            shutil.rmtree(as_of_dir)
                        except Exception as e:
                            logger.error(
                                f"error removing stale weather forecast cache for {loc_dir.name} as of {as_of_date}: {e}"
                            )
                except (IndexError, ValueError):
                    logger.warning(
                        f"invalid as_of date in {as_of_dir.name}, skipping cleanup"
                    )
