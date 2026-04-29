import logging
from datetime import UTC, datetime

import httpx
from src.api.schemas import ForecastData

logger = logging.getLogger(__name__)

BASE_URL = "https://api.open-meteo.com/v1/forecast"


class OpenMeteoWeatherApiClient:
    def __init__(self, api_key: str | None = None) -> None:
        if not api_key:
            logger.info(
                "No OpenMeteo API key provided, using default API which might have fewer features"
            )
        self.api_key = api_key

    def fetch_forecast(
        self,
        latitude: float,
        longitude: float,
        dt: datetime,
    ) -> list[ForecastData]:
        logger.debug(f"Fetching weather forecast for {latitude}, {longitude} at {dt}")

        params = {
            "latitude": latitude,
            "longitude": longitude,
            "hourly": ",".join([
                "temperature_2m",
                "relative_humidity_2m",
                "precipitation",
                "cloud_cover",
                "wind_speed_10m",
                "wind_direction_10m",
            ]),
            "timezone": "UTC",
            "forecast_days": 14,
        }

        try:
            response = httpx.get(BASE_URL, params=params, timeout=10.0)
            response.raise_for_status()
            data = response.json()
            logger.debug(f"OpenMeteo response: {data}")

            hourly = data.get("hourly", [])
            times = hourly.get("time", [])
            temps = hourly.get("temperature_2m", [])
            humidities = hourly.get("relative_humidity_2m", [])
            precipitations = hourly.get("precipitation", [])
            clouds = hourly.get("cloud_cover", [])
            wind_speeds = hourly.get("wind_speed_10m", [])
            wind_directions = hourly.get("wind_direction_10m", [])

            processed_forecasts: list[ForecastData] = []

            for i in range(len(times)):
                # note: open-meteo uses UTC without specifying as such
                forecast_dt = datetime.fromisoformat(times[i]).replace(tzinfo=UTC)

                processed_forecasts.append(
                    ForecastData(
                        timestamp=forecast_dt,
                        temperature_c=temps[i] if i < len(temps) else None,
                        cloud_cover_pct=(float(clouds[i]) if i < len(clouds) else None),
                        precipitation_prob=None,  # open-meteo doesn't provide this
                        precipitation_mm_per_hour=float(precipitations[i])
                        if i < len(precipitations)
                        else None,
                        wind_speed_mps=float(wind_speeds[i])
                        if i < len(wind_speeds)
                        else None,
                        wind_direction_deg=float(wind_directions[i])
                        if i < len(wind_directions)
                        else None,
                        humidity_pct=float(humidities[i])
                        if i < len(humidities)
                        else None,
                        seeing=None,  # open-meteo doesn't provide this'
                    )
                )

            return processed_forecasts

        except Exception as e:
            logger.error(f"error fetching weather forecast from open-meteo: {e}")
            raise RuntimeError(f"weather service API error: {e}")
