from datetime import UTC

import astropy.units as u
import duckdb
import numpy as np
import pandas as pd
from astropy.coordinates import AltAz, SkyCoord
from astropy.time import Time
from fastapi import APIRouter, Depends, HTTPException, Response
from src.api.deps import get_weather_service
from src.api.schemas import (
    ExposureRecommendation,
    ForecastResponse,
    ObservationBlock,
    PlanRequest,
    PlanResponse,
    PositionPoint,
    QualityPoint,
    QualitySeriesResponse,
    SkyStatusPoint,
    SkyViewResponse,
    TargetOpportunitySeries,
    TargetRecommendation,
)
from src.astro_logic.exposure import (
    calculate_optimal_sub_exposure,
    calculate_sky_flux,
    calculate_total_integration_time,
)
from src.astro_logic.scoring import (
    calculate_oss_vectorized,
    calculate_sqs_vectorized,
    calculate_weather_score_vectorized,
)
from src.astro_logic.visibility import (
    find_visible_window,
    get_astronomical_night,
    get_moon_quality,
    get_peak_altitudes,
    safe_round,
)
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
        include_targets=request.include_targets,
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
                "alt_deg": safe_round(alts[i], 1),
                "score": safe_round(final_score, 1),
                "sqs": safe_round(sqs, 1),
            }
        )

    return TargetOpportunitySeries(
        target_id=target_id, location_name=loc.name, points=points
    )


@router.post("/recommend", response_model=list[TargetRecommendation])
async def recommend_targets(
    request: PlanRequest,
    db: duckdb.DuckDBPyConnection = Depends(get_duck_db),
    weather_service: WeatherService | None = Depends(get_weather_service),
) -> list[TargetRecommendation]:
    """
    lightweight endpoint to fetch only top recommended targets
    """
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
    observer = loc.get_observer()
    start_time = Time(request.start_time) if request.start_time else Time.now()

    night_window = get_astronomical_night(observer, start_time)
    if not night_window:
        return []

    targets_df = catalog_service.conn.execute("SELECT * FROM targets").df()
    latitude = loc.latitude

    # 1. Broad Altitude Filter
    targets_df["theoretical_max_alt"] = 90.0 - np.abs(latitude - targets_df["dec_deg"])
    targets_df = targets_df[
        targets_df["theoretical_max_alt"] > (request.min_alt - 5.0)
    ].copy()

    # 2. Smart Aperture Filter (Limiting Magnitude)
    # threshold = 5 * log10(D) + K. For imaging, K around 6.0 is reasonable for
    # 'reachable'
    limiting_mag = 5.0 * np.log10(profile.aperture_mm) + 6.0
    # Also consider objects with no magnitude (often planetary nebulae or faint
    # clusters)
    # We'll be slightly more lenient with these if they have a common name
    targets_df = targets_df[
        (targets_df["magnitude"].isna())
        | (targets_df["magnitude"] <= limiting_mag)
        | (targets_df["common_name"].notna())
    ].copy()

    coords = SkyCoord(
        ra=targets_df["ra_deg"].values,
        dec=targets_df["dec_deg"].values,
        unit=(u.deg, u.deg),
    )
    targets_df["peak_alt"] = get_peak_altitudes(observer, coords, night_window)
    candidates = targets_df[targets_df["peak_alt"] > request.min_alt].copy()

    if candidates.empty:
        return []

    mid_time = night_window[0] + (night_window[1] - night_window[0]) / 2

    static_oss, static_aqs = calculate_oss_vectorized(
        candidates, profile, request.min_alt, bortle_scale=loc.bortle_scale
    )

    # For discovery/recommendations, we ignore current weather to show potential targets
    weather_multiplier = 1.0

    moon_multiplier = get_moon_quality(observer, mid_time)
    cand_coords = SkyCoord(
        ra=candidates["ra_deg"].values,
        dec=candidates["dec_deg"].values,
        unit=(u.deg, u.deg),
    )
    altaz_frame = AltAz(obstime=mid_time, location=observer.location)
    current_altazs = cand_coords.transform_to(altaz_frame)

    sqs_scores = calculate_sqs_vectorized(
        current_altazs.alt.deg,
        current_altazs.az.deg,
        weather_multiplier,
        moon_multiplier,
    )
    final_scores = static_oss * (sqs_scores / 100.0)

    candidates["final_score"] = final_scores
    top_candidates = candidates.sort_values("final_score", ascending=False).head(20)

    recommendations = []
    for _, row in top_candidates.iterrows():
        pos = candidates.index.get_loc(row.name)
        window = find_visible_window(
            observer, cand_coords[pos], night_window, request.min_alt
        )

        recommendations.append(
            TargetRecommendation(
                target_id=row["identifier"],
                common_name=row["common_name"]
                if not pd.isna(row["common_name"])
                else None,
                target_type=row["target_type"],
                constellation=row["constellation"],
                magnitude=row["magnitude"] if not pd.isna(row["magnitude"]) else None,
                oss_score=safe_round(static_oss[pos], 1),
                aqs_score=safe_round(static_aqs[pos], 1),
                sqs_score=safe_round(sqs_scores[pos], 1),
                final_score=safe_round(row["final_score"], 1),
                visible_start=observer.astropy_time_to_datetime(window[0])
                if window
                else None,
                visible_end=observer.astropy_time_to_datetime(window[1])
                if window
                else None,
                exposure=ExposureRecommendation(
                    optimal_sub_s=safe_round(
                        calculate_optimal_sub_exposure(
                            calculate_sky_flux(
                                loc.bortle_scale or 5,
                                profile.aperture_mm,
                                profile.focal_length_mm,
                                profile.pixel_pitch_um,
                                profile.quantum_efficiency,
                            ),
                            profile.read_noise_e,
                        ),
                        1,
                    ),
                    total_integration_h=safe_round(
                        calculate_total_integration_time(
                            row["magnitude"] if not pd.isna(row["magnitude"]) else 15.0,
                            row["angular_size"]
                            if isinstance(row["angular_size"], list)
                            and len(row["angular_size"]) > 0
                            else [10.0],
                            loc.bortle_scale or 5,
                            profile.aperture_mm,
                            profile.focal_length_mm,
                            profile.pixel_pitch_um,
                            profile.quantum_efficiency,
                            profile.read_noise_e,
                        )
                        / 3600.0,
                        1,
                    ),
                ),
            )
        )

    return recommendations


