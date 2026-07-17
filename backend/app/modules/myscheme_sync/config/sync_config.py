import os
from pydantic_settings import BaseSettings
from typing import Dict, Any

MODULE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DEFAULT_LOG_PATH = os.path.join(MODULE_DIR, "logs")
DEFAULT_SCREENSHOT_PATH = os.path.join(MODULE_DIR, "screenshots")

# Ensure default directories exist
os.makedirs(DEFAULT_LOG_PATH, exist_ok=True)
os.makedirs(DEFAULT_SCREENSHOT_PATH, exist_ok=True)

class SyncSettings(BaseSettings):
    SYNC_ENABLED: bool = os.getenv("SYNC_ENABLED", "true").lower() == "true"
    SYNC_INTERVAL_HOURS: int = int(os.getenv("SYNC_INTERVAL_HOURS", "24"))
    PLAYWRIGHT_HEADLESS: bool = os.getenv("PLAYWRIGHT_HEADLESS", "true").lower() == "true"
    PLAYWRIGHT_TIMEOUT: int = int(os.getenv("PLAYWRIGHT_TIMEOUT", "30000"))
    LOG_LEVEL: str = os.getenv("LOG_LEVEL", "INFO")
    LOG_PATH: str = os.getenv("LOG_PATH", DEFAULT_LOG_PATH)
    SCREENSHOT_PATH: str = os.getenv("SCREENSHOT_PATH", DEFAULT_SCREENSHOT_PATH)
    REQUEST_THROTTLE_SECONDS: float = float(os.getenv("REQUEST_THROTTLE_SECONDS", "1.5"))

    CATEGORIES: Dict[str, Dict[str, str]] = {
        "welfare": {
            "name": "Agriculture, Rural & Environment",
            "slug": "agriculture-rural-environment",
            "source_url": "https://www.myscheme.gov.in/search/category/Agriculture,Rural%20&%20Environment",
            "icon": "agriculture"
        },
        "health": {
            "name": "Health & Wellness",
            "slug": "health-wellness",
            "source_url": "https://www.myscheme.gov.in/search/category/Health%20&%20Wellness",
            "icon": "health_and_safety"
        },
        "jobs": {
            "name": "Skills & Employment",
            "slug": "skills-employment",
            "source_url": "https://www.myscheme.gov.in/search/category/Skills%20&%20Employment",
            "icon": "work"
        },
        "utility": {
            "name": "Social welfare & Empowerment",
            "slug": "social-welfare-empowerment",
            "source_url": "https://www.myscheme.gov.in/search/category/Social%20welfare%20&%20Empowerment",
            "icon": "diversity_3"
        }
    }

    class Config:
        extra = "allow"

sync_settings = SyncSettings()
