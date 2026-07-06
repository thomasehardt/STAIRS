# Mobile port note: extracted verbatim from services/api/src/api/schemas.py
# (ForecastDay only - that file is the whole API's Pydantic schema layer).
from datetime import datetime

from pydantic import BaseModel


class ForecastDay(BaseModel):
    date: str  # ISO-8601 format
    astronomical_night_start: datetime | None = None
    astronomical_night_end: datetime | None = None
    total_dark_hours: float
    effective_hours: float
    quality_score: int
    relative_quality: float = 0.0
    absolute_quality: float = 0.0
    note: str | None = None
