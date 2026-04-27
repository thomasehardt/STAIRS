from fastapi import APIRouter, HTTPException
from src.api.schemas import AppConfig, SettingsUpdate
from src.db.parquet_loader import load_data_to_parquet
from src.utils.config_manager import ConfigManager

router = APIRouter()


@router.get("/", response_model=AppConfig)
async def get_settings() -> AppConfig:
    """
    :return: the current application configuration
    """
    raw_config = ConfigManager.get_raw_config()
    try:
        return AppConfig(**raw_config)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to parse config: {e}")


@router.patch("/", response_model=AppConfig)
async def update_settings(update: SettingsUpdate) -> AppConfig:
    """
    updates the application configuration, triggering a lakehouse refresh if locations are modified
    :param update: the fields to update
    :return: the updated application configuration
    """
    try:
        update_data = update.model_dump(exclude_unset=True)
        update_raw = ConfigManager.update_config(update_data)

        if "locations" in update_data:
            load_data_to_parquet()

        return AppConfig(**update_raw)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to update config: {e}")
