from __future__ import annotations

import asyncio
import threading
from contextlib import asynccontextmanager
from datetime import datetime, timezone, timedelta
import logging

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.routes.public import router
from app.core.config import get_settings
from app.core.logging import configure_logging
from app.db import models
from app.db.bootstrap import ensure_bootstrap_data
from app.db.session import Base, SessionLocal, engine
from app.ingest.sources.coingecko import ingest_coingecko_catalog
from app.ingest.sources.esma import ingest_esma
from app.ingest.sources.ofac import ingest_ofac

configure_logging()
logger = logging.getLogger(__name__)

@asynccontextmanager
async def lifespan(app: FastAPI):
    Base.metadata.create_all(bind=engine)
    session = SessionLocal()
    settings = get_settings()
    try:
        ensure_bootstrap_data(session, settings)
        logger.info("Database bootstrapped successfully")
        
        # Emergency migration check for 'content' column
        from sqlalchemy import text
        try:
            session.execute(text("SELECT content FROM source_artifacts LIMIT 1"))
        except Exception:
            logger.info("Emergency migration: Adding 'content' column to source_artifacts")
            session.rollback()
            try:
                session.execute(text("ALTER TABLE source_artifacts ADD COLUMN content TEXT"))
                session.commit()
            except Exception as migrate_err:
                logger.error(f"Migration failed: {migrate_err}")
                session.rollback()
    except Exception as e:
        logger.error(f"Failed to bootstrap database: {e}")
    finally:
        session.close()

    if settings.env == "production":
        def _startup_sync_thread():
            async def _sync_loop():
                await asyncio.sleep(20) # Wait for server stability
                while True:
                    db = SessionLocal()
                    try:
                        from app.db.models import Source, SourceArtifact, IngestionRun
                        from sqlalchemy import func, select, desc
                        
                        enabled_sources = db.scalars(select(Source).where(Source.enabled == True)).all()
                        needs_update = False
                        
                        for src in enabled_sources:
                            count = db.scalar(select(func.count(SourceArtifact.id)).where(SourceArtifact.source_id == src.id)) or 0
                            if count == 0:
                                needs_update = True
                                break
                        
                        if not needs_update:
                            last_run = db.scalars(select(IngestionRun).where(IngestionRun.status == "completed").order_by(desc(IngestionRun.finished_at)).limit(1)).first()
                            if not last_run or not last_run.finished_at or (datetime.now(timezone.utc) - last_run.finished_at.replace(tzinfo=timezone.utc)) > timedelta(hours=12):
                                needs_update = True

                        if needs_update:
                            logger.info("Background sync: Starting...")
                            try:
                                await ingest_coingecko_catalog(db, settings, limit=5000)
                                db.commit()
                            except Exception as e:
                                logger.error(f"Sync failed: CoinGecko: {e}")
                                db.rollback()
                            
                            try:
                                await ingest_ofac(db, settings, "ofac_sdn")
                                db.commit()
                            except Exception as e:
                                logger.error(f"Sync failed: OFAC SDN: {e}")
                                db.rollback()

                            try:
                                await ingest_esma(db, settings)
                                db.commit()
                            except Exception as e:
                                logger.error(f"Sync failed: ESMA: {e}")
                                db.rollback()
                        else:
                            logger.info("Background sync: Already up to date.")
                    except Exception as e:
                        logger.error(f"Critical error in sync thread: {e}")
                    finally:
                        db.close()
                    await asyncio.sleep(60 * 60 * 12)

            asyncio.run(_sync_loop())

        t = threading.Thread(target=_startup_sync_thread, daemon=True)
        t.start()
        logger.info("Background auto-sync thread started")
    
    yield

app = FastAPI(
    title="VOTO API",
    version="0.1.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], # Temporarily permissive to fix CORS blockage
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/health/ping")
def ping():
    return {"status": "pong", "timestamp": datetime.now(timezone.utc)}

app.include_router(router)