@router.get("/quality-series", response_model=QualitySeriesResponse)
async def get_quality_series(
    location_name: str,
    start_time: str | None = None,
    db: duckdb.DuckDBPyConnection = Depends(get_duck_db),
    weather_service: WeatherService | None = Depends(get_weather_service),
) -> QualitySeriesResponse:
    """
    generate a time-series of sky quality (Weather + Moon) for the night
    """
    loc = resolve_location(db=db, name=location_name)
    observer = loc.get_observer()
    t_start = Time(start_time) if start_time else Time.now()

    night_window = get_astronomical_night(observer, t_start)
    if not night_window:
        raise HTTPException(status_code=400, detail="No astronomical night found")

    n_start, n_end = night_window
    total_hours = (n_end - n_start).sec / 3600.0
    num_points = int(total_hours * 6)  # 10-minute intervals
    times = n_start + u.minute * (10 * np.arange(num_points))

    weather_range = []
    if weather_service:
        weather_range = weather_service.get_forecast_range(
            latitude=loc.latitude,
            longitude=loc.longitude,
            start_dt=n_start.to_datetime(timezone=UTC),
            end_dt=n_end.to_datetime(timezone=UTC),
        )

    from src.astro_logic.visibility import get_moon_quality

    points = []
    for t in times:
        mid_dt = observer.astropy_time_to_datetime(t)
        if not mid_dt:
            continue

        w_mult = 1.0
        s_mult = 1.0

        if weather_range:
            past = [
                p
                for p in weather_range
                if pd.to_datetime(p["timestamp"]).tz_localize(None).replace(tzinfo=UTC)
                <= mid_dt
            ]
            weather_point = past[-1] if past else weather_range[0]

            clouds = weather_point.get("cloud_cover_pct", 0)
            humidity = weather_point.get("humidity_pct", 0)
            seeing = weather_point.get("seeing")

            w_mult = calculate_weather_score_vectorized(clouds, humidity)[0]

            if seeing:
                s_mult = calculate_weather_score_vectorized(0, 0, seeing)[0]

        m_mult = get_moon_quality(observer, t)

        points.append(
            QualityPoint(
                time=mid_dt,
                score=safe_round(w_mult * m_mult * s_mult * 100.0, 1),
                moon_mult=safe_round(m_mult, 2),
                weather_mult=safe_round(w_mult, 2),
                seeing_mult=safe_round(s_mult, 2),
            )
        )

    return QualitySeriesResponse(location_name=loc.name, points=points)


