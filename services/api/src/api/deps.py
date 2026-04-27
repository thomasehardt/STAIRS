import logging

from src.api.schemas import WeatherSettings
from src.utils.config_manager import ConfigManager
from src.utils.dummy_weather_api_client import DummyWeatherApiClient
from src.utils.geo_cache import GeoCacheService
from src.utils.open_meteo_client import OpenMeteoWeatherApiClient
from src.utils.weather import WeatherService
from src.utils.weather_api_protocol import WeatherApiProtocol

logger = logging.getLogger(__name__)
_weather_service: WeatherService | None = None


def get_weather_service() -> WeatherService | None:
    """
    gives the singleton weather service instance
    :return:
    """
    global _weather_service

    raw_config = ConfigManager.get_raw_config()
    weather_raw = raw_config.get("integrations", {}).get("weather", {})
    config = WeatherSettings(**weather_raw)

    if not config.enabled:
        logger.info(
            "weather integration is disabled, skipping initialization of weather client"
        )
        return None

    if _weather_service is None:
        if config.provider == "open-meteo":
            api_client: WeatherApiProtocol = OpenMeteoWeatherApiClient(
                api_key=config.api_key
            )
        else:
            api_client: WeatherApiProtocol = DummyWeatherApiClient(
                api_key=config.api_key or "not-required"
            )

        geo_cache = GeoCacheService()
        _weather_service = WeatherService(
            geo_cache_service=geo_cache, weather_api_client=api_client
        )

    return _weather_service
