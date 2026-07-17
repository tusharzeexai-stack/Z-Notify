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


# CORS configuration — reads ALLOWED_ORIGINS env var (comma-separated) or defaults to localhost + Vercel wildcard
_raw_origins = os.getenv("ALLOWED_ORIGINS", "")
_extra_origins = [o.strip() for o in _raw_origins.split(",") if o.strip()]

_default_origins = [
    "http://localhost:3000",
    "http://127.0.0.1:3000",
    "http://localhost:5173",
    "http://127.0.0.1:5173",
    "http://localhost:5174",
    "http://127.0.0.1:5174",
    "http://localhost:5175",
    "http://127.0.0.1:5175",
    "http://localhost:5182",
    "http://127.0.0.1:5182",
]

# In production allow all origins — the monorepo setup serves frontend + backend on the same
# domain (no cross-origin), but a wildcard ensures any Vercel preview URL also works.
_allow_all = os.getenv("CORS_ALLOW_ALL", "false").lower() == "true"

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"] if _allow_all else (_default_origins + _extra_origins),
    allow_origin_regex=r"https://.*\.vercel\.app" if not _allow_all else None,
    allow_credentials=not _allow_all,  # credentials not compatible with wildcard origin
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
