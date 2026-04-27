import duckdb
import pandas as pd
from fastapi import APIRouter, Depends
from src.api.schemas import LocationItem, LocationListResponse
from src.db.duck_session import get_duck_db

router = APIRouter()


@router.get("/", response_model=LocationListResponse)
async def list_locations(
    db: duckdb.DuckDBPyConnection = Depends(get_duck_db),
) -> LocationListResponse:
    """Returns all saved locations from the config file (Lakehouse)."""

    df = db.execute("SELECT * FROM locations ORDER BY name").df()
    records = df.to_dict(orient="records")

    locations = []
    for row in records:
        # Helper to ensure we have a plain python scalar or list
        def clean(val):
            if val is None:
                return None
            if isinstance(val, float) and pd.isna(val):
                return None
            if hasattr(val, "tolist"):  # numpy array
                return val.tolist()
            if hasattr(val, "item"):  # numpy scalar
                return val.item()
            return val

        # Extra safety for horizon_mask specifically
        h_mask = clean(row.get("horizon_mask"))
        if isinstance(h_mask, list) and len(h_mask) == 0:
            h_mask = None

        locations.append(
            LocationItem(
                name=str(clean(row.get("name"))),
                latitude=float(clean(row.get("latitude"))),
                longitude=float(clean(row.get("longitude"))),
                elevation_m=float(clean(row.get("elevation_m"))),
                bortle_scale=(
                    int(clean(row.get("bortle_scale")))
                    if clean(row.get("bortle_scale")) is not None
                    else None
                ),
                is_default=bool(clean(row.get("is_default"))),
                timezone=(
                    str(clean(row.get("timezone"))) if row.get("timezone") else None
                ),
                horizon_mask=h_mask,
            )
        )

    return LocationListResponse(locations=locations)
