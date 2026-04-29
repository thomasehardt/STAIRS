import json
import logging
import os
import shutil
from pathlib import Path

import pandas as pd
import yaml
from src.catalog.catalog_models import ObjectCatalog, TelescopeProfile
from src.planner.planner_models import ObservationLocation

logger = logging.getLogger(__name__)

CONFIG_FILE = Path("config.yaml")
CATALOG_DIR = Path("data/catalogs")
TELESCOPE_PROFILES_DIR = Path("data/telescopes")

CACHE_ROOT = Path(os.getenv("CACHE_DIR", "cache"))
LOCATIONS_OUT = CACHE_ROOT / "user_locations.parquet"
TARGETS_OUT = CACHE_ROOT / "targets"
METADATA_OUT = CACHE_ROOT / "catalog_metadata.parquet"
TELESCOPES_OUT = CACHE_ROOT / "telescope_profiles.parquet"


def _needs_update(source_path: Path, target_path: Path) -> bool:
    """
    Returns True if target_path doesn't exist or is older than source_path.
    If source_path is a directory, checks all files within it.
    """
    if not target_path.exists():
        return True

    target_mtime = target_path.stat().st_mtime

    if source_path.is_dir():
        for file in source_path.glob("*"):
            if file.is_file() and file.stat().st_mtime > target_mtime:
                return True
        return False
    else:
        return source_path.stat().st_mtime > target_mtime


def load_data_to_parquet() -> None:
    """
    convert JSON catalog and telescope profile data to parquet for use by duckdb
    catalog data to be partitioned by catalog_id
    :return:
    """
    # 1. Ingest Catalogs
    if _needs_update(CATALOG_DIR, METADATA_OUT) or not TARGETS_OUT.exists():
        if TARGETS_OUT.exists():
            shutil.rmtree(TARGETS_OUT)
        TARGETS_OUT.mkdir(parents=True, exist_ok=True)

        catalog_paths = list(CATALOG_DIR.glob("*.json"))
        all_targets = []
        catalog_metadata = []
        for path in catalog_paths:
            logger.info(f"ingesting catalog: {path.name}")
            catalog = ObjectCatalog.from_json(path)

            desc = (catalog.metadata or {}).get("description", {})
            catalog_metadata.append(
                {
                    "catalog_id": catalog.catalog_id,
                    "name": catalog.name,
                    "summary": desc.get("summary"),
                    "author": desc.get("author"),
                    "item_count": len(catalog),
                }
            )

            for record in catalog.records:
                data = record.model_dump()
                data["ra_deg"] = data["right_ascension"] * 15.0
                data["dec_deg"] = data["declination"]
                data["catalog_id"] = catalog.catalog_id
                data["identifiers_str"] = ",".join(data["identifiers"])
                all_targets.append(data)

        if all_targets:
            df = pd.DataFrame(all_targets)
            df.to_parquet(TARGETS_OUT, partition_cols=["catalog_id"], engine="pyarrow")
        else:
            empty_df = pd.DataFrame(
                columns=[
                    "identifier",
                    "common_name",
                    "ra_deg",
                    "dec_deg",
                    "target_type",
                    "constellation",
                    "magnitude",
                    "catalog_id",
                    "angular_size",
                    "identifiers",
                    "identifiers_str",
                ]
            )
            empty_df.to_parquet(TARGETS_OUT / "empty_schema.parquet", engine="pyarrow")
            logger.warning("no targets found in any catalogs")

        if catalog_metadata:
            pd.DataFrame(catalog_metadata).to_parquet(METADATA_OUT, engine="pyarrow")
        else:
            pd.DataFrame(
                columns=["catalog_id", "name", "summary", "author", "item_count"]
            ).to_parquet(METADATA_OUT, engine="pyarrow")
            logger.warning("no catalog metadata found")
    else:
        logger.debug("catalogs are already up to date")

    # 2. Ingest Telescope Profiles
    if _needs_update(TELESCOPE_PROFILES_DIR, TELESCOPES_OUT):
        logger.info("ingesting telescope profiles")
        telescope_profiles = []
        for path in TELESCOPE_PROFILES_DIR.glob("*.json"):
            with open(path) as f:
                profile_data = json.load(f)
                profile = TelescopeProfile(**profile_data)
                telescope_profiles.append(profile.model_dump())

        if telescope_profiles:
            pd.DataFrame(telescope_profiles).to_parquet(
                TELESCOPES_OUT, engine="pyarrow"
            )
        else:
            pd.DataFrame(
                columns=[
                    "name",
                    "aperture_mm",
                    "focal_length_mm",
                    "sensor_x",
                    "sensor_y",
                    "pixel_pitch_um",
                ]
            ).to_parquet(TELESCOPES_OUT, engine="pyarrow")
            logger.warning("no telescope profiles found")
    else:
        logger.debug("telescope profiles are already up to date")

    # 3. Ingest User Locations from Config
    if _needs_update(CONFIG_FILE, LOCATIONS_OUT):
        validated_locations = []
        if CONFIG_FILE.exists():
            logger.info("loading user locations from config file")
            with open(CONFIG_FILE) as f:
                config = yaml.safe_load(f) or {}

            raw_locations = []
            have_default = False
            for location in config.get("locations", []):
                is_current_default = location.get("default", False)
                is_default = False
                if not have_default and is_current_default:
                    is_default = True
                    have_default = True

                location_data = location.copy()
                location_data.pop("default", None)
                raw_locations.append({**location_data, "is_default": is_default})

            if raw_locations:
                if not have_default:
                    raw_locations[0]["is_default"] = True
                    if len(raw_locations) > 1:
                        logger.warning(
                            "no default location specified, using first location "
                            f"in config file ({raw_locations[0]['name']})"
                        )

                for location in raw_locations:
                    try:
                        is_default_location = location.pop("is_default", False)
                        location_obj = ObservationLocation(**location)
                        record = location_obj.model_dump()
                        record["is_default"] = is_default_location
                        validated_locations.append(record)
                    except Exception as e:
                        logger.error(f"error loading location from config file: {e}")

        if validated_locations:
            pd.DataFrame(validated_locations).to_parquet(
                LOCATIONS_OUT, engine="pyarrow"
            )
        else:
            # write an empty file
            pd.DataFrame(
                columns=[
                    "name",
                    "latitude",
                    "longitude",
                    "elevation_m",
                    "bortle_scale",
                    "timezone",
                    "horizon_mask",
                    "is_default",
                ]
            ).to_parquet(LOCATIONS_OUT, engine="pyarrow")
            logger.warning("no user locations found")
    else:
        logger.debug("user locations are already up to date")

    logger.info("startup parquet ingestion complete")
