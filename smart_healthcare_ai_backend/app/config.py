from pathlib import Path
from pydantic_settings import BaseSettings, SettingsConfigDict

BACKEND_DIR = Path(__file__).resolve().parent.parent
ROOT_DIR = BACKEND_DIR.parent
ENV_LOCATIONS = [
    str(BACKEND_DIR / ".env"),
    str(ROOT_DIR / ".env"),
    ".env",
]

class Settings(BaseSettings):
    app_name: str = "Uyir+ Smart Healthcare AI Platform"
    environment: str = "development"
    database_url: str = ""
    device_api_key: str = "change-me"
    dashboard_api_key: str = "change-me-too"
    model_path: str = "models/isolation_forest_model.pkl"
    model_config = SettingsConfigDict(env_file=ENV_LOCATIONS, extra="ignore", case_sensitive=False)

settings = Settings()
