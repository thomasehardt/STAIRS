import logging
import os
from logging.handlers import RotatingFileHandler
from pathlib import Path
from src.utils.config_manager import ConfigManager

def setup_logging():
    # Load settings from config
    raw_config = ConfigManager.get_raw_config()
    logging_settings = raw_config.get("logging", {})
    
    log_level_str = logging_settings.get("level", "INFO").upper()
    max_size_mb = logging_settings.get("max_size_mb", 10)
    backup_count = logging_settings.get("backup_count", 5)
    
    # Map string level to logging constant
    log_level = getattr(logging, log_level_str, logging.INFO)
    
    log_dir = os.getenv("LOG_DIR", "logs")
    log_path = Path(log_dir)
    log_path.mkdir(parents=True, exist_ok=True)
    
    log_file = log_path / "stairs.log"
    
    # Configure the root logger
    root_logger = logging.getLogger()
    
    # Prevent adding multiple handlers if setup is called multiple times
    if not any(isinstance(handler, RotatingFileHandler) for handler in root_logger.handlers):
        # File handler
        file_handler = RotatingFileHandler(
            log_file,
            maxBytes=max_size_mb * 1024 * 1024,
            backupCount=backup_count
        )
        formatter = logging.Formatter(
            '%(asctime)s - %(name)s - %(levelname)s - %(message)s'
        )
        file_handler.setFormatter(formatter)
        root_logger.addHandler(file_handler)
        
        # Ensure root logger level is set
        root_logger.setLevel(log_level)
    else:
        # If handler exists, just update the level
        root_logger.setLevel(log_level)
