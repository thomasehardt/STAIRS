from fastapi import APIRouter, BackgroundTasks
from src.utils.ephemeris_manager import EphemerisManager

router = APIRouter()


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
