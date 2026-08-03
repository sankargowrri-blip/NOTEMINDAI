from __future__ import annotations
import logging
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession, async_sessionmaker
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
    """Create all tables on startup."""
    logger.info("DB_LOG: Starting database initialization...")
    try:
        async with engine.begin() as conn:
            logger.info("DB_LOG: Connection established, importing models...")
            from app.models import user, note, quiz as quiz_model, flashcard, analytics as analytics_model  # noqa
            logger.info("DB_LOG: Creating tables if they don't exist...")
            await conn.run_sync(Base.metadata.create_all)
        logger.info("DB_LOG: Database tables verified successfully.")
    except Exception as e:
        logger.error(f"DB_LOG: Database init failed: {str(e)}")
        # Don't raise here, allow the app to start (it will fail on actual queries with better errors)

async def get_db():
    async with AsyncSessionLocal() as session:
        try:
            yield session
        finally:
            await session.close()
