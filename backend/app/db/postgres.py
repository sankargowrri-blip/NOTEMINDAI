from __future__ import annotations
from builtins import len, Exception, str
import logging
from sqlalchemy import text
from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker
from sqlalchemy.orm import DeclarativeBase
from app.config import settings

logger = logging.getLogger(__name__)

# Use SQLite for local dev if no PostgreSQL URL is configured
_pg_url = settings.postgres_url

if "localhost" in _pg_url or "127.0.0.1" in _pg_url:
    async_url = _pg_url.replace("postgresql://", "postgresql+asyncpg://")
else:
    # Robust URL conversion for asyncpg
    url = _pg_url
    if url.startswith("postgres://"):
        url = url.replace("postgres://", "postgresql://", 1)
    
    if "postgresql+asyncpg://" not in url:
        url = url.replace("postgresql://", "postgresql+asyncpg://", 1)
    
    async_url = url
    logger.info(f"DB_LOG: Using production PostgreSQL database (url length: {len(async_url)})")

_use_sqlite = "sqlite" in async_url or (_pg_url == "postgresql://notemind:notemind_secret@localhost:5432/notemind")

if _use_sqlite and "sqlite" not in async_url:
    async_url = "sqlite+aiosqlite:///./notemind_dev.db"
    logger.info("DB_LOG: Using SQLite database fallback")

engine = create_async_engine(
    async_url,
    echo=False,
    pool_pre_ping=True,
    pool_recycle=300,
    connect_args={"command_timeout": 30} if not _use_sqlite else {"check_same_thread": False},
)
AsyncSessionLocal = async_sessionmaker(engine, expire_on_commit=False)

class Base(DeclarativeBase):
    pass

async def init_db():
    """Create all tables on startup and run migrations."""
    logger.info("DB_LOG: Starting database initialization...")
    try:
        async with engine.begin() as conn:
            # 1. Run migrations for new columns and CASCADE rules
            if not _use_sqlite:
                logger.info("DB_LOG: Verifying database schema and CASCADE rules...")
                try:
                    # Add security columns
                    await conn.execute(text("ALTER TABLE users ADD COLUMN IF NOT EXISTS security_question VARCHAR(255)"))
                    await conn.execute(text("ALTER TABLE users ADD COLUMN IF NOT EXISTS security_answer VARCHAR(255)"))
                    
                    # Fix Deletion (Cascading): Ensure all child tables have CASCADE enabled
                    # We drop and recreate constraints for all tables that reference notes
                    fixes = [
                        ("quizzes", "notes", "note_id", "quizzes_note_id_fkey"),
                        ("flashcard_sets", "notes", "note_id", "flashcard_sets_note_id_fkey"),
                        ("study_sessions", "notes", "note_id", "study_sessions_note_id_fkey"),
                        ("weak_topics", "notes", "note_id", "weak_topics_note_id_fkey"),
                        ("quiz_attempts", "notes", "note_id", "quiz_attempts_note_id_fkey")
                    ]
                    
                    for table, parent, column, constraint in fixes:
                        try:
                            # Use IF EXISTS and recreate with ON DELETE CASCADE
                            await conn.execute(text(f"ALTER TABLE {table} DROP CONSTRAINT IF EXISTS {constraint}"))
                            await conn.execute(text(f"ALTER TABLE {table} ADD CONSTRAINT {constraint} FOREIGN KEY ({column}) REFERENCES {parent}(id) ON DELETE CASCADE"))
                        except Exception:
                            pass
                    
                    logger.info("DB_LOG: CASCADE rules successfully updated.")
                except Exception as me:
                    logger.warning(f"DB_LOG: Migration notice: {me}")

            # 2. Create tables via models
            logger.info("DB_LOG: Connection established, importing models...")
            from app.models import user, note, quiz as quiz_model, flashcard, analytics as analytics_model  # noqa
            logger.info("DB_LOG: Creating tables if they don't exist...")
            await conn.run_sync(Base.metadata.create_all)
        
        logger.info("DB_LOG: Database tables verified successfully.")
    except Exception as e:
        logger.error(f"DB_LOG: Database init failed: {str(e)}")

async def get_db():
    async with AsyncSessionLocal() as session:
        try:
            yield session
        finally:
            await session.close()
