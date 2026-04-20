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
        from datetime import datetime, timezone, timedelta
        from sqlalchemy import func, select, desc
        from app.db.models import SourceArtifact, IngestionRun
        from app.db.session import SessionLocal
        
        from app.ingest.sources.coingecko import ingest_coingecko_catalog
        from app.ingest.sources.esma import ingest_esma
        from app.ingest.sources.ofac import ingest_ofac

        logger = logging.getLogger(__name__)

        async def _sync_loop():
            logger.info("Background sync loop: starting...")
            # Short wait to let the application bind to the port and health checks to pass
            await asyncio.sleep(10)
            
            while True:
                db = SessionLocal()
                try:
                    needs_update = False
                    
                    # Check if any enabled source has 0 artifacts
                    from app.db.models import Source
                    enabled_sources = db.scalars(select(Source).where(Source.enabled == True)).all()
                    for src in enabled_sources:
                        src_artifact_count = db.scalar(select(func.count(SourceArtifact.id)).where(SourceArtifact.source_id == src.id)) or 0
                        if src_artifact_count == 0:
                            logger.info(f"Background sync loop: Source {src.slug} has no data, update required.")
                            needs_update = True
                            break
                    
                    if not needs_update:
                        # Check the last successful ingestion time globally
                        last_run = db.scalars(
                            select(IngestionRun)
                            .where(IngestionRun.status == "completed") # Note: was "success" before, but we use "completed" in ingestions
                            .order_by(desc(IngestionRun.finished_at))
                            .limit(1)
                        ).first()
                        
                        if not last_run or not getattr(last_run, "finished_at", None):
                            logger.info("Background sync loop: Missing complete run history, update required.")
                            needs_update = True
                        else:
                            finished_at = last_run.finished_at
                            if finished_at.tzinfo is None:
                                finished_at = finished_at.replace(tzinfo=timezone.utc)
                                
                            age = datetime.now(timezone.utc) - finished_at
                            if age > timedelta(hours=24):
                                logger.info(f"Background sync loop: Data is {age.total_seconds()/3600:.1f} hours old, update required.")
                                needs_update = True

                    if needs_update:
                        try:
                            logger.info("Background sync loop: starting CoinGecko ingestion...")
                            await ingest_coingecko_catalog(db, settings, limit=5000)
                            db.commit()
                        except Exception as e:
                            logger.error(f"CoinGecko ingestion failed: {e}")
                            db.rollback()

                        try:
                            logger.info("Background sync loop: starting OFAC SDN ingestion...")
                            await ingest_ofac(db, settings, "ofac_sdn")
                            db.commit()
                        except Exception as e:
                            logger.error(f"OFAC SDN ingestion failed: {e}")
                            db.rollback()

                        try:
                            logger.info("Background sync loop: starting OFAC Consolidated ingestion...")
                            await ingest_ofac(db, settings, "ofac_consolidated")
                            db.commit()
                        except Exception as e:
                            logger.error(f"OFAC Consolidated ingestion failed: {e}")
                            db.rollback()

                        try:
                            logger.info("Background sync loop: starting ESMA ingestion...")
                            await ingest_esma(db, settings)
                            db.commit()
                        except Exception as e:
                            logger.error(f"ESMA ingestion failed: {e}")
                            db.rollback()
                            
                        logger.info("Background sync loop: All data ingestions completed.")
                    else:
                        logger.info("Background sync loop: Data is up to date, skipping.")
                        
                except Exception as e:
                    logger.error(f"Background sync loop: unexpected error: {e}")
                finally:
                    db.close()
                    
                # Wait 12 hours before checking again (in case the server stays awake)
                await asyncio.sleep(43200)

        asyncio.run(_sync_loop())

    if settings.env == "production":
        t = threading.Thread(target=_startup_sync_thread, daemon=True)
        t.start()
        logger.info("Background auto-sync thread started")
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

@app.get("/health/ping")
def ping():
    return {"status": "pong", "timestamp": datetime.now(timezone.utc)}

app.include_router(router)
# Instrumentator().instrument(app).expose(app, endpoint="/metrics")
