from datetime import UTC

import astropy.units as u
import duckdb
import numpy as np
import pandas as pd
from astropy.time import Time
from fastapi import APIRouter, Depends, HTTPException, Response
from src.api.deps import get_weather_service
from src.api.schemas import (
    ForecastResponse,
    ObservationBlock,
    PlanRequest,
    PlanResponse,
    TargetOpportunitySeries,
    TargetRecommendation,
)
from src.astro_logic.visibility import get_astronomical_night
from src.catalog.duck_service import DuckCatalogService
from src.db.duck_session import get_duck_db
from src.planner.location_service import resolve_location
from src.planner.multi_night import MultiNightPlanner
from src.planner.scheduler import NightScheduler
from src.utils.export import CsvExporter, SkySafariExporter
from src.utils.weather import WeatherService

router = APIRouter()


import logging

logger = logging.getLogger(__name__)


def _build_plan_context(
    request: PlanRequest,
    db: duckdb.DuckDBPyConnection,
    weather_service: WeatherService | None,
):
    """Shared logic to build catalog service, location, and timeline plan."""
    catalog_service = DuckCatalogService(db)

    profile = catalog_service.get_profile_by_name(request.telescope_profile_name)
    if not profile:
        raise HTTPException(status_code=404, detail="Telescope profile not found")

    loc = resolve_location(
        db=db,
        latitude=request.latitude,
        longitude=request.longitude,
        name=request.location_name,
        elevation_m=request.elevation_m,
        bortle_scale=request.bortle_scale,
    )

    scheduler = NightScheduler(location=loc, catalog_service=catalog_service)
    start_time = Time(request.start_time) if request.start_time else Time.now()

    plan = scheduler.build_timeline(
        profile=profile,
        start_time=start_time,
        min_alt=request.min_alt,
        weather_service=weather_service,
    )

    return loc, plan, start_time


@router.post("/generate", response_model=PlanResponse)
async def generate_plan(
    request: PlanRequest,
    db: duckdb.DuckDBPyConnection = Depends(get_duck_db),
    weather_service: WeatherService | None = Depends(get_weather_service),
) -> PlanResponse:
    """Generate a chronological observation plan for a single night."""
    logger.info(f"Generating plan for {request.location_name} at {request.start_time}")
    loc, plan, start_time = _build_plan_context(request, db, weather_service)

    return PlanResponse(
        location_name=loc.name,
        astronomical_night_start=plan["astronomical_night_start"],
        astronomical_night_end=plan["astronomical_night_end"],
        timeline=[ObservationBlock(**block) for block in plan["timeline"]],
        recommendations=[
            TargetRecommendation(**rec) for rec in plan.get("recommendations", [])
        ],
    )


@router.post("/export/skylist")
async def export_plan_skylist(
    request: PlanRequest,
    db: duckdb.DuckDBPyConnection = Depends(get_duck_db),
    weather_service: WeatherService | None = Depends(get_weather_service),
) -> Response:
    """Generates and returns a SkySafari .skylist file for the plan."""
    loc, plan, start_time = _build_plan_context(request, db, weather_service)

    # 4. Extract targets from the plan
    targets = []
    for block in plan["timeline"]:
        targets.append(
            {
                "identifier": block["target_id"],
                "common_name": block.get("common_name"),
                "oss": block.get("oss_score"),
            }
        )

    # 5. Generate the file content
    exporter = SkySafariExporter()
    content = exporter.generate_skylist(targets)

    # 6. Return as a downloadable file
    filename = f"plan_{loc.name.replace(' ', '_')}_{start_time.datetime.date()}.skylist"
    return Response(
        content=content,
        media_type="text/plain",
        headers={"Content-Disposition": f"attachment; filename={filename}"},
    )


@router.post("/export/csv")
async def export_plan_csv(
    request: PlanRequest,
    db: duckdb.DuckDBPyConnection = Depends(get_duck_db),
    weather_service: WeatherService | None = Depends(get_weather_service),
) -> Response:
    """Generates and returns a CSV file for the observation plan."""
    loc, plan, start_time = _build_plan_context(request, db, weather_service)

    # 4. Generate CSV content
    exporter = CsvExporter()
    content = exporter.generate_csv(plan["timeline"])

    # 5. Return as a downloadable file
    filename = f"plan_{loc.name.replace(' ', '_')}_{start_time.datetime.date()}.csv"
    return Response(
        content=content,
        media_type="text/csv",
        headers={"Content-Disposition": f"attachment; filename={filename}"},
    )


