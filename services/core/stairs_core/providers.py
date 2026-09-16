"""
Interfaces the planning engine needs from its host but does not implement.

services/api satisfies these with DuckDB, the Open-Meteo weather client and
the on-disk ephemeris/forecast caches. The mobile app satisfies TargetSource
with duckdb-wasm, WeatherProvider with a direct Open-Meteo fetch, and passes
no caches at all (the engine simply computes everything).
"""

from datetime import datetime
from typing import Any, Protocol

import pandas as pd
from astropy.time import Time


class TargetSource(Protocol):
    def load_targets(self) -> pd.DataFrame:
        """Every catalog target as a DataFrame (identifier, ra_deg, dec_deg, ...)."""


class WeatherProvider(Protocol):
    def get_forecast_range(
        self,
        latitude: float,
        longitude: float,
        start_dt: datetime | None,
        end_dt: datetime | None,
    ) -> list[Any]:
        """Hourly ForecastData points (see stairs_core.schemas) for the window."""


class MoonQualityCache(Protocol):
    def get_cached_moon_qualities(
        self, latitude: float, longitude: float, night_start: Time
    ) -> pd.DataFrame | None:
        """Precomputed 15-minute moon-quality slots for the night, if available."""


class PeakAltitudeCache(Protocol):
    def get_cached_peak_altitude(
        self, latitude: float, longitude: float, night_start: Time
    ) -> dict[str, float] | None:
        """Precomputed peak altitude per target identifier for the night, if any."""


class ForecastCache(Protocol):
    def get(self, key: str, ttl_seconds: int | None = None) -> Any | None:
        """Cached value for key if present and younger than ttl_seconds."""

    def set(self, key: str, data: Any) -> None:
        """Store a JSON-serializable value under key."""
