"""Integration tests for GET /admin/praxes — the admin praxis finder (#3061).

The seam under test is the **HTTP route**, driven beside the public
``GET /praxes`` it shares a filtering service with. The one thing the admin
list may do that the public list may not is show praxes the site has taken out
of view — ``hidden`` ones and other players' ``in_progress`` drafts — so every
visibility test asks both doors the same question and compares the answers.

The praxes here belong to ``character2`` while the admin is ``account`` /
``character``: membership must never be what explains a row being visible.
"""
import pytest
from httpx import AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession

from models.account import Account
from models.character import Character
from models.praxis import ModerationStatus, PraxisStatus
from models.task import Task
from tests.integration.factories import make_admin, make_solo_praxis

ADMIN_LIST = "/admin/praxes"
PUBLIC_LIST = "/praxes"


def _ids(resp) -> list[int]:
    assert resp.status_code == 200, resp.text
    return [row["id"] for row in resp.json()]


# ---------------------------------------------------------------------------
# Auth guard
# ---------------------------------------------------------------------------


@pytest.mark.asyncio
async def test_non_admin_is_refused(
    client: AsyncClient, character: Character, auth_headers: dict
):
    resp = await client.get(ADMIN_LIST, headers=auth_headers)

    assert resp.status_code == 403


@pytest.mark.asyncio
async def test_anonymous_is_refused(client: AsyncClient):
    resp = await client.get(ADMIN_LIST)

    assert resp.status_code in (401, 403)


# ---------------------------------------------------------------------------
# The visibility difference
# ---------------------------------------------------------------------------


@pytest.mark.asyncio
async def test_admin_finds_a_hidden_praxis_by_title_search(
    client: AsyncClient,
    account: Account,
    character: Character,
    character2: Character,
    active_task: Task,
    auth_headers: dict,
    db_session: AsyncSession,
):
    await make_admin(db_session, account)
    hidden = await make_solo_praxis(
        db_session,
        active_task,
        character2,
        title="Zebra Crossing Heist",
        moderation_status=ModerationStatus.hidden,
    )
    other = await make_solo_praxis(
        db_session, active_task, character2, title="Unrelated"
    )
    await db_session.commit()

    resp = await client.get(ADMIN_LIST, params={"q": "zebra"}, headers=auth_headers)

    assert _ids(resp) == [hidden.id]
    assert resp.json()[0]["moderation_status"] == "hidden"
    assert other.id not in _ids(resp)


@pytest.mark.asyncio
async def test_hidden_and_in_progress_are_in_the_admin_list_and_not_the_public_one(
    client: AsyncClient,
    account: Account,
    character: Character,
    character2: Character,
    active_task: Task,
    auth_headers: dict,
    db_session: AsyncSession,
):
    await make_admin(db_session, account)
    visible = await make_solo_praxis(db_session, active_task, character2, title="seen")
    hidden = await make_solo_praxis(
        db_session,
        active_task,
        character2,
        title="taken down",
        moderation_status=ModerationStatus.hidden,
    )
    draft = await make_solo_praxis(
        db_session,
        active_task,
        character2,
        title="someone else's draft",
        status=PraxisStatus.in_progress,
    )
    await db_session.commit()

    admin_ids = _ids(await client.get(ADMIN_LIST, headers=auth_headers))
    # The same admin, at the public door.
    public_ids = _ids(await client.get(PUBLIC_LIST, headers=auth_headers))

    assert {visible.id, hidden.id, draft.id} <= set(admin_ids)
    assert visible.id in public_ids
    assert hidden.id not in public_ids
    assert draft.id not in public_ids


@pytest.mark.asyncio
async def test_no_public_query_param_reveals_hidden_or_drafts_even_to_an_admin(
    client: AsyncClient,
    account: Account,
    character: Character,
    character2: Character,
    active_task: Task,
    auth_headers: dict,
    db_session: AsyncSession,
):
    """The public door stays shut whatever is asked of it, and by whom."""
    await make_admin(db_session, account)
    hidden = await make_solo_praxis(
        db_session,
        active_task,
        character2,
        title="taken down",
        moderation_status=ModerationStatus.hidden,
    )
    draft = await make_solo_praxis(
        db_session,
        active_task,
        character2,
        title="someone else's draft",
        status=PraxisStatus.in_progress,
    )
    await db_session.commit()

    for params in (
        {"moderation_status": "hidden"},
        {"status": "in_progress"},
        {"q": "taken down"},
        {"member_id": character2.id},
        # Not a parameter of the public route; must be ignored, not honoured.
        {"include_unlisted": "true"},
    ):
        public_ids = _ids(
            await client.get(PUBLIC_LIST, params=params, headers=auth_headers)
        )
        assert hidden.id not in public_ids, params
        assert draft.id not in public_ids, params


