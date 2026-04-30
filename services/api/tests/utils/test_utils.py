from datetime import date, datetime

import pytest
from src.utils.dummy_weather_api_client import DummyWeatherApiClient
from src.utils.geo_cache import GeoCacheService


def test_geo_cache_service_keys():
    service = GeoCacheService()
    key = service.get_location_key(51.482, -0.007)
    assert key == "lat_51.48_lon_-0.01"


def test_geo_cache_service_paths():
    service = GeoCacheService()
    dt = date(2026, 4, 29)
    path = service.get_ephemeris_path(51.48, 0.0, dt)
    assert "ephemeris" in str(path)
    assert "date=2026-04-29" in str(path)

    weather_path = service.get_weather_path(51.48, 0.0, dt)
    assert "weather" in str(weather_path)
    assert "as_of=2026-04-29" in str(weather_path)


def test_dummy_weather_api_client():
    client = DummyWeatherApiClient(api_key="test")
    from datetime import UTC

    dt = datetime(2026, 4, 29, 12, 0, 0, tzinfo=UTC)
    forecasts = client.fetch_forecast(51.48, 0.0, dt)

    assert len(forecasts) > 0
    assert isinstance(forecasts[0], dict)
    assert "timestamp" in forecasts[0]
    assert forecasts[0]["temperature_c"] is not None


def test_dummy_weather_api_client_no_key():
    with pytest.raises(ValueError):
        DummyWeatherApiClient(api_key="")
