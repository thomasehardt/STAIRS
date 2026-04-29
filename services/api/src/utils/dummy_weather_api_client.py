import logging
from datetime import datetime, timedelta
from typing import Any

from src.api.schemas import ForecastData

logger = logging.getLogger(__name__)


# a dummy weather client requiring an API key - the data is just dummy data
# this should NOT be used for anything other than testing
class DummyWeatherApiClient:
    def __init__(self, api_key: str) -> None:
        if not api_key:
            raise ValueError(f"API key is required for {self.__class__.__name__}")
        self.api_key = api_key

    def fetch_forecast(
        self, latitude: float, longitude: float, dt: datetime
    ) -> list[ForecastData]:
        logger.debug(f"Fetching weather forecast for {latitude}, {longitude} at {dt}")

        response_data = self._generate_dummy_api_response_for_range(
            latitude, longitude, dt
        )

        processed_forecasts: list[ForecastData] = []
        for point_data in response_data:
            try:
                ts_str = point_data.get("timestamp")
                if not ts_str:
                    logger.warning(
                        "skipping forecast data due to missing timestamp in "
                        "weather forecast response: {point_data}"
                    )
                    continue

                # TODO: ts_str is obviously not None at this point, so why the warning?
                forecast_dt = datetime.fromisoformat(ts_str.replace("Z", "+00:00"))

                processed_forecasts.append(
                    ForecastData(
                        timestamp=forecast_dt,
                        temperature_c=point_data.get("temperature_c"),
                        cloud_cover_pct=point_data.get("cloud_cover_percent"),
                        precipitation_mm_per_hour=point_data.get(
                            "precipitation_mm_per_hour"
                        ),
                        precipitation_prob=point_data.get("precipitation_probability"),
                        wind_speed_mps=point_data.get("wind_speed_mps"),
                        wind_direction_deg=point_data.get("wind_direction_deg"),
                        humidity_pct=point_data.get("humidity"),
                        seeing=point_data.get("seeing"),
                    )
                )
            except ValueError:
                logger.warning(
                    "skipping forecast data point due to malformed data: "
                    "{point_data}, error: {e}"
                )
            except Exception as e:
                logger.error(
                    f"failed to process forecast data point: {point_data}, error: {e}"
                )
        return processed_forecasts

    @staticmethod
    def _generate_dummy_api_response_for_range(
        latitude: float, longitude: float, for_timestamp: datetime
    ) -> list[dict[str, Any]]:
        """
        fake some data
        :param latitude:
        :param longitude:
        :param for_timestamp:
        :return:
        """

        all_forecast_points: list[dict[str, Any]] = []

        # define a window for forecast data
        window_start = for_timestamp - timedelta(hours=24)
        window_end = for_timestamp + timedelta(hours=24)

        # first four hours give weather in 15-minute windows
        current_ts_15min = window_start.replace(minute=0, second=0, microsecond=0)
        for i in range(int(4 * 60 / 15)):  # 4 hours in 15-minute increments
            point_ts = current_ts_15min + timedelta(minutes=i * 15)
            if window_start <= point_ts < window_start + timedelta(hours=4):
                all_forecast_points.append(
                    {
                        "timestamp": point_ts.strftime("%Y-%m-%dT%H:%M:%SZ"),
                        "temperature_c": 15.0
                        + (point_ts.hour - 12) * 0.5
                        + (point_ts.minute / 60.0) * 0.1
                        + i * 0.05,
                        "cloud_cover_percent": 20.0 + (point_ts.hour % 5) * 5 + i * 0.2,
                        "precipitation_mm_per_hour": 0.0 if point_ts.hour % 3 else 0.5,
                        "precipitation_probability": 10 if point_ts.hour % 3 else 0,
                        "wind_speed_mps": 4.0 + (point_ts.minute % 10) * 0.2,
                        "wind_direction_deg": (point_ts.hour * 15) % 360,
                        "humidity": 60.0 + (point_ts.hour % 20),
                        "seeing": 1.5 + (i % 3) * 0.2,
                    }
                )

        # remainder of next 24 hours gives hourly information
        current_ts_hourly = (window_start + timedelta(hours=4)).replace(
            minute=0, second=0, microsecond=0
        )
        for i in range(20):  # our remainder is 20 hours
            point_ts = current_ts_hourly + timedelta(hours=i)
            if (
                window_start + timedelta(hours=4)
                <= point_ts
                < window_start + timedelta(hours=24)
            ):
                all_forecast_points.append(
                    {
                        "timestamp": point_ts.strftime("%Y-%m-%dT%H:%M:%SZ"),
                        "temperature_c": 14.0 + (point_ts.hour - 12) * 0.5 + i * 0.1,
                        "cloud_cover_percent": 22.0 + (point_ts.hour % 5) * 4 + i * 0.3,
                        "precipitation_mm_per_hour": 0.0 if point_ts.hour % 4 else 0.1,
                        "precipitation_probability": 5 if point_ts.hour % 4 else 0,
                        "wind_speed_mps": 4.5 + (point_ts.minute % 10) * 0.2,
                        "wind_direction_deg": (point_ts.hour * 13) % 360,
                        "humidity": 55.0 + (point_ts.hour % 15),
                        "seeing": 1.8 + (i % 4) * 0.1,
                    }
                )

        # remainder of our 14-day window is in 12-hour increments
        current_ts_12hr = (window_start + timedelta(hours=24)).replace(
            minute=0, second=0, microsecond=0
        )
        for i in range(
            int(
                (window_end - (window_start + timedelta(hours=24))).total_seconds()
                / (12 * 60 * 60)
            )
            + 1
        ):
            point_ts = current_ts_12hr + timedelta(hours=i * 12)
            if window_start + timedelta(hours=24) <= point_ts < window_end:
                all_forecast_points.append(
                    {
                        "timestamp": point_ts.strftime("%Y-%m-%dT%H:%M:%SZ"),
                        "temperature_c": 10.0 + (point_ts.day - window_start.day) * 1.0,
                        "cloud_cover_percent": 30.0 + (point_ts.hour % 12) * 1.0,
                        "precipitation_mm_per_hour": 0.0,
                        "precipitation_probability": 0,
                        "wind_speed_mps": 5.0,
                        "wind_direction_deg": 180.0,
                        "humidity": 50.0 + (point_ts.hour % 10),
                        "seeing": 2.0 + (i % 2) * 0.3,
                    }
                )

        # we have all our data points ... now ensure that they are within our
        # range
        all_forecast_points = [
            point
            for point in all_forecast_points
            if window_start
            <= datetime.fromisoformat(point["timestamp"].replace("Z", "+00:00"))
            < window_end
        ]
        all_forecast_points.sort(key=lambda x: x["timestamp"])

        return all_forecast_points