@router.get("/forecast", response_model=ForecastResponse)
async def get_multi_night_forecast(
    latitude: float | None = None,
    longitude: float | None = None,
    location_name: str | None = None,
    days: int = 14,
    start_date: str | None = None,
    db: duckdb.DuckDBPyConnection = Depends(get_duck_db),
    weather_service: WeatherService | None = Depends(get_weather_service),
) -> ForecastResponse:
    """Generate a multi-night imaging quality forecast."""
    loc = resolve_location(
        db=db,
        latitude=latitude,
        longitude=longitude,
        name=location_name,
    )

    planner = MultiNightPlanner(location=loc)

    t_start = None
    if start_date:
        try:
            t_start = Time(start_date)
        except ValueError:
            raise HTTPException(
                status_code=400, detail="Invalid start_date format. Use YYYY-MM-DD."
            )

    forecast = planner.generate_forecast(
        days=days, start_time=t_start, weather_service=weather_service
    )

    return ForecastResponse(location_name=loc.name, days=forecast)


@router.get("/target-series", response_model=TargetOpportunitySeries)
async def get_target_opportunity_series(
    target_id: str,
    location_name: str,
    telescope_profile_name: str,
    start_time: str | None = None,
    db: duckdb.DuckDBPyConnection = Depends(get_duck_db),
    weather_service: WeatherService | None = Depends(get_weather_service),
) -> TargetOpportunitySeries:
    """
    Generate a high-resolution time-series of altitude and quality scores
    for a target.
    """
    catalog_service = DuckCatalogService(db)

    profile = catalog_service.get_profile_by_name(telescope_profile_name)
    if not profile:
        raise HTTPException(status_code=404, detail="Telescope profile not found")

    loc = resolve_location(db=db, name=location_name)

    t_start = Time(start_time) if start_time else Time.now()
    observer = loc.get_observer()

    night_window = get_astronomical_night(observer, t_start)
    if not night_window:
        raise HTTPException(
            status_code=400, detail="No astronomical night found for this date/location"
        )

    n_start, n_end = night_window

    # Generate 10-minute intervals
    total_hours = (n_end - n_start).sec / 3600.0
    num_points = int(total_hours * 6)
    times = n_start + u.minute * (10 * np.arange(num_points))

    target_data = catalog_service.get_target_by_id(target_id)
    if not target_data:
        raise HTTPException(status_code=404, detail="Target not found")

    from astropy.coordinates import AltAz, SkyCoord

    target_coord = SkyCoord(
        ra=target_data["ra_deg"] * u.deg, dec=target_data["dec_deg"] * u.deg
    )

    # 1. Calculate Altitudes
    altaz_frames = AltAz(obstime=times, location=observer.location)
    current_altazs = target_coord.transform_to(altaz_frames)
    alts = current_altazs.alt.deg
    azs = current_altazs.az.deg

    # 2. Calculate Weather (if available)
    weather_range = []
    if weather_service:
        weather_range = weather_service.get_forecast_range(
            latitude=loc.latitude,
            longitude=loc.longitude,
            start_dt=n_start.to_datetime(timezone=UTC),
            end_dt=n_end.to_datetime(timezone=UTC),
        )

    from src.astro_logic.scoring import (
        calculate_oss_vectorized,
        calculate_sqs_vectorized,
        calculate_weather_score_vectorized,
    )

    # 3. Calculate Scores
    # We need peak_alt for calculate_oss_vectorized
    from src.astro_logic.visibility import get_peak_altitudes

    peak_alt = get_peak_altitudes(observer, target_coord, night_window)

    target_df = pd.DataFrame([target_data])
    target_df["peak_alt"] = peak_alt

    static_oss, _ = calculate_oss_vectorized(
        target_df, profile, min_target_altitude=30.0, bortle_scale=loc.bortle_scale
    )

    points = []
    for i, t in enumerate(times):
        mid_dt = t.to_datetime(timezone=UTC)
        w_mult = 1.0
        if weather_range:
            past = [
                p
                for p in weather_range
                if pd.to_datetime(p["timestamp"]).tz_localize(None).replace(tzinfo=UTC)
                <= mid_dt
            ]
            weather_point = past[-1] if past else weather_range[0]
            w_mult = calculate_weather_score_vectorized(
                weather_point.get("cloud_cover_percent", 0),
                weather_point.get("humidity", 0),
                weather_point.get("seeing"),
            )[0]

        from src.astro_logic.visibility import get_moon_quality

        m_mult = get_moon_quality(observer, t)

        sqs = calculate_sqs_vectorized(
            np.array([alts[i]]), np.array([azs[i]]), w_mult, m_mult
        )[0]

        # OSS * SQS
        final_score = static_oss[0] * (sqs / 100.0)

        # Mask if below horizon or blocked
        if alts[i] < 0 or loc.is_blocked(azs[i], alts[i]):
            final_score = 0.0

        points.append(
            {
                "time": mid_dt,
                "alt_deg": round(float(alts[i]), 1),
                "score": round(float(final_score), 1),
                "sqs": round(float(sqs), 1),
            }
        )

    return TargetOpportunitySeries(
        target_id=target_id, location_name=loc.name, points=points
    )
