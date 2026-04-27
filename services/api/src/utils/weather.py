import logging
from datetime import UTC, datetime

import pandas as pd
from src.api.schemas import ForecastData
from src.utils.geo_cache import GeoCacheService
from src.utils.weather_api_protocol import WeatherApiProtocol

logger = logging.getLogger(__name__)


class WeatherService:
    def __init__(
        self, geo_cache_service: GeoCacheService, weather_api_client: WeatherApiProtocol
    ) -> None:
        if not geo_cache_service:
            raise ValueError("geo_cache_service is required")
        if not weather_api_client:
            raise ValueError("weather_api is required")

        self.geo_cache_service = geo_cache_service
        self.weather_api_client = weather_api_client

        self._last_df: pd.DataFrame | None = None
        self._last_loc_key: str | None = None

    def _get_active_forecast_df(
        self,
        latitude: float,
        longitude: float,
        dt: datetime | None = None,
    ) -> pd.DataFrame | None:
        """
        Retrieves the active forecast DataFrame for the given location and time.
        :param latitude:
        :param longitude:
        :param dt:
        :return:
        """
        loc_key = self.geo_cache_service.get_location_key(latitude, longitude)

        # return from cache
        if self._last_loc_key == loc_key and self._last_df is not None:
            return self._last_df

        df = self.geo_cache_service.get_latest_weather_forecast(latitude, longitude)

        if df is None:
            logger.info(
                f"no cached weather forecast found for {latitude}, {longitude}, calling API"
            )
            try:
                forecasts = self.weather_api_client.fetch_forecast(
                    latitude=latitude, longitude=longitude, dt=dt
                )
                if not forecasts:
                    return None

                # save to cache
                self.geo_cache_service.save_weather_forecast(
                    latitude=latitude, longitude=longitude, forecasts=forecasts
                )

                df = pd.DataFrame(forecasts)
                if "timestamp" in df.columns:
                    df["timestamp"] = pd.to_datetime(df["timestamp"])
            except Exception as e:
                logger.error(f"error fetching weather forecast for {latitude}, {longitude}: {e}")
                return None

        # update our in-memory cache
        self._last_df = df
        self._last_loc_key = loc_key
        return df

    def get_forecast(
        self,
        latitude: float,
        longitude: float,
        dt: datetime,
    ) -> ForecastData | None:
        """
        gets the most relevant forecast data point for a given location and timestamp
        :param latitude:
        :param longitude:
        :param dt:
        :return:
        """
        if not (-90 <= latitude <= 90):
            raise ValueError(f"latitude must be between -90 and 90, got {latitude}")
        if not (-180 <= longitude <= 180):
            raise ValueError(f"longitude must be between -180 and 180, got {longitude}")

        if dt.tzinfo is None:
            logger.warning(f"timezone not set for {dt}, setting to UTC")
            dt = dt.replace(tzinfo=UTC)

        df = self._get_active_forecast_df(latitude, longitude, dt)
        if df is None or df.empty:
            return None

        past_points = df[df["timestamp"] <= dt]

        if past_points.empty:
            best_row = df.iloc[0]
            logger.warning(
                f"requested timestamp {dt} is before any forecast data, using first available"
            )
        else:
            best_row = past_points.iloc[-1]

        return best_row.to_dict()

    def get_forecast_range(
        self,
        latitude: float,
        longitude: float,
        start_dt: datetime,
        end_dt: datetime,
    ) -> list[ForecastData]:
        """
        retrieves a range of forecast data points for a given location and time range
        :param latitude:
        :param longitude:
        :param start_dt:
        :param end_dt:
        :return:
        """
        if start_dt.tzinfo is None:
            logger.warning(f"timezone not set for {start_dt}, setting to UTC")
            start_dt = start_dt.replace(tzinfo=UTC)
        if end_dt.tzinfo is None:
            logger.warning(f"timezone not set for {end_dt}, setting to UTC")
            end_dt = end_dt.replace(tzinfo=UTC)

        df = self._get_active_forecast_df(latitude=latitude, longitude=longitude, dt=start_dt)
        if df is None or df.empty:
            return []

        # filter the df to our range
        mask = (df["timestamp"] >= start_dt) & (df["timestamp"] <= end_dt)
        range_df = df.loc[mask]

        if range_df.empty:
            # try to get at least the single point for the start_time
            point = self.get_forecast(latitude=latitude, longitude=longitude, dt=start_dt)
            return [point] if point else []

        return range_df.to_dict(orient="records")
