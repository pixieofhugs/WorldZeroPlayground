"""#3305 — a ``deleted`` task exists for admins only.

The seam is the two reads every surface routes through, plus the sign-up
predicate: ``GET /tasks`` / ``GET /tasks/{id}`` (HTTP) and ``evaluate_signup``
with ``list_tasks(can_sign_up=True)`` (service). A new status is let through by
default wherever a gate lists exclusions by name; the sign-up cases use an era
that grants the viewer's faction every ``allow_praxis_on_*`` allowance, because
a perk that reopens retired/pending tasks must never reopen a deleted one.
"""
from dataclasses import replace

import pytest
from httpx import AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession

from game_config import CURRENT_ERA
from models.account import Account
from models.character import Character
from models.era import Era
from models.faction import Faction
from models.task import TaskStatus
from services.praxis import SignupDenialReason, evaluate_signup
from services.task import list_tasks
from tests.integration.factories import make_admin, make_task


async def _ids(client: AsyncClient, query: str, headers: dict) -> set[int]:
    response = await client.get(f"/tasks{query}", headers=headers)
    assert response.status_code == 200, response.text
    return {row["id"] for row in response.json()}


@pytest.mark.asyncio
async def test_non_admin_cannot_see_a_deleted_task(
    client: AsyncClient,
    character: Character,
    auth_headers: dict,
    db_session: AsyncSession,
):
    live = await make_task(db_session, character, title="live", commit=True)
    gone = await make_task(
        db_session, character, title="gone", status=TaskStatus.deleted, commit=True
    )

    assert (await client.get(f"/tasks/{gone.id}", headers=auth_headers)).status_code == 404
    assert (await client.get(f"/tasks/{gone.id}")).status_code == 404
    for query in ("", "?status=all", "?status=deleted", "?task_type=all"):
        assert gone.id not in await _ids(client, query, auth_headers), query
    assert live.id in await _ids(client, "?status=all", auth_headers)


@pytest.mark.asyncio
async def test_admin_sees_a_deleted_task_in_status_all(
    client: AsyncClient,
    account: Account,
    character: Character,
    auth_headers: dict,
    db_session: AsyncSession,
):
    await make_admin(db_session, account)
    gone = await make_task(
        db_session, character, title="gone", status=TaskStatus.deleted, commit=True
    )

    assert (await client.get(f"/tasks/{gone.id}", headers=auth_headers)).status_code == 200
    assert gone.id in await _ids(client, "?status=all&limit=500", auth_headers)


@pytest.mark.asyncio
async def test_no_faction_allowance_reopens_a_deleted_task(
    db_session: AsyncSession, character: Character, era: Era, some_faction: Faction
):
    """The faction is on every allowance list, so only the explicit exclusion holds."""
    slug = character.faction_slug
    permissive = replace(
        CURRENT_ERA,
        allow_praxis_on_retired_task_factions=frozenset({slug}),
        allow_praxis_on_pending_task_factions=frozenset({slug}),
    )
    retired = await make_task(db_session, character, title="r", status=TaskStatus.retired)
    gone = await make_task(db_session, character, title="d", status=TaskStatus.deleted)

    assert (await evaluate_signup(character, retired, db_session, permissive)).allowed
    denied = await evaluate_signup(character, gone, db_session, permissive)
    assert denied.allowed is False
    assert denied.reason is SignupDenialReason.task_status_closed

    # SQL half of the same predicate (#1130): the allowance opens retired, not deleted.
    ids = {
        task.id
        for task in await list_tasks(
            db_session,
            status="all",
            task_type="all",
            viewer=character,
            can_sign_up=True,
            era=permissive,
            limit=200,
        )
    }
    assert retired.id in ids
    assert gone.id not in ids
