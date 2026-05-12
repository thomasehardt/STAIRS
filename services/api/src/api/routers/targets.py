from datetime import UTC

import numpy as np
import pandas as pd
from astropy import units as u
from astropy.time import Time
from duckdb import DuckDBPyConnection
from fastapi import APIRouter, Depends, HTTPException
from src.api.schemas import (
    ExposureRecommendation,
    FovFit,
    PositionPoint,
    TargetDetail,
    TargetPositionSeries,
    TargetSearchItem,
    TargetSearchResponse,
)
from src.astro_logic.exposure import (
    calculate_optimal_sub_exposure,
    calculate_sky_flux,
    calculate_total_integration_time,
)
from src.astro_logic.visibility import safe_round
from src.catalog.catalog_models import TargetRecord
from src.catalog.duck_service import DuckCatalogService
from src.db.duck_session import get_duck_db
from src.planner.planner_models import ObservationLocation

router = APIRouter()


@router.get("/search", response_model=TargetSearchResponse)
async def search_targets(
    q: str = "",
    target_type: str | None = None,
    constellation: str | None = None,
    max_magnitude: float | None = None,
    limit: int = 50,
    db: DuckDBPyConnection = Depends(get_duck_db),
) -> TargetSearchResponse:
    """Search for targets by name or identifier with optional filters."""
    service = DuckCatalogService(db)
    df = service.search_targets(
        query=q,
        target_type=target_type,
        constellation=constellation,
        max_magnitude=max_magnitude,
        limit=limit,
    )

    # More robust NaN handling
    results = []
    for _, row in df.iterrows():
        # Convert row to dict and replace NaN with None safely
        row_dict = row.to_dict()
        d = {}
        for k, v in row_dict.items():
            if isinstance(v, list | np.ndarray):
                d[k] = v
            elif pd.isna(v):
                d[k] = None
            else:
                d[k] = v
        results.append(TargetSearchItem(**d))

    return TargetSearchResponse(results=results, total_found=len(results))


@router.get("/{target_id}", response_model=TargetDetail)
async def get_target_detail(
    target_id: str,
    profile_name: str | None = None,
    db: DuckDBPyConnection = Depends(get_duck_db),
) -> TargetDetail:
    """Get detailed information for a single target."""
    service = DuckCatalogService(db)
    target_data = service.get_target_by_id(target_id)
    if not target_data:
        raise HTTPException(status_code=404, detail="Target not found")

    # ensure it's valid
    target = TargetRecord.model_validate(target_data)

    # get our observation history for this object
    history_df = db.execute(
        "SELECT COUNT(*) as count, MAX(session_date) as last_date "
        "FROM observation_log WHERE target_id = ?",
        [target_id],
    ).df()

    if not history_df.empty and history_df.iloc[0]["count"] > 0:
        row = history_df.iloc[0]
        observation_count = int(row["count"])
        last_observed = row["last_date"]
        # Convert Pandas timestamp to date if needed
        if hasattr(last_observed, "date"):
            last_observed = last_observed.date()
    else:
        observation_count = 0
        last_observed = None

    fov_fit = None
    exposure = None
    image_url = None

    # Base FOV for image request
    img_fov_deg = 1.0

    if profile_name:
        profile = service.get_profile_by_name(profile_name)
        if profile:
            # FOV in arcmins
            fov_x, fov_y = profile.calculate_fov()
            img_fov_deg = (max(fov_x, fov_y) / 60.0) * 1.5  # 50% padding

            # We use target size to compute fit
            # size is stored as list in DuckDB/Parquet
            from src.astro_logic.scoring import get_target_size_fov

            target_size = get_target_size_fov(target)
            fov_min = profile.fov_min

            fit_ratio = target_size / fov_min

            suggested = "Landscape"
            if target.angular_size and len(target.angular_size) == 2:
                if target.angular_size[1] > target.angular_size[0]:
                    suggested = "Portrait"

            fov_fit = FovFit(
                fits_sensor=fit_ratio <= 1.0,
                percent_of_frame=round(fit_ratio * 100, 1),
                orientation_suggested=suggested,
            )

            # Exposure calculation
            from src.planner.location_service import resolve_location

            loc = resolve_location(db=db)  # get default location
            bortle = loc.bortle_scale or 5

            sky_flux = calculate_sky_flux(
                bortle,
                profile.aperture_mm,
                profile.focal_length_mm,
                profile.pixel_pitch_um,
                profile.quantum_efficiency,
            )

            exposure = ExposureRecommendation(
                optimal_sub_s=safe_round(
                    calculate_optimal_sub_exposure(sky_flux, profile.read_noise_e), 1
                ),
                total_integration_h=safe_round(
                    calculate_total_integration_time(
                        target.magnitude if target.magnitude is not None else 15.0,
                        list(target.angular_size) if target.angular_size else [10.0],
                        bortle,
                        profile.aperture_mm,
                        profile.focal_length_mm,
                        profile.pixel_pitch_um,
                        profile.quantum_efficiency,
                        profile.read_noise_e,
                    )
                    / 3600.0,
                    1,
                ),
            )

    # NASA SkyView DSS2 Red survey
    ra = target_data["ra_deg"]
    dec = target_data["dec_deg"]
    image_url = (
        f"https://skyview.gsfc.nasa.gov/cgi-bin/images?"
        f"survey=dss2r&position={ra},{dec}&size={img_fov_deg}&pixels=600&return=jpg"
    )

    return TargetDetail(
        identifier=target.identifier,
        ra_deg=target_data["ra_deg"],
        dec_deg=target_data["dec_deg"],
        target_type=target.target_type,
        magnitude=target.magnitude,
        angular_size=list(
            target.angular_size
        ),  # list(target.angular_size) if target.angular_size else None,
        distance=target.distance,
        constellation=target.constellation,
        common_name=target.common_name,
        catalog_id=target_data["catalog_id"],
        identifiers=target.identifiers,
        fov_fit=fov_fit,
        observation_count=observation_count,
        last_observed=last_observed,
        exposure=exposure,
        image_url=image_url,
        image_fov_deg=img_fov_deg,
    )


@router.get("/{target_id}/position", response_model=TargetPositionSeries)
async def get_target_position(
    target_id: str,
    latitude: float,
    longitude: float,
    start_time: str,
    hours: float = 8.0,
    db: DuckDBPyConnection = Depends(get_duck_db),
) -> TargetPositionSeries:
    """Generate a time-series of positions (Alt/Az) for a target."""
    service = DuckCatalogService(db)
    target_data = service.get_target_by_id(target_id)

    if not target_data:
        raise HTTPException(status_code=404, detail="Target not found")

    from astropy.coordinates import SkyCoord

    target_coord = SkyCoord(
        ra=target_data["ra_deg"] * u.deg, dec=target_data["dec_deg"] * u.deg
    )

    loc = ObservationLocation(
        name="Query",
        latitude=latitude,
        longitude=longitude,
        bortle_scale=None,
        elevation_m=0.0,
    )
    observer = loc.get_observer()

    t_start = Time(start_time)
    # Generate 5-minute intervals
    num_points = int(hours * 12)
    times = t_start + u.minute * (5 * np.arange(num_points))

    altaz = observer.altaz(times, target_coord)

    positions = []
    for t, aa in zip(times, altaz, strict=False):
        dt = observer.astropy_time_to_datetime(t)
        if dt:
            positions.append(
                PositionPoint(
                    time=dt,
                    alt_deg=safe_round(aa.alt.deg, 2),
                    az_deg=safe_round(aa.az.deg, 2),
                )
            )

    return TargetPositionSeries(identifier=target_id, positions=positions)
