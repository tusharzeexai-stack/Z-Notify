import os
import logging
from logging.handlers import RotatingFileHandler
from app.modules.myscheme_sync.config.sync_config import sync_settings

def get_sync_logger(name: str = "myscheme_sync") -> logging.Logger:
    logger = logging.getLogger(name)
    logger.setLevel(getattr(logging, sync_settings.LOG_LEVEL.upper(), logging.INFO))
    
    if not logger.handlers:
        os.makedirs(sync_settings.LOG_PATH, exist_ok=True)
        log_file = os.path.join(sync_settings.LOG_PATH, "sync.log")
        
        # Rotating File Handler (max 5 MB per file, keep 5 backups)
        file_handler = RotatingFileHandler(
            log_file, maxBytes=5 * 1024 * 1024, backupCount=5, encoding="utf-8"
        )
        formatter = logging.Formatter(
            '%(asctime)s - [%(levelname)s] - [%(name)s] - %(message)s'
        )
        file_handler.setFormatter(formatter)
        logger.addHandler(file_handler)
        
        # Console Handler
        console_handler = logging.StreamHandler()
        console_handler.setFormatter(formatter)
        logger.addHandler(console_handler)

    return logger

sync_logger = get_sync_logger()
