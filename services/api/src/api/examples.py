"""
Swagger examples that depend on config.yaml. stairs_core's schemas cannot read
config, so the API attaches these to the models at import time.
"""

from datetime import datetime

from src.utils.config_manager import ConfigManager
from stairs_core.schemas import PlanRequest


def get_plan_example() -> dict:
    """
    returns a dynamic example of a plan for Swagger
    :return:
    """
    config = ConfigManager.get_raw_config()
    default_loc = next(
        (loc for loc in config.get("locations", []) if loc.get("default")), {}
    )
    default_telescope = config.get("planning", {}).get(
        "default_telescope", "Seestar S50"
    )

    return {
        "latitude": default_loc.get("latitude"),
        "longitude": default_loc.get("longitude"),
        "elevation_m": default_loc.get("elevation_m", 0.0),
        "telescope_profile_name": default_telescope,
        "start_time": datetime.now().isoformat(),
        "min_alt": 30.0,
        "location_name": default_loc.get("name"),
        "bortle_scale": default_loc.get("bortle_scale"),
    }


def install_schema_examples() -> None:
    PlanRequest.model_config["json_schema_extra"] = {"example": get_plan_example()}
