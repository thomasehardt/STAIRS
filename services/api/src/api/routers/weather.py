import logging
from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException, Query
from src.api.deps import get_weather_service
from src.api.schemas import ForecastData
from src.utils.weather import WeatherService

logger = logging.getLogger(__name__)
router = APIRouter()


@router.get("/", response_model=ForecastData)
async def get_weather_forecast(
    latitude: float = Query(..., ge=-90, le=90, description="Latitude"),
    longitude: float = Query(..., ge=-180, le=180, description="Longitude"),
    timestamp: datetime = Query(..., description="ISO-8601 timestamp for the forecast"),
    weather_service: WeatherService | None = Depends(get_weather_service),
) -> ForecastData:
    """
    get the weather forecast for a given location and timestamp
    :param latitude:
    :param longitude:
    :param timestamp:
    :param weather_service:
    :return:
    """
    if weather_service is None:
        raise HTTPException(status_code=400, detail="weather integration is disabled")

    try:
        forecast = weather_service.get_forecast(
            latitude=latitude, longitude=longitude, dt=timestamp
        )
        if forecast is None:
            raise HTTPException(status_code=404, detail="no forecast data available")
        return forecast
    except RuntimeError as e:
        raise HTTPException(status_code=502, detail=f"weather service error: {e}")


@router.get("/range", response_model=list[ForecastData])
async def get_weather_forecast_range(
    latitude: float = Query(..., ge=-90, le=90, description="Latitude"),
    longitude: float = Query(..., ge=-180, le=180, description="Longitude"),
    start: datetime = Query(
        ..., description="ISO-8601 start timestamp for the forecast"
    ),
    end: datetime = Query(..., description="ISO-8601 end timestamp for the forecast"),
    weather_service: WeatherService | None = Depends(get_weather_service),
) -> list[ForecastData]:
    """
    get weather forecasts for a time range at a location
    :param latitude:
    :param longitude:
    :param start:
    :param end:
    :param weather_service:
    :return:
    """
    if weather_service is None:
        raise HTTPException(status_code=400, detail="weather integration is disabled")

    if start >= end:
        raise HTTPException(
            status_code=400, detail="start timestamp must be before end timestamp"
        )

    try:
        return weather_service.get_forecast_range(
            latitude=latitude, longitude=longitude, start_dt=start, end_dt=end
        )
    except RuntimeError as e:
        raise HTTPException(status_code=502, detail=f"weather service error: {e}")
