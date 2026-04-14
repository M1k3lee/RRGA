from __future__ import annotations

import ipaddress
import logging
import socket
from collections.abc import Generator

from sqlalchemy import create_engine
from sqlalchemy.engine.url import make_url
from sqlalchemy.orm import DeclarativeBase, Session, sessionmaker

from app.core.config import get_settings

logger = logging.getLogger(__name__)


def _connect_args_for_postgres_url(database_url: str) -> dict[str, str]:
    """Use IPv4 for Supabase direct ``db.*`` hosts when an A record exists.

    Those hostnames often resolve to IPv6 first; Render and similar environments may not
    route IPv6, which yields "Network is unreachable". ``hostaddr`` keeps the hostname for
    TLS while opening the TCP socket to an IPv4 address. If there is no A record, use the
    Session pooler connection string from the Supabase dashboard instead of direct.
    """
    try:
        parsed = make_url(database_url)
    except Exception:
        return {}
    if not str(parsed.drivername).startswith("postgresql"):
        return {}
    host = (parsed.host or "").strip()
    if not (host.startswith("db.") and host.endswith(".supabase.co")):
        return {}
    try:
        ipaddress.ip_address(host)
    except ValueError:
        pass
    else:
        return {}
    port = int(parsed.port or 5432)
    try:
        infos = socket.getaddrinfo(host, port, socket.AF_INET, socket.SOCK_STREAM)
    except OSError as exc:
        logger.warning(
            "Could not resolve IPv4 for %s (try Supabase Session pooler URL on Render): %s",
            host,
            exc,
        )
        return {}
    if not infos:
        logger.warning(
            "No IPv4 address for %s. In Supabase: Settings → Database → use the "
            "**Session pooler** URI (not direct) as DATABASE_URL on Render.",
            host,
        )
        return {}
    return {"hostaddr": infos[0][4][0]}


class Base(DeclarativeBase):
    pass


settings = get_settings()

_connect_args = _connect_args_for_postgres_url(settings.database_url)

engine = create_engine(
    settings.database_url,
    echo=False,
    pool_pre_ping=True,
    future=True,
    connect_args=_connect_args,
)
SessionLocal = sessionmaker(bind=engine, autoflush=False, autocommit=False, future=True)


def get_db() -> Generator[Session, None, None]:
    session = SessionLocal()
    try:
        yield session
    finally:
        session.close()
