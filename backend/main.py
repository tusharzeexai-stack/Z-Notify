import logging
import os
import sys
import asyncio

if sys.platform == "win32":
    try:
        asyncio.set_event_loop_policy(asyncio.WindowsProactorEventLoopPolicy())
    except Exception:
        pass

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.core.config import settings
from app.core.database import Base, engine
from app.api import auth, users, notifications, review, delivery, analytics, audit, rules
from app.modules.myscheme_sync.api import sync_router
from app.modules.myscheme_sync.scheduler.sync_scheduler import sync_scheduler
from app.modules.myscheme_sync.repositories.scheme_repository import scheme_repository
from app.core.database import Base, engine, SessionLocal, migrate_db_schema

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Initialize DB tables & schema migration automatically on boot
try:
    logger.info("Initializing database tables and schema migrations...")
    migrate_db_schema()
    logger.info("Database tables & migrations successfully applied.")
    # Seed baseline scheme categories if missing
    db = SessionLocal()
    try:
        scheme_repository.ensure_categories_exist(db)
    finally:
        db.close()
except Exception as e:
    logger.error(f"Error initializing database tables: {e}")

app = FastAPI(
    title=settings.PROJECT_NAME,
    openapi_url=f"{settings.API_V1_STR}/openapi.json",
    docs_url="/docs"
)

@app.on_event("startup")
def startup_event():
    sync_scheduler.start()

@app.on_event("shutdown")
def shutdown_event():
    sync_scheduler.shutdown()


# CORS configuration — allow all origins (local + Vercel deployment)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routers
app.include_router(sync_router.router, prefix=settings.API_V1_STR)
app.include_router(auth.router, prefix=settings.API_V1_STR)
app.include_router(users.router, prefix=settings.API_V1_STR)
app.include_router(notifications.router, prefix=settings.API_V1_STR)
app.include_router(review.router, prefix=settings.API_V1_STR)
app.include_router(delivery.router, prefix=settings.API_V1_STR)
app.include_router(analytics.router, prefix=settings.API_V1_STR)
app.include_router(audit.router, prefix=settings.API_V1_STR)
app.include_router(rules.router, prefix=settings.API_V1_STR)

@app.get("/")
def read_root():
    return {"message": "Welcome to Z-Notify HPNS REST API. Visit /docs for documentation."}
