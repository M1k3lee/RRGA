from __future__ import annotations

from collections.abc import Generator

from sqlalchemy import create_engine
from sqlalchemy.engine.url import make_url
from sqlalchemy.orm import DeclarativeBase, Session, sessionmaker

from app.core.config import get_settings


def _postgres_connect_args(database_url: str) -> dict[str, int]:
    """Libpq connect_timeout so Render logs fail in seconds instead of hanging."""
    try:
        parsed = make_url(database_url)
    except Exception:
        return {}
    if not str(parsed.drivername).startswith("postgresql"):
        return {}
    return {"connect_timeout": 15}


class Base(DeclarativeBase):
    pass


settings = get_settings()

engine = create_engine(
    settings.database_url,
    echo=False,
    pool_pre_ping=True,
    future=True,
    connect_args=_postgres_connect_args(settings.database_url),
)
SessionLocal = sessionmaker(bind=engine, autoflush=False, autocommit=False, future=True)


def get_db() -> Generator[Session, None, None]:
    session = SessionLocal()
    try:
        yield session
    finally:
        session.close()
