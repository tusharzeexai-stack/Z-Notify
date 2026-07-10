import os
from pydantic_settings import BaseSettings
from typing import List

# Check project root .env first, then backend folder .env
root_env = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(os.path.dirname(__file__)))), ".env")
backend_env = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(__file__))), ".env")

for env_path in [root_env, backend_env]:
    if os.path.exists(env_path):
        with open(env_path, "r", encoding="utf-8") as f:
            for line in f:
                line = line.strip()
                if line and not line.startswith("#") and "=" in line:
                    key, val = line.split("=", 1)
                    k = key.strip()
                    v = val.strip().strip('"').strip("'")
                    # Do not overwrite with a placeholder or empty string if already set to a valid value!
                    if k in os.environ and (v == "your_gemini_api_key_here" or not v):
                        continue
                    os.environ[k] = v

class Settings(BaseSettings):
    API_V1_STR: str = "/api"
    PROJECT_NAME: str = "Z-Notify HPNS"
    
    # Security
    SECRET_KEY: str = os.getenv("SECRET_KEY", "SUPER_SECRET_SECURITY_KEY_FOR_JWT_TOKEN_GENERATION_32_CHARS")
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 24 * 7  # 7 days for ease of testing
    
    # DB & Redis
    DATABASE_URL: str = os.getenv("DATABASE_URL", "sqlite:///d:/Z-Notify/backend/znotify.db")
    REDIS_URL: str = os.getenv("REDIS_URL", "redis://redis:6379/0")
    
    # OpenAI
    OPENAI_API_KEY: str = os.getenv("OPENAI_API_KEY", "")
    
    # Gemini API Key
    GEMINI_API_KEY: str = os.getenv("GEMINI_API_KEY", "")
    
    # Default Rule Weights
    DEFAULT_WEIGHT_STATE: int = 30
    DEFAULT_WEIGHT_DISTRICT: int = 20
    DEFAULT_WEIGHT_INCOME: int = 20
    DEFAULT_WEIGHT_AGE: int = 15
    DEFAULT_WEIGHT_OCCUPATION: int = 15

    class Config:
        case_sensitive = True

settings = Settings()
