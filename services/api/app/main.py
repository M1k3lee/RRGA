from __future__ import annotations

import asyncio
import threading

from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from prometheus_fastapi_instrumentator import Instrumentator

from app.api.routes.public import router
from app.core.config import get_settings
from app.core.logging import configure_logging
from app.db import models  # noqa: F401
from app.db.bootstrap import ensure_bootstrap_data
from app.db.session import Base, SessionLocal, engine


import logging

logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    configure_logging()
    Base.metadata.create_all(bind=engine)
    session = SessionLocal()
    settings = get_settings()
    try:
        ensure_bootstrap_data(session, settings)
        logger.info("Database bootstrapped successfully")
    except Exception as e:
        logger.error(f"Failed to bootstrap database: {e}")
    finally:
        session.close()

    # On Render/Production, if the database has no artifacts, trigger a background sync.
    # We run this in a daemon thread so it doesn't block the event loop.
    def _startup_sync_thread():
        import asyncio
        import logging
        from app.ingest.sources.coingecko import ingest_coingecko_catalog
        from app.ingest.sources.esma import ingest_esma
        from app.ingest.sources.ofac import ingest_ofac

        logger = logging.getLogger(__name__)

        async def _sync():
            from sqlalchemy import func, select
            from app.db.models import SourceArtifact
            from app.db.session import SessionLocal

            logger.info("Background sync: starting...")
            # Wait to ensure Render's initial health checks pass
            await asyncio.sleep(60)
            db = SessionLocal()
            try:
                count = db.scalar(select(func.count(SourceArtifact.id))) or 0
                logger.info(f"Background sync: found {count} existing artifacts")
                if count == 0:
                    logger.info("Background sync: starting ESMA ingestion...")
                    try:
                        await ingest_esma(db, settings)
                        logger.info("Background sync: ESMA ingestion completed")
                    except Exception as e:
                        logger.error(f"Background sync: ESMA ingestion failed: {e}")

                    logger.info("Background sync: starting OFAC SDN ingestion...")
                    try:
                        await ingest_ofac(db, settings, "ofac_sdn")
                        logger.info("Background sync: OFAC SDN ingestion completed")
                    except Exception as e:
                        logger.error(f"Background sync: OFAC SDN ingestion failed: {e}")

                    logger.info("Background sync: starting CoinGecko ingestion...")
                    try:
                        await ingest_coingecko_catalog(db, settings, limit=50)
                        logger.info("Background sync: CoinGecko ingestion completed")
                    except Exception as e:
                        logger.error(f"Background sync: CoinGecko ingestion failed: {e}")
                else:
                    logger.info(f"Background sync: skipping, already have {count} artifacts")
            except Exception as e:
                logger.error(f"Background sync: unexpected error: {e}")
            finally:
                db.close()
                logger.info("Background sync: done")

        asyncio.run(_sync())

    if settings.env == "production":
        t = threading.Thread(target=_startup_sync_thread, daemon=True)
        t.start()
        logger.info("Background sync thread started")
    else:
        logger.info("Not in production mode, skipping background sync")

    yield


settings = get_settings()
app = FastAPI(title=settings.app_name, version="0.1.0", lifespan=lifespan)
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(router)
# Instrumentator().instrument(app).expose(app, endpoint="/metrics")
