from datetime import date, datetime
from typing import TypedDict

from pydantic import BaseModel, ConfigDict
from src.utils.config_manager import ConfigManager


def get_plan_example() -> dict:
    """
    returns a dynamic example of a plan for Swagger
    :return:
    """
    config = ConfigManager.get_raw_config()
    default_loc = next(
        (loc for loc in config.get("locations", []) if loc.get("default")), {}
    )
    default_telescope = config.get("planning", {}).get(
        "default_telescope", "Seestar S50"
    )

    return {
        "latitude": default_loc.get("latitude"),
        "longitude": default_loc.get("longitude"),
        "elevation_m": default_loc.get("elevation_m", 0.0),
        "telescope_profile_name": default_telescope,
        "start_time": datetime.now().isoformat(),
        "min_alt": 30.0,
        "location_name": default_loc.get("name"),
        "bortle_scale": default_loc.get("bortle_scale"),
    }

class PlanRequest(BaseModel):
    latitude: float | None = None
    longitude: float | None = None
    elevation_m: float = 0.0
    telescope_profile_name: str
    start_time: datetime | None = None
    min_alt: float = 30.0
    location_name: str | None = None
    bortle_scale: int | None = None

    model_config = ConfigDict(json_schema_extra={"example": get_plan_example()})


class ObservationBlock(BaseModel):
    target_id: str
    common_name: str | None = None
    start_time: datetime
    end_time: datetime
    oss_score: float
    aqs_score: float | None = None


class TargetRecommendation(BaseModel):
    target_id: str
    common_name: str | None = None
    oss_score: float  # Suitability score
    aqs_score: float | None = None  # Absolute Quality Score
    sqs_score: float  # Sky quality score
    final_score: float
    visible_start: datetime | None = None
    visible_end: datetime | None = None


class PlanResponse(BaseModel):
    location_name: str
    astronomical_night_start: datetime | None = None
    astronomical_night_end: datetime | None = None
    timeline: list[ObservationBlock]
    recommendations: list[TargetRecommendation] = []


class TargetSearchItem(BaseModel):
    identifier: str
    common_name: str | None = None
    target_type: str
    constellation: str
    magnitude: float | None = None


class TargetSearchResponse(BaseModel):
    results: list[TargetSearchItem]
    total_found: int


class CatalogItem(BaseModel):
    """Metadata for an astronomical catalog."""

    id: str
    name: str
    description: str | None = None
    author: str | None = None
    item_count: int


class CatalogListResponse(BaseModel):
    """Response wrapper for listing catalogs."""

    catalogs: list[CatalogItem]


class TelescopeProfileItem(BaseModel):
    """Metadata for a telescope hardware configuration."""

    name: str
    aperture_mm: int
    focal_length_mm: int
    sensor_x: int
    sensor_y: int
    pixel_pitch_um: float


class ProfileListResponse(BaseModel):
    """Response wrapper for listing telescope profiles."""

    profiles: list[TelescopeProfileItem]


class FovFit(BaseModel):
    fits_sensor: bool
    percent_of_frame: float
    orientation_suggested: str | None = None  # "Landscape" or "Portrait"


class TargetDetail(BaseModel):
    identifier: str
    ra_deg: float
    dec_deg: float
    target_type: str
    magnitude: float | None = None
    angular_size: list[float] | None = None
    distance: float | None = None
    constellation: str | None = None
    common_name: str | None = None
    catalog_id: str
    catalog_name: str | None = None
    identifiers: list[str] | None = []
    fov_fit: FovFit | None = None
    last_observed: date | None = None
    observation_count: int | None = None

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

class ForecastResponse(BaseModel):
    location_name: str
    days: list[ForecastDay]


class PositionPoint(BaseModel):
    time: datetime
    alt_deg: float
    az_deg: float


class TargetPositionSeries(BaseModel):
    identifier: str
    positions: list[PositionPoint]


class OpportunityPoint(BaseModel):
    time: datetime
    alt_deg: float
    score: float
    sqs: float


class TargetOpportunitySeries(BaseModel):
    target_id: str
    location_name: str
    points: list[OpportunityPoint]


class LocationItem(BaseModel):
    name: str
    latitude: float
    longitude: float
    elevation_m: float = 0.0
    bortle_scale: int | None = None
    is_default: bool = False
    timezone: str | None = None
    horizon_mask: list[tuple[float, float]] | None = None


class LocationListResponse(BaseModel):
    locations: list[LocationItem]


class ObservationLogCreate(BaseModel):
    target_id: str
    session_date: date | None = None
    notes: str | None = None
    rating: int | None = None
    status: str = "Captured"


class ObservationLogItem(BaseModel):
    id: int
    target_id: str
    session_date: date
    notes: str | None = None
    rating: int | None = None
    status: str
    created_at: datetime


class ObservationLogListResponse(BaseModel):
    logs: list[ObservationLogItem]


class LocationConfig(BaseModel):
    name: str
    latitude: float
    longitude: float
    elevation_m: float = 0.0
    bortle_scale: int | None = None
    default: bool = False


class PlanningSettings(BaseModel):
    default_telescope: str | None = "Seestar S50"
    min_altitude: float | None = 25.0
    max_altitude: float | None = 75.0
    min_duration_minutes: int | None = 60
    block_size_minutes: int | None = 60
    min_top_threshold: float | None = 50.0
    # advanced overrides
    max_magnitude: float | None = None
    min_angular_size_arcmin: float | None = None
    max_surface_brightness: float | None = None


class WeatherSettings(BaseModel):
    enabled: bool = False
    provider: str = "dummy"
    api_key: str | None = None

class LoggingSettings(BaseModel):
    level: str = "INFO"
    max_size_mb: int = 10
    backup_count: int = 5

class IntegrationsSettings(BaseModel):
    weather: WeatherSettings


class AppConfig(BaseModel):
    locations: list[LocationConfig]
    planning: PlanningSettings
    integrations: IntegrationsSettings
    logging: LoggingSettings = LoggingSettings()


# this lets us use PATCH to update only the fields we want
class SettingsUpdate(BaseModel):
    locations: list[LocationConfig] | None = None
    planning: PlanningSettings | None = None
    integrations: IntegrationsSettings | None = None
    logging: LoggingSettings | None = None

class ForecastData(TypedDict):
    """
    defines the structure of a single weather forecast data point for a specific
    location and time
    """

    timestamp: datetime
    temperature_c: float | None
    cloud_cover_pct: float | None
    precipitation_mm_per_hour: float | None
    precipitation_prob: float | None
    wind_speed_mps: float | None
    wind_direction_deg: float | None
    humidity_pct: float | None
    seeing: float | None



