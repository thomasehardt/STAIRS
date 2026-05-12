import json
import logging
import os
from pathlib import Path

from src.catalog.catalog_models import TelescopeProfile

logger = logging.getLogger(__name__)
DATA_DIR = Path(os.getenv("DATA_DIR", "data"))
TELESCOPE_PROFILES_PATH = DATA_DIR / "telescope_profiles.json"


class TelescopeService:
    """
    manages telescope hardware logic and pre-defined profiles
    - loads "factory defaults" from JSON and handles optical calculations
    """

    @classmethod
    def get_profiles(cls) -> list[TelescopeProfile]:
        """
        returns all pre-defined hardware profiles
        :return:
        """
        if not TELESCOPE_PROFILES_PATH.exists():
            logger.warning(f"telescope profiles not found at {TELESCOPE_PROFILES_PATH}")
            return []

        with open(TELESCOPE_PROFILES_PATH) as f:
            raw_data = json.load(f)

        profiles = []
        for profile in raw_data:
            profiles.append(
                TelescopeProfile(
                    name=profile["name"],
                    aperture_mm=profile["aperture"],
                    focal_length_mm=profile["focal_length_mm"],
                    sensor_x=profile["sensor_x"],
                    sensor_y=profile["sensor_y"],
                    pixel_pitch_um=profile["pixel_pitch_um"],
                )
            )
        return profiles
