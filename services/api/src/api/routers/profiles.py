import duckdb
from fastapi import APIRouter, Depends
from src.api.schemas import ProfileListResponse
from src.catalog.duck_service import DuckCatalogService
from src.db.duck_session import get_duck_db

router = APIRouter()


@router.get("/", response_model=ProfileListResponse)
async def list_profiles(
    db: duckdb.DuckDBPyConnection = Depends(get_duck_db),
) -> ProfileListResponse:
    """Returns a list of all telescope profiles."""
    service = DuckCatalogService(db)
    profiles = service.list_profiles()

    return {
        "profiles": [
            {
                "name": profile.name,
                "aperture_mm": profile.aperture_mm,
                "focal_length_mm": profile.focal_length_mm,
                "sensor_x": profile.sensor_x,
                "sensor_y": profile.sensor_y,
                "pixel_pitch_um": profile.pixel_pitch_um,
            }
            for profile in profiles
        ]
    }