@router.get("/sky-view", response_model=SkyViewResponse)
async def get_sky_view(
    latitude: float,
    longitude: float,
    location_name: str = "Query",
    start_time: str | None = None,
    target_ids: str | None = None,  # comma-separated
    db: duckdb.DuckDBPyConnection = Depends(get_duck_db),
    weather_service: WeatherService | None = Depends(get_weather_service),
) -> SkyViewResponse:
    """Provides Moon and Target positions for animation throughout the night."""
    from src.catalog.catalog_models import TargetRecord

    loc = resolve_location(
        db=db, latitude=latitude, longitude=longitude, name=location_name
    )
    observer = loc.get_observer()

    t_start = Time(start_time) if start_time else Time.now()
    # Find the dark window
    night = get_astronomical_night(observer, t_start)
    if not night:
        # If no dark night found, just use 8 hours from start
        night_start, night_end = t_start, t_start + u.hour * 8
    else:
        night_start, night_end = night

    # Sample every 30 minutes
    duration_hours = (night_end - night_start).to(u.hour).value
    num_points = max(2, int(duration_hours * 2) + 1)
    times = night_start + np.linspace(0, duration_hours, num_points) * u.hour

    weather_range = []
    if weather_service:
        weather_range = weather_service.get_forecast_range(
            latitude=loc.latitude,
            longitude=loc.longitude,
            start_dt=night_start.to_datetime(timezone=UTC),
            end_dt=night_end.to_datetime(timezone=UTC),
        )

    # Get target coordinates
    targets = []
    if target_ids:
        service = DuckCatalogService(db)
        ids = [tid.strip() for tid in target_ids.split(",") if tid.strip()]
        for tid in ids:
            tdata = service.get_target_by_id(tid)
            if tdata and tdata.get("identifier"):
                targets.append(TargetRecord.model_validate(tdata))

    timeline = []
    for t in times:
        mid_dt = observer.astropy_time_to_datetime(t)
        if not mid_dt:
            continue

        w_mult = 1.0
        s_mult = 1.0

        if weather_range:
            past = [
                p
                for p in weather_range
                if pd.to_datetime(p["timestamp"]).tz_localize(None).replace(tzinfo=UTC)
                <= mid_dt
            ]
            weather_point = past[-1] if past else weather_range[0]
            clouds = weather_point.get("cloud_cover_pct", 0)
            humidity = weather_point.get("humidity_pct", 0)
            seeing = weather_point.get("seeing")
            w_mult = calculate_weather_score_vectorized(clouds, humidity)[0]
            if seeing:
                s_mult = calculate_weather_score_vectorized(0, 0, seeing)[0]

        m_mult = get_moon_quality(observer, t)
        q_rel = safe_round(w_mult * m_mult * s_mult * 100.0, 1)
        b_mult = (1.0 - (loc.bortle_scale - 1) / 8.0) if loc.bortle_scale else 1.0
        q_abs = safe_round(q_rel * b_mult, 1)

        # Moon
        moon_altaz = observer.moon_altaz(t)
        moon_phase = observer.moon_illumination(t)

        target_pos = {}
        for target in targets:
            tcoord = SkyCoord(
                ra=target.right_ascension * u.hourangle, dec=target.declination * u.deg
            )
            taltaz = observer.altaz(t, tcoord)
            target_pos[target.identifier] = PositionPoint(
                time=mid_dt,
                alt_deg=safe_round(taltaz.alt.deg, 2),
                az_deg=safe_round(taltaz.az.deg, 2),
            )

        timeline.append(
            SkyStatusPoint(
                time=mid_dt,
                moon_alt=safe_round(moon_altaz.alt.deg, 2),
                moon_az=safe_round(moon_altaz.az.deg, 2),
                moon_phase=safe_round(float(moon_phase), 3),
                sky_quality_rel=q_rel,
                sky_quality_abs=q_abs,
                target_positions=target_pos,
            )
        )

    return SkyViewResponse(location_name=loc.name, timeline=timeline)
