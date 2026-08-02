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
    # Render and other providers often use postgres://
    url = _pg_url
    if url.startswith("postgres://"):
        url = url.replace("postgres://", "postgresql://", 1)
    
    if "postgresql+asyncpg://" not in url:
        url = url.replace("postgresql://", "postgresql+asyncpg://", 1)
    
    async_url = url
    logger.info("Using production PostgreSQL database")

# SQLite fallback: if POSTGRES_URL is the default example, use SQLite
_use_sqlite = "sqlite" in async_url or (_pg_url == "postgresql://notemind:notemind_secret@localhost:5432/notemind")

if _use_sqlite and "sqlite" not in async_url:
    async_url = "sqlite+aiosqlite:///./notemind_dev.db"
    logger.info("Using SQLite database for local development (notemind_dev.db)")

engine = create_async_engine(
    async_url,
    echo=settings.app_env == "development",
    pool_pre_ping=True,
    pool_recycle=300,
    connect_args={"command_timeout": 30} if not _use_sqlite else {"check_same_thread": False},
)
AsyncSessionLocal = async_sessionmaker(engine, expire_on_commit=False)


class Base(DeclarativeBase):
    pass


async def init_db():
    """Create all tables on startup."""
    try:
        async with engine.begin() as conn:
            from app.models import user, note, quiz as quiz_model, flashcard, analytics as analytics_model  # noqa
            await conn.run_sync(Base.metadata.create_all)
        logger.info("Database tables created/verified successfully.")
    except Exception as e:
        logger.error(f"Database init failed: {e}")


async def get_db():
    async with AsyncSessionLocal() as session:
        try:
            yield session
        finally:
            await session.close()
