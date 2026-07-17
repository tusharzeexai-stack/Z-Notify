from sqlalchemy import create_engine
from sqlalchemy.orm import declarative_base, sessionmaker
from app.core.config import settings

is_sqlite = settings.DATABASE_URL.startswith("sqlite")
connect_args = {"check_same_thread": False} if is_sqlite else {}

if is_sqlite:
    engine = create_engine(
        settings.DATABASE_URL,
        connect_args=connect_args
    )
else:
    engine = create_engine(
        settings.DATABASE_URL,
        pool_pre_ping=True,
        pool_size=20,
        max_overflow=10
    )
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

def migrate_db_schema():
    from sqlalchemy import inspect, text
    import logging
    logger = logging.getLogger(__name__)

    try:
        logger.info("Ensuring database tables are created...")
        Base.metadata.create_all(bind=engine)
        
        inspector = inspect(engine)
        if "schemes" in inspector.get_table_names():
            existing_cols = {c["name"] for c in inspector.get_columns("schemes")}
            required_cols = [
                ("scheme_name", "TEXT"),
                ("slug", "VARCHAR(255)"),
                ("category_id", "INTEGER"),
                ("benefits", "TEXT"),
                ("eligibility", "TEXT"),
                ("documents", "TEXT"),
                ("application_process", "TEXT"),
                ("official_url", "TEXT"),
                ("application_url", "TEXT"),
                ("ministry", "TEXT"),
                ("department", "TEXT"),
                ("state", "TEXT"),
                ("tags", "TEXT"),
                ("status", "VARCHAR(50) DEFAULT 'active'"),
                ("source_url", "TEXT"),
                ("last_synced", "TIMESTAMP"),
            ]

            with engine.begin() as conn:
                for col_name, col_type in required_cols:
                    if col_name not in existing_cols:
                        logger.info(f"Adding missing column '{col_name}' to 'schemes' table...")
                        conn.execute(text(f"ALTER TABLE schemes ADD COLUMN {col_name} {col_type};"))
        logger.info("Database schema migration completed.")
    except Exception as e:
        logger.error(f"Error during schema migration: {e}")
