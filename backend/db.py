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

    **One deliberate exception**, and it is the era rollover:
    ``services.era.commit_and_bind_live_era`` commits inside the service,
    because the process-wide live-era binding has to land *after* the write is
    durable and this dependency's commit runs after the handler has already
    returned (ADR-0091, #827). The commit below then finds nothing left to
    write. Do not read it as a precedent — anything else that wants its own
    commit needs the same "a non-transactional side effect must follow it"
    argument.
    """
    async with AsyncSessionLocal() as session:
        try:
            yield session
            await session.commit()
        except Exception:
            await session.rollback()
            raise
