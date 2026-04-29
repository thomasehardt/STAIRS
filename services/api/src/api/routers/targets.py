from datetime import UTC

import numpy as np
from astropy import units as u
from astropy.time import Time
from duckdb import DuckDBPyConnection
from fastapi import APIRouter, Depends, HTTPException
from src.api.schemas import (
    FovFit,
    PositionPoint,
    TargetDetail,
    TargetPositionSeries,
    TargetSearchItem,
    TargetSearchResponse,
)
from src.catalog.catalog_models import TargetRecord
from src.catalog.duck_service import DuckCatalogService
from src.db.duck_session import get_duck_db
from src.planner.planner_models import ObservationLocation

router = APIRouter()


@router.get("/search", response_model=TargetSearchResponse)
async def search_targets(
    q: str, limit: int = 50, db: DuckDBPyConnection = Depends(get_duck_db)
) -> TargetSearchResponse:
    """Search for targets by name or identifier."""
    service = DuckCatalogService(db)
    df = service.search_targets(q, limit)

    results = [
        TargetSearchItem(
            identifier=row["identifier"],
            common_name=row["common_name"],
            target_type=row["target_type"],
            constellation=row["constellation"],
            magnitude=row["magnitude"],
        )
        for _, row in df.iterrows()
    ]

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
        "FROM observation_logs WHERE target_id = ?",
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
    if profile_name:
        profile = service.get_profile_by_name(profile_name)
        if profile:
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

    positions = [
        PositionPoint(
            time=t.to_datetime(timezone=UTC),
            alt_deg=round(aa.alt.deg, 2),
            az_deg=round(aa.az.deg, 2),
        )
        for t, aa in zip(times, altaz, strict=False)
    ]

    return TargetPositionSeries(identifier=target_id, positions=positions)
