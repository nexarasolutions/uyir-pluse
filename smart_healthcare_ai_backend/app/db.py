from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from app.config import settings
SessionLocal = None
if settings.database_url.strip():
    db_url = settings.database_url.strip()
    if db_url.startswith("postgresql://"):
        db_url = db_url.replace("postgresql://", "postgresql+psycopg://", 1)
    engine = create_engine(db_url, pool_pre_ping=True)
    SessionLocal = sessionmaker(bind=engine, autoflush=False, autocommit=False)
def require_db():
    if SessionLocal is None:
        from fastapi import HTTPException
        raise HTTPException(status_code=503, detail="Set DATABASE_URL in .env and configure Supabase.")
    return SessionLocal()
