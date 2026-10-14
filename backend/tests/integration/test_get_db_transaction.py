"""Regression tests for the transactional contract of ``get_db``.

Services no longer own commit; the router dependency does. These tests
exercise the dependency directly to verify:

* On successful handler return, pending writes are committed.
* On exception during the handler, pending writes are rolled back so no
  partial state reaches the database.

The tests use the *real* production ``get_db`` (not the test override),
against the test database. Each test wraps its work in a session it owns
and cleans up after itself so no cross-test pollution is possible.
"""
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
    """Point ``get_db`` at the test database for the duration of one test.

    Requires ``test_engine`` (session-scoped) so the schema exists. We swap
    ``db.AsyncSessionLocal`` with a sessionmaker bound to a freshly created
    engine against ``worldzero_test``. Uses NullPool so asyncpg connections
    are closed on session exit.
    """
    engine = create_async_engine(_TEST_DB_URL, echo=False, poolclass=NullPool)
    session_factory = async_sessionmaker(engine, expire_on_commit=False)
    monkeypatch.setattr(db_module, "AsyncSessionLocal", session_factory)
    yield session_factory
    await engine.dispose()


@pytest.mark.asyncio
async def test_get_db_commits_on_success(real_engine_bound):
    """A write inside ``get_db`` is visible after the generator exits cleanly."""
    unique_name = f"rollback-test-{uuid.uuid4()}"

    # Drive the ``get_db`` generator end-to-end: yield, write, close cleanly.
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

    # Open a NEW session to confirm the row persisted across sessions.
    new_session = real_engine_bound()
    try:
        result = await new_session.execute(
            select(ContactMessage).where(ContactMessage.name == unique_name)
        )
        row = result.scalar_one_or_none()
        assert row is not None, "Expected commit to persist the row"
        # Clean up so we don't leak state into other tests.
        await new_session.delete(row)
        await new_session.commit()
    finally:
        await new_session.close()


@pytest.mark.asyncio
async def test_get_db_rolls_back_on_exception(real_engine_bound):
    """A write followed by an exception inside ``get_db`` must not persist."""
    unique_name = f"rollback-test-{uuid.uuid4()}"

    # Drive the generator: yield, write, then throw -> rollback path.
    gen = db_module.get_db()
    session = await gen.__anext__()
    session.add(
        ContactMessage(
            name=unique_name,
            email="rollback@example.com",
            message="should NOT persist",
        )
    )
    # Flush the INSERT to the DB so we can distinguish 'never written'
    # from 'written-but-rolled-back'. The rollback must still discard it.
    await session.flush()

    with pytest.raises(RuntimeError, match="boom"):
        await gen.athrow(RuntimeError("boom"))

    # In a brand new session, the row should NOT be there.
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

    FastAPI closes a request-scoped ``yield`` dependency AFTER it sends the
    response, so ``get_db``'s commit used to land just behind the 201: a fast
    follow-up request (the e2e seed's invite right after create, a read right
    after dev-login) could find nothing: 404 PRAXIS_NOT_FOUND, 401. This
    drives the real app as raw ASGI so the check can run at the instant the
    status line goes out, which an httpx round trip (it waits for the whole
    app) cannot see.
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

    The test above proves the mechanism on one route; this keeps the next
    route written from quietly bringing the race back. A source scan, not a
    walk of FastAPI's route table: that table's shape changes between releases.
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
