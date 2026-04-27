import asyncio
import logging
from collections.abc import AsyncGenerator
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.responses import RedirectResponse
from src.api.routers import (
    catalogs,
    locations,
    logs,
    planner,
    profiles,
    settings,
    system,
    targets,
    weather,
)
from src.db.parquet_loader import load_data_to_parquet
from src.utils.ephemeris_manager import EphemerisManager
from src.utils.logging_config import setup_logging

logger = logging.getLogger("uvicorn.error")


@asynccontextmanager
async def lifespan(_app: FastAPI) -> AsyncGenerator:
    """Lifespan event handler to initialize the data lakehouse on startup."""
    setup_logging()
    logger.info("Lifespan startup: loading data to parquet")
    load_data_to_parquet()

    # Warm up the ephemeris cache in the background
    logger.info("Lifespan startup: starting ephemeris cache warming")
    ephem_manager = EphemerisManager()
    asyncio.create_task(ephem_manager.warm_up_cache())

    yield  # No cleanup needed on shutdown


app = FastAPI(
    title="STAIRS API",
    description="REST API for deep-sky photography planning and scheduling.",
    version="0.1.0",
    lifespan=lifespan,
)

app.include_router(planner.router, prefix="/plan", tags=["planner"])
app.include_router(catalogs.router, prefix="/catalogs", tags=["catalogs"])
app.include_router(targets.router, prefix="/targets", tags=["targets"])
app.include_router(profiles.router, prefix="/profiles", tags=["profiles"])
app.include_router(locations.router, prefix="/locations", tags=["locations"])
app.include_router(logs.router, prefix="/logs", tags=["logs"])
app.include_router(settings.router, prefix="/settings", tags=["settings"])
app.include_router(weather.router, prefix="/weather", tags=["weather"])
app.include_router(system.router, prefix="/system", tags=["system"])


@app.get("/", include_in_schema=False)
async def root() -> RedirectResponse:
    return RedirectResponse(url="/docs")
