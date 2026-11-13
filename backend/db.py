from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker, AsyncSession
from typing import AsyncGenerator, Callable

from config import settings

engine = create_async_engine(
    settings.DATABASE_URL,
    echo=settings.is_development,
    pool_pre_ping=True,
)

AsyncSessionLocal = async_sessionmaker(engine, expire_on_commit=False)


def get_session_factory() -> Callable:
    """FastAPI dependency: the session factory for concurrent sub-queries.

    Tests override it so sub-queries see uncommitted fixture data.
    """
    return AsyncSessionLocal


async def get_db() -> AsyncGenerator[AsyncSession, None]:
    """Yield a session; commit on successful handler return, rollback on exception.

    Services only ``flush()``; this owns the per-request commit.

    **Every route takes it as `Depends(get_db, scope="function")`**: request
    scope would commit after the response is sent (#2453).

    The one exception is ``services.era.commit_and_bind_live_era``, which commits
    itself so the live-era binding follows a durable write (ADR-0091). Not a
    precedent.
    """
    async with AsyncSessionLocal() as session:
        try:
            yield session
            await session.commit()
        except Exception:
            await session.rollback()
            raise
