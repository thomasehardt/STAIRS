from datetime import date

import duckdb
import pandas as pd
from fastapi import APIRouter, Depends, HTTPException
from src.api.schemas import (
    ObservationLogCreate,
    ObservationLogItem,
    ObservationLogListResponse,
)
from src.db.duck_session import get_duck_db

router = APIRouter()


def _clean_value(val):
    """Normalize DuckDB/numpy/pandas values to JSON-safe Python types."""
    if val is None:
        return None
    if isinstance(val, float) and pd.isna(val):
        return None
    if hasattr(val, "tolist"):
        return val.tolist()
    if hasattr(val, "item"):
        return val.item()
    if hasattr(val, "__class__") and val.__class__.__name__ == "NAType":
        return None
    return val


def _rows_to_log_items(df):
    """Convert a DataFrame of observation_log rows to ObservationLogItem list."""
    return [
        ObservationLogItem(
            id=int(_clean_value(row["id"])),
            target_id=str(_clean_value(row["target_id"])),
            session_date=_clean_value(row["session_date"]),
            notes=_clean_value(row["notes"]),
            rating=_clean_value(row["rating"]),
            status=str(_clean_value(row["status"])),
            created_at=_clean_value(row["created_at"]),
        )
        for _, row in df.iterrows()
    ]


@router.post("/", response_model=ObservationLogItem)
async def create_log(
    log: ObservationLogCreate,
    db: duckdb.DuckDBPyConnection = Depends(get_duck_db),
) -> ObservationLogItem:
    """Creates a new observation log entry."""
    session_date = log.session_date or date.today()

    # We let DuckDB handle the ID and created_at
    sql = """
        INSERT INTO observation_log (target_id, session_date, notes, rating, status)
        VALUES (?, ?, ?, ?, ?)
        RETURNING id, target_id, session_date, notes, rating, status, created_at
    """
    try:
        res = db.execute(
            sql, [log.target_id, session_date, log.notes, log.rating, log.status]
        ).df()
        row = res.iloc[0]
        return ObservationLogItem(
            id=row["id"],
            target_id=row["target_id"],
            session_date=row["session_date"],
            notes=row["notes"],
            rating=row["rating"],
            status=row["status"],
            created_at=row["created_at"],
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to create log: {e}")


@router.get("/", response_model=ObservationLogListResponse)
async def list_logs(
    db: duckdb.DuckDBPyConnection = Depends(get_duck_db),
) -> ObservationLogListResponse:
    """Returns all observation logs."""
    df = db.execute("SELECT * FROM observation_log ORDER BY session_date DESC").df()
    return {"logs": _rows_to_log_items(df)}


@router.get("/target/{target_id}", response_model=ObservationLogListResponse)
async def get_logs_for_target(
    target_id: str,
    db: duckdb.DuckDBPyConnection = Depends(get_duck_db),
) -> ObservationLogListResponse:
    """Returns all logs for a specific target."""
    df = db.execute(
        "SELECT * FROM observation_log WHERE target_id = ? ORDER BY session_date DESC",
        [target_id],
    ).df()
    return {"logs": _rows_to_log_items(df)}


@router.delete("/{log_id}", status_code=204)
async def delete_log(
    log_id: int, db: duckdb.DuckDBPyConnection = Depends(get_duck_db)
) -> None:
    """Deletes an observation log entry."""
    db.execute("DELETE FROM observation_log WHERE id = ?", [log_id])
    return None
