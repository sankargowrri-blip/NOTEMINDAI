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
    # Ensure we use asyncpg driver and handle both postgres:// and postgresql://
    if _pg_url.startswith("postgres://"):
        async_url = _pg_url.replace("postgres://", "postgresql+asyncpg://", 1)
    else:
        async_url = _pg_url.replace("postgresql://", "postgresql+asyncpg://", 1)

# SQLite fallback: if POSTGRES_URL is the default example, use SQLite
_use_sqlite = _pg_url == "postgresql://notemind:notemind_secret@localhost:5432/notemind"

if _use_sqlite:
    async_url = "sqlite+aiosqlite:///./notemind_dev.db"
    logger.info("Using SQLite database for local development (notemind_dev.db)")

engine = create_async_engine(
    async_url,
    echo=settings.app_env == "development",
    pool_pre_ping=True,
    pool_recycle=300,
    # SQLite needs connect_args for async
    **({"connect_args": {"check_same_thread": False}} if _use_sqlite else {}),
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
        logger.error(f"Database init failed: {e}. Some features will be unavailable.")


async def get_db():
    async with AsyncSessionLocal() as session:
        try:
            yield session
        finally:
            await session.close()
