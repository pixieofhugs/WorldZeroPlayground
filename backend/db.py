from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker, AsyncSession
from typing import AsyncGenerator, Callable

from config import settings

engine = create_async_engine(
    settings.DATABASE_URL,
    echo=settings.is_development,
)

AsyncSessionLocal = async_sessionmaker(engine, expire_on_commit=False)


def get_session_factory() -> Callable:
    """FastAPI dependency: returns the session factory used for concurrent sub-queries.

    Injected into routers that need to fan out DB work across independent sessions.
    Override in tests to provide a factory that reuses the test-transaction session
    so sub-queries see uncommitted fixture data.
    """
    return AsyncSessionLocal


async def get_db() -> AsyncGenerator[AsyncSession, None]:
    """Yield a session; commit on successful handler return, rollback on exception.

    Services call ``session.flush()`` only — the router's dependency owns the
    single per-request commit. If the handler raises, the transaction rolls back
    and the exception propagates unchanged.
    """
    async with AsyncSessionLocal() as session:
        try:
            yield session
            await session.commit()
        except Exception:
            await session.rollback()
            raise
