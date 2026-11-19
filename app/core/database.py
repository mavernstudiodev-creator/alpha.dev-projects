"""
Database Session and Engine Initialization
Compatible with SQLite initially and PostgreSQL for production.
Includes non-destructive schema migration helper.
"""

import logging
from sqlalchemy import create_engine, inspect, text
from sqlalchemy.orm import declarative_base, sessionmaker
from app.core.config import settings

logger = logging.getLogger(__name__)

# connect_args={"check_same_thread": False} is required for SQLite
connect_args = {"check_same_thread": False} if "sqlite" in settings.DATABASE_URL else {}

engine = create_engine(
    settings.DATABASE_URL,
    connect_args=connect_args,
    echo=False,
)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()


def get_db():
    """FastAPI Dependency for database session injection."""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def run_schema_migrations(target_engine):
    """
    Non-destructive migration runner.
    Checks existing tables for missing columns and adds them safely without data loss.
    """
    inspector = inspect(target_engine)
    existing_tables = inspector.get_table_names()

    with target_engine.connect() as conn:
        # Check documents table
        if "documents" in existing_tables:
            columns = [c["name"] for c in inspector.get_columns("documents")]
            if "file_hash" not in columns:
                conn.execute(text("ALTER TABLE documents ADD COLUMN file_hash VARCHAR(64)"))
                logger.info("Migrated schema: added file_hash to documents")
            if "file_size_bytes" not in columns:
                conn.execute(text("ALTER TABLE documents ADD COLUMN file_size_bytes INTEGER DEFAULT 0"))
                logger.info("Migrated schema: added file_size_bytes to documents")
            if "error_message" not in columns:
                conn.execute(text("ALTER TABLE documents ADD COLUMN error_message TEXT"))
                logger.info("Migrated schema: added error_message to documents")

        # Check human_reviews table
        if "human_reviews" in existing_tables:
            rev_cols = [c["name"] for c in inspector.get_columns("human_reviews")]
            if "original_verdict" not in rev_cols:
                conn.execute(text("ALTER TABLE human_reviews ADD COLUMN original_verdict VARCHAR(32)"))
                logger.info("Migrated schema: added original_verdict to human_reviews")

        conn.commit()
