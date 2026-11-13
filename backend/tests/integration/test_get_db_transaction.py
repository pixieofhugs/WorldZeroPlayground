"""``get_db`` owns commit/rollback. Uses the real ``get_db``, not the test override."""
from __future__ import annotations

import json
import uuid

import pytest
import pytest_asyncio
from sqlalchemy import delete, select
from sqlalchemy.ext.asyncio import async_sessionmaker, create_async_engine
from sqlalchemy.pool import NullPool

import db as db_module
from models.contact import ContactMessage
from tests.integration.conftest import _TEST_DB_URL


@pytest_asyncio.fixture
async def real_engine_bound(test_engine, monkeypatch):
    """``test_engine`` ensures the schema; NullPool closes connections on exit."""
    engine = create_async_engine(_TEST_DB_URL, echo=False, poolclass=NullPool)
    session_factory = async_sessionmaker(engine, expire_on_commit=False)
    monkeypatch.setattr(db_module, "AsyncSessionLocal", session_factory)
    yield session_factory
    await engine.dispose()


@pytest.mark.asyncio
async def test_get_db_commits_on_success(real_engine_bound):
    unique_name = f"rollback-test-{uuid.uuid4()}"

    gen = db_module.get_db()
    session = await gen.__anext__()
    session.add(
        ContactMessage(
            name=unique_name,
            email="commit@example.com",
            message="should persist",
        )
    )
    with pytest.raises(StopAsyncIteration):
        await gen.__anext__()

    new_session = real_engine_bound()
    try:
        result = await new_session.execute(
            select(ContactMessage).where(ContactMessage.name == unique_name)
        )
        row = result.scalar_one_or_none()
        assert row is not None, "Expected commit to persist the row"
        await new_session.delete(row)
        await new_session.commit()
    finally:
        await new_session.close()


@pytest.mark.asyncio
async def test_get_db_rolls_back_on_exception(real_engine_bound):
    unique_name = f"rollback-test-{uuid.uuid4()}"

    gen = db_module.get_db()
    session = await gen.__anext__()
    session.add(
        ContactMessage(
            name=unique_name,
            email="rollback@example.com",
            message="should NOT persist",
        )
    )
    # Flush so this is written-then-rolled-back, not never-written.
    await session.flush()

    with pytest.raises(RuntimeError, match="boom"):
        await gen.athrow(RuntimeError("boom"))

    new_session = real_engine_bound()
    try:
        result = await new_session.execute(
            select(ContactMessage).where(ContactMessage.name == unique_name)
        )
        row = result.scalar_one_or_none()
        assert row is None, "Rollback should have discarded the pending insert"
    finally:
        await new_session.close()


@pytest.mark.asyncio
async def test_write_is_committed_before_the_response_starts(real_engine_bound):
    """A client that has read "201" can read the row (#2453).

    Request-scoped ``yield`` deps close after the response is sent. Raw ASGI
    lets the check run at ``http.response.start``; httpx waits for the whole app.
    """
    from main import app

    name = f"commit-first-{uuid.uuid4()}"
    body = json.dumps({"name": name, "email": "a@example.com", "message": "m"}).encode()
    scope = {
        "type": "http", "asgi": {"version": "3.0"}, "http_version": "1.1",
        "method": "POST", "scheme": "http", "path": "/contact", "raw_path": b"/contact",
        "query_string": b"", "server": ("test", 80), "client": ("test", 1),
        "headers": [(b"host", b"test"), (b"content-type", b"application/json"),
                    (b"content-length", str(len(body)).encode())],
    }
    visible_at_start: list[bool] = []

    async def receive():
        return {"type": "http.request", "body": body, "more_body": False}

    async def send(message):
        if message["type"] == "http.response.start":
            assert message["status"] == 201
            async with real_engine_bound() as other:
                found = await other.scalar(
                    select(ContactMessage).where(ContactMessage.name == name)
                )
            visible_at_start.append(found is not None)

    await app(scope, receive, send)

    async with real_engine_bound() as cleanup:
        await cleanup.execute(delete(ContactMessage).where(ContactMessage.name == name))
        await cleanup.commit()
    assert visible_at_start == [True]


def test_no_route_takes_get_db_at_request_scope():
    """Every ``Depends(get_db)`` names ``scope="function"``.

    Source scan: FastAPI's route table shape changes between releases.
    """
    from pathlib import Path

    backend = Path(db_module.__file__).parent
    late = sorted(
        str(path.relative_to(backend))
        for folder in ("routers", "services", ".")
        for path in (backend / folder).glob("*.py")
        if "Depends(get_db)" in path.read_text()
    )
    assert late == []
