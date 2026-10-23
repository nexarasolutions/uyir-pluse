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
    # Supabase Configuration
    supabase_url: str = "https://epuewqdawywhxzuqaukj.supabase.co"
    supabase_anon_key: str = ""
    supabase_service_role_key: str = ""
    # Supabase Auth / JWT Configuration
    jwt_secret: str = "uyir-plus-secret-key-32-bytes-secure-auth-2026"
    jwt_algorithm: str = "HS256"
    jwt_access_token_expire_minutes: int = 10080  # 7 days
    # CORS Configuration
    cors_origins: list[str] = [
        "http://localhost:3000",
        "http://127.0.0.1:3000",
        "http://localhost:3001",
        "http://127.0.0.1:3001",
    ]
    cors_origin_regex: str = r"^https?://(localhost|127\.0\.0\.1|.*\.pinggy\.net|.*\.loca\.lt|.*\.onrender\.com|.*\.vercel\.app)(:\d+)?$"
    model_config = SettingsConfigDict(env_file=ENV_LOCATIONS, extra="ignore", case_sensitive=False)

settings = Settings()