# ---------------------------------------------------------------------------
# Filters and paging
# ---------------------------------------------------------------------------


@pytest.mark.asyncio
async def test_admin_filters_narrow_the_list(
    client: AsyncClient,
    account: Account,
    character: Character,
    character2: Character,
    active_task: Task,
    auth_headers: dict,
    db_session: AsyncSession,
):
    await make_admin(db_session, account)
    visible = await make_solo_praxis(db_session, active_task, character, title="mine")
    hidden = await make_solo_praxis(
        db_session,
        active_task,
        character2,
        title="taken down",
        moderation_status=ModerationStatus.hidden,
    )
    draft = await make_solo_praxis(
        db_session,
        active_task,
        character2,
        title="draft",
        status=PraxisStatus.in_progress,
    )
    await db_session.commit()

    async def ask(**params) -> set[int]:
        return set(
            _ids(await client.get(ADMIN_LIST, params=params, headers=auth_headers))
        )

    assert await ask(moderation_status="hidden") == {hidden.id}
    assert await ask(status="in_progress") == {draft.id}
    assert await ask(member_id=character2.id) == {hidden.id, draft.id}
    assert await ask(task_id=active_task.id) == {visible.id, hidden.id, draft.id}
    assert await ask(task_id=active_task.id + 1) == set()
    assert await ask(type="collab") == set()
    assert await ask(faction="no-such-faction") == set()


@pytest.mark.asyncio
async def test_admin_list_rejects_a_filter_value_it_does_not_know(
    client: AsyncClient,
    account: Account,
    character: Character,
    auth_headers: dict,
    db_session: AsyncSession,
):
    await make_admin(db_session, account)

    for params in (
        {"moderation_status": "nonsense"},
        {"status": "nonsense"},
        {"type": "nonsense"},
        {"era_scope": "nonsense"},
        {"limit": 0},
        {"offset": -1},
    ):
        resp = await client.get(ADMIN_LIST, params=params, headers=auth_headers)
        assert resp.status_code == 422, params


@pytest.mark.asyncio
async def test_admin_list_pages_server_side(
    client: AsyncClient,
    account: Account,
    character: Character,
    character2: Character,
    active_task: Task,
    auth_headers: dict,
    db_session: AsyncSession,
):
    await make_admin(db_session, account)
    for index in range(5):
        await make_solo_praxis(
            db_session, active_task, character2, title=f"page row {index}"
        )
    await db_session.commit()

    async def page(offset: int) -> list[int]:
        return _ids(
            await client.get(
                ADMIN_LIST,
                params={"q": "page row", "limit": 2, "offset": offset},
                headers=auth_headers,
            )
        )

    first, second, third = await page(0), await page(2), await page(4)

    assert (len(first), len(second), len(third)) == (2, 2, 1)
    assert len(set(first + second + third)) == 5


# ---------------------------------------------------------------------------
# Hide -> restore, through the existing moderate route
# ---------------------------------------------------------------------------


@pytest.mark.asyncio
async def test_hide_then_restore_round_trips_through_the_list(
    client: AsyncClient,
    account: Account,
    character: Character,
    character2: Character,
    active_task: Task,
    auth_headers: dict,
    db_session: AsyncSession,
):
    await make_admin(db_session, account)
    praxis = await make_solo_praxis(
        db_session, active_task, character2, title="round trip"
    )
    await db_session.commit()

    async def listed_status() -> str:
        resp = await client.get(
            ADMIN_LIST, params={"q": "round trip"}, headers=auth_headers
        )
        (row,) = resp.json()
        return row["moderation_status"]

    async def moderate(status: str) -> None:
        resp = await client.patch(
            f"/admin/praxes/{praxis.id}/moderate",
            json={"status": status},
            headers=auth_headers,
        )
        assert resp.status_code == 200, resp.text

    assert await listed_status() == "visible"
    await moderate("hidden")
    assert await listed_status() == "hidden"
    assert praxis.id not in _ids(await client.get(PUBLIC_LIST, headers=auth_headers))
    await moderate("visible")
    assert await listed_status() == "visible"
    assert praxis.id in _ids(await client.get(PUBLIC_LIST, headers=auth_headers))
