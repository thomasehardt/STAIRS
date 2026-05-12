import numpy as np
from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException
from pydantic import BaseModel
from src.astro_logic.exposure import (
    calculate_optimal_sub_exposure,
    calculate_practical_sub_exposure,
    calculate_sky_flux,
    calculate_total_integration_time,
)
from src.astro_logic.visibility import safe_round
from src.catalog.duck_service import DuckCatalogService
from src.db.duck_session import get_duck_db
from src.utils.ephemeris_manager import EphemerisManager

router = APIRouter()


class ExposureCalcRequest(BaseModel):
    magnitude: float
    bortle: int
    telescope_profile_name: str
    angular_size: list[float] = [10.0]


class ExposureCalcResponse(BaseModel):
    aperture_mm: float
    sky_flux: float
    optimal_sub_s: float
    practical_sub_s: float
    total_integration_h: float


@router.get("/")
async def get_system_status() -> dict:
    """
    Returns the health status of the API.
    """
    return {"status": "operational", "version": "0.1.0"}


@router.post("/warm-cache")
async def warm_ephemeris_cache(background_tasks: BackgroundTasks, days: int = 30):
    """
    Manually triggers the ephemeris cache warming process.
    """
    ephem_manager = EphemerisManager()
    background_tasks.add_task(ephem_manager.warm_up_cache, days=days)
    return {"message": f"Cache warming started for {days} days in the background."}


@router.post("/calculate-exposure", response_model=ExposureCalcResponse)
async def calculate_exposure(
    request: ExposureCalcRequest, db=Depends(get_duck_db)
) -> ExposureCalcResponse:
    """
    Utility endpoint for standalone exposure calculations.
    """
    service = DuckCatalogService(db)
    profile = service.get_profile_by_name(request.telescope_profile_name)
    if not profile:
        raise HTTPException(status_code=404, detail="Profile not found")

    sky_flux = calculate_sky_flux(
        request.bortle,
        profile.aperture_mm,
        profile.focal_length_mm,
        profile.pixel_pitch_um,
        profile.quantum_efficiency,
    )

    sky_lim_sub = calculate_optimal_sub_exposure(sky_flux, profile.read_noise_e)
    prac_sub = calculate_practical_sub_exposure(
        sky_lim_sub, profile.focal_length_mm, is_alt_az=True
    )

    total_s = calculate_total_integration_time(
        request.magnitude if request.magnitude is not None else 13.0,
        request.angular_size,
        request.bortle,
        profile.aperture_mm,
        profile.focal_length_mm,
        profile.pixel_pitch_um,
        profile.quantum_efficiency,
        profile.read_noise_e,
    )

    return ExposureCalcResponse(
        aperture_mm=profile.aperture_mm,
        sky_flux=safe_round(sky_flux, 4),
        optimal_sub_s=safe_round(prac_sub, 1),
        practical_sub_s=safe_round(prac_sub, 1),
        total_integration_h=float(np.clip(safe_round(total_s / 3600.0, 2), 0.1, 12.0)),
    )
