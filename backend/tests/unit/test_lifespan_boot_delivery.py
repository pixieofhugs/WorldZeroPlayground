from contextlib import asynccontextmanager
from unittest.mock import AsyncMock, MagicMock

import pytest

import main


@pytest.mark.asyncio
async def test_a_raising_boot_delivery_still_lets_the_app_start(monkeypatch):
    session = AsyncMock()
    lock = MagicMock(close=AsyncMock())

    @asynccontextmanager
    async def fake_session():
        yield session

    @asynccontextmanager
    async def fake_rooms():
        yield

    monkeypatch.setattr(main, "AsyncSessionLocal", fake_session)
    monkeypatch.setattr(main, "PRAXIS_ROOM_SERVER", fake_rooms())
    monkeypatch.setattr(
        main, "acquire_single_instance_lock", AsyncMock(return_value=lock)
    )
    monkeypatch.setattr(main, "rebind_live_era", AsyncMock())
    monkeypatch.setattr(
        main, "deliver_invitations_to_all", AsyncMock(side_effect=RuntimeError("x"))
    )
    async with main.lifespan(main.app):
        pass
    session.rollback.assert_awaited_once()
    session.commit.assert_not_awaited()
    lock.close.assert_awaited_once()
