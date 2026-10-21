from pydantic_settings import BaseSettings, SettingsConfigDict
class Settings(BaseSettings):
    app_name: str = "Smart Healthcare Monitoring API"
    environment: str = "development"
    database_url: str = ""
    device_api_key: str = "change-me"
    dashboard_api_key: str = "change-me-too"
    model_path: str = "models/isolation_forest.joblib"
    model_config = SettingsConfigDict(env_file=".env", extra="ignore", case_sensitive=False)
settings = Settings()
