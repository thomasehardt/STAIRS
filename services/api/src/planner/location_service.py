import json
import logging

import pandas as pd
from duckdb import DuckDBPyConnection
from fastapi import HTTPException
from src.planner.planner_models import ObservationLocation

logger = logging.getLogger(__name__)


def resolve_location(
    db: DuckDBPyConnection,
    latitude: float | None = None,
    longitude: float | None = None,
    name: str | None = None,
    elevation_m: float = 0.0,
    bortle_scale: int | None = None,
) -> ObservationLocation:
    """
    creates an ObservationLocation object from provided parameters or retrieves from database if name is provided
    :param db:
    :param latitude:
    :param longitude:
    :param name:
    :param elevation_m:
    :param bortle_scale:
    :return:
    """
    if latitude is not None and longitude is not None:
        return ObservationLocation(
            name=name or "Custom Location",
            latitude=latitude,
            longitude=longitude,
            elevation_m=elevation_m,
            bortle_scale=bortle_scale,
        )

    if name:
        res = db.execute("SELECT * FROM locations WHERE name = ?", [name]).df()
    else:
        res = db.execute("SELECT * FROM locations WHERE is_default = true").df()

    if res.empty:
        raise HTTPException(
            status_code=400,
            detail=f"Location {name} not found and no default location set",
        )

    row = res.iloc[0]

    mask = row.get("horizon_mask")
    if isinstance(mask, str):
        try:
            mask = json.loads(mask)
        except json.JSONDecodeError:
            logger.warning(f"invalid horizon mask for location {name}: {mask}")
            mask = []
    elif mask is None or (isinstance(mask, float) and pd.isna(mask)):
        logger.warning(f"no horizon mask for location {name}")
        mask = []
    elif hasattr(mask, "size") and mask.size == 0:
        logger.warning(f"empty horizon mask for location {name}")
        mask = []

    return ObservationLocation(
        name=str(row["name"]),
        latitude=float(row["latitude"]),
        longitude=float(row["longitude"]),
        elevation_m=float(row["elevation_m"]),
        bortle_scale=(
            int(row["bortle_scale"]) if pd.notna(row.get("bortle_scale")) else None
        ),
        horizon_mask=mask,
    )
