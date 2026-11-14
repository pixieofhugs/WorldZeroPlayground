"""A task can't be filed under a hidden system faction (#3379)."""
import pytest
from httpx import AsyncClient
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from errors import ErrorCode
from models.account import Account
from models.character import Character
from models.faction import Faction, FactionStatus
from models.task import Task
from tests.integration.factories import make_admin

HIDDEN = "hidden_test_faction"
IMPORT_URL = "/admin/tasks/import-csv"


async def _hide(session: AsyncSession) -> None:
    session.add(Faction(slug=HIDDEN, status=FactionStatus.hidden))
    await session.commit()


@pytest.mark.asyncio
@pytest.mark.parametrize(
    "extra",
    [
        {"primary_faction_slug": HIDDEN},
        {"task_type": "metatask", "metatask_faction_slug": HIDDEN},
    ],
)
async def test_propose_refuses_hidden_faction(
    client: AsyncClient,
    db_session: AsyncSession,
    account: Account,
    character: Character,
    auth_headers: dict,
    extra: dict,
):
    await make_admin(db_session, account)
    await _hide(db_session)

    resp = await client.post(
        "/tasks",
        json={"title": "Nope", "point_value": 10, "level_required": 0, **extra},
        headers=auth_headers,
    )

    assert resp.status_code == 422
    assert resp.json()["detail"]["code"] == ErrorCode.task_faction_hidden.value
    assert not (
        await db_session.execute(select(Task).where(Task.title == "Nope"))
    ).scalars().all()


@pytest.mark.asyncio
async def test_import_rejects_hidden_faction_row(
    client: AsyncClient,
    db_session: AsyncSession,
    account: Account,
    character: Character,
    auth_headers: dict,
):
    await make_admin(db_session, account)
    await _hide(db_session)
    csv = f"Name,Faction,Description,Level,Points\nSneaky,{HIDDEN},x,0,10\n"

    resp = await client.post(
        IMPORT_URL,
        files={"file": ("t.csv", csv.encode(), "text/csv")},
        headers=auth_headers,
    )

    assert resp.status_code == 422
    assert "is not open for tasks" in resp.text
    assert not (
        await db_session.execute(select(Task).where(Task.title == "Sneaky"))
    ).scalars().all()
