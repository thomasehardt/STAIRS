from datetime import date

import duckdb
from fastapi import APIRouter, Depends, HTTPException
from src.api.schemas import (
    ObservationLogCreate,
    ObservationLogItem,
    ObservationLogListResponse,
)
from src.db.duck_session import get_duck_db

router = APIRouter()


@router.post("/", response_model=ObservationLogItem)
async def create_log(
    log: ObservationLogCreate,
    db: duckdb.DuckDBPyConnection = Depends(get_duck_db),
) -> ObservationLogItem:
    """Creates a new observation log entry."""
    session_date = log.session_date or date.today()

    # We let DuckDB handle the ID and created_at
    sql = """
        INSERT INTO observation_logs (target_id, session_date, notes, rating, status)
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
    df = db.execute("SELECT * FROM observation_logs ORDER BY session_date DESC").df()

    return {
        "logs": [
            ObservationLogItem(
                id=row["id"],
                target_id=row["target_id"],
                session_date=row["session_date"],
                notes=row["notes"],
                rating=row["rating"],
                status=row["status"],
                created_at=row["created_at"],
            )
            for _, row in df.iterrows()
        ]
    }


@router.get("/target/{target_id}", response_model=ObservationLogListResponse)
async def get_logs_for_target(
    target_id: str,
    db: duckdb.DuckDBPyConnection = Depends(get_duck_db),
) -> ObservationLogListResponse:
    """Returns all logs for a specific target."""
    df = db.execute(
        "SELECT * FROM observation_logs WHERE target_id = ? ORDER BY session_date DESC",
        [target_id],
    ).df()

    return {
        "logs": [
            ObservationLogItem(
                id=row["id"],
                target_id=row["target_id"],
                session_date=row["session_date"],
                notes=row["notes"],
                rating=row["rating"],
                status=row["status"],
                created_at=row["created_at"],
            )
            for _, row in df.iterrows()
        ]
    }
