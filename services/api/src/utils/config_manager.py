import logging
from pathlib import Path
from typing import Any

import yaml

logger = logging.getLogger(__name__)
CONFIG_PATH = Path("config.yaml")


class ConfigManager:
    """
    manages reading and writing of config files
    """

    @staticmethod
    def get_raw_config() -> dict[str, Any]:
        """
        reads the raw configuration from the YAML file
        :return:
        """

        if not CONFIG_PATH.exists():
            logger.warning(f"config file not found at {CONFIG_PATH}")
            return {}

        try:
            with open(CONFIG_PATH) as f:
                config = yaml.safe_load(f)
                if config is None:
                    logger.warning(f"config file at {CONFIG_PATH} is empty")
                    return {}

                return config
        except Exception as e:
            logger.error(f"error reading config file at {CONFIG_PATH}: {e}")
            return {}

    @staticmethod
    def save_config(config_dict: dict[str, Any]) -> None:
        """
        writes the configuration to the YAML file
        NOTE: this will currently remove any comments, etc.
        :param config_dict:
        :return:
        """
        try:

            def clean_none(d):
                if not isinstance(d, dict):
                    return d
                return {k: clean_none(v) for k, v in d.items() if v is not None}

            cleaned = clean_none(config_dict)
            with open(CONFIG_PATH, "w") as f:
                yaml.safe_dump(cleaned, f, default_flow_style=False, sort_keys=False)
        except Exception as e:
            logger.error(f"error writing config file at {CONFIG_PATH}: {e}")
            raise

    @staticmethod
    def update_config(updates: dict[str, Any]) -> dict[str, Any]:
        """
        performs a "deep merge" of the updates into the existing config
        :param updates:
        :return:
        """
        current_config = ConfigManager.get_raw_config()

        # when adding new sections to the config, this list needs to be updated
        ALLOWED_SECTIONS = ["planning", "locations", "integrations", "logging"]

        for key, value in updates.items():
            if key not in ALLOWED_SECTIONS or value is None:
                logger.warning(f"invalid config key '{key}' provided, ignoring")
                continue

            if key in ["planning", "integrations", "logging"]:
                # planning, integrations and logging are special cases,
                # where we want to merge the entire section
                if isinstance(value, dict):
                    # ensure the section already exists
                    if key not in current_config or not isinstance(
                        current_config[key], dict
                    ):
                        logger.info(f"creating new section '{key}' in config")
                        current_config[key] = {}

                    current_config[key].update(value)
            elif key == "locations":
                # locations are special cases, where we want to merge the entire list
                if isinstance(value, list):
                    current_config[key] = value

        ConfigManager.save_config(current_config)
        return current_config
