import logging
from datetime import datetime
from typing import Protocol, runtime_checkable

from src.api.schemas import ForecastData

logger = logging.getLogger(__name__)


@runtime_checkable
class WeatherApiProtocol(Protocol):
    def fetch_forecast(
        self,
        latitude: float,
        longitude: float,
        timestamp: datetime,
    ) -> list[ForecastData]:
        """
        Fetches weather forecast data for a given location and datetime.
        :param latitude:
        :param longitude:
        :param timestamp:
        :return:
        """
        ...
