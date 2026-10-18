"""Integration tests for DELETE /admin/tasks/{task_id} (#3062).

The seam under test is the **HTTP route**: the ``require_admin`` gate, the
status codes and the coded refusal bodies the admin Tasks tab renders are all
facts about the route, so every test drives the real endpoint and then reads
the database to prove what did — and did not — change.

The rule: only a task NOTHING references may be deleted — softly (#3305): the
row stays with ``status = deleted`` and the status endpoint is the undo. Four
tables hold
a foreign key to ``task`` (praxis, duel, praxis_meta_task, comment); a task any
of them points at has history and is refused with a "retire it instead" 409.
"""
import logging

import pytest
from httpx import AsyncClient
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from errors import ErrorCode
from models.account import Account
from models.character import Character
from models.character_stats import CharacterStats
from models.comment import Comment
from models.era import Era
from models.meta_task import PraxisMetaTask
from models.praxis import Praxis
from models.task import Task, TaskStatus
from seed import DUEL_FIXTURE_TASK_SEED_KEY, ONBOARDING_TASK_SEED_KEY
from services import admin_service
from tests.integration.factories import (
    make_admin,
    make_duel,
    make_solo_praxis,
    make_task,
)

JUNK_TITLE = "Typo'd Import Row"


def _delete_url(task_id: int) -> str:
    return f"/admin/tasks/{task_id}"


async def _task_exists(session: AsyncSession, task_id: int) -> bool:
    count = await session.scalar(
        select(func.count()).select_from(Task).where(Task.id == task_id)
    )
    return bool(count)


async def _status_of(session: AsyncSession, task_id: int) -> TaskStatus:
    return await session.scalar(select(Task.status).where(Task.id == task_id))


def _status_url(task_id: int) -> str:
    return f"/admin/tasks/{task_id}/status"


def _assert_refused_with(resp, code: ErrorCode) -> None:
    assert resp.status_code == 409, resp.text
    assert resp.json()["detail"]["code"] == code.value


# ---------------------------------------------------------------------------
# Auth guard
# ---------------------------------------------------------------------------


@pytest.mark.asyncio
async def test_non_admin_is_refused(
    client: AsyncClient,
    character: Character,
    auth_headers: dict,
    db_session: AsyncSession,
):
    """A signed-in non-admin gets 403 and the task survives."""
    task = await make_task(db_session, character, title=JUNK_TITLE, commit=True)

    resp = await client.delete(_delete_url(task.id), headers=auth_headers)

    assert resp.status_code == 403
    assert await _task_exists(db_session, task.id)


@pytest.mark.asyncio
async def test_missing_task_is_404(
    client: AsyncClient,
    account: Account,
    character: Character,
    auth_headers: dict,
    db_session: AsyncSession,
):
    await make_admin(db_session, account)

    resp = await client.delete(_delete_url(999_999_999), headers=auth_headers)

    assert resp.status_code == 404
    assert resp.json()["detail"]["code"] == ErrorCode.task_not_found.value


# ---------------------------------------------------------------------------
# The happy path — an unreferenced task, in any status
# ---------------------------------------------------------------------------


@pytest.mark.asyncio
@pytest.mark.parametrize(
    "status", [s for s in TaskStatus if s is not TaskStatus.deleted]
)
async def test_unreferenced_task_is_deleted(
    status: TaskStatus,
    client: AsyncClient,
    account: Account,
    character: Character,
    auth_headers: dict,
    db_session: AsyncSession,
):
    await make_admin(db_session, account)
    task = await make_task(
        db_session, character, title=JUNK_TITLE, status=status, commit=True
    )
    assert task.seed_key is None  # an ordinary row: nothing the seeder owns

    resp = await client.delete(_delete_url(task.id), headers=auth_headers)

    assert resp.status_code == 204, resp.text
    assert resp.content == b""
    assert await _task_exists(db_session, task.id)  # soft: the row stays
    assert await _status_of(db_session, task.id) is TaskStatus.deleted


@pytest.mark.asyncio
async def test_a_delete_is_logged_with_admin_task_and_title(
    client: AsyncClient,
    account: Account,
    character: Character,
    auth_headers: dict,
    db_session: AsyncSession,
    caplog: pytest.LogCaptureFixture,
):
    """The admin trail: who soft-deleted which task."""
    await make_admin(db_session, account)
    task = await make_task(db_session, character, title=JUNK_TITLE, commit=True)

    with caplog.at_level(logging.INFO, logger=admin_service.__name__):
        resp = await client.delete(_delete_url(task.id), headers=auth_headers)

    assert resp.status_code == 204, resp.text
    (record,) = [r for r in caplog.records if r.name == admin_service.__name__]
    message = record.getMessage()
    assert "soft-deleted" in message
    assert str(account.id) in message
    assert str(task.id) in message
    assert JUNK_TITLE in message
    assert account.email not in message


@pytest.mark.asyncio
async def test_deleting_frees_the_title_for_reimport(
    client: AsyncClient,
    account: Account,
    character: Character,
    auth_headers: dict,
    db_session: AsyncSession,
):
    """The motivating case: the import dedupes on title across every status, so
    a junk row keeps its title taken until it is actually gone."""
    await make_admin(db_session, account)
    task = await make_task(db_session, character, title=JUNK_TITLE, commit=True)

    deleted = await client.delete(_delete_url(task.id), headers=auth_headers)
    assert deleted.status_code == 204, deleted.text

    imported = await client.post(
        "/admin/tasks/import-csv",
        headers=auth_headers,
        files={
            "file": (
                "tasks.csv",
                f"Name,Faction,Description,Level,Points\n{JUNK_TITLE},ua,Again,0,10\n".encode(),
                "text/csv",
            )
        },
    )

    assert imported.status_code == 201, imported.text
    assert imported.json()["created_titles"] == [JUNK_TITLE]


# ---------------------------------------------------------------------------
# A task with history is refused — one test per referencing table
# ---------------------------------------------------------------------------


@pytest.mark.asyncio
async def test_task_with_a_praxis_is_refused_and_nothing_changes(
    client: AsyncClient,
    account: Account,
    character: Character,
    active_task: Task,
    praxis_solo: Praxis,
    era: Era,
    auth_headers: dict,
    db_session: AsyncSession,
):
    await make_admin(db_session, account)

    async def author_points() -> tuple[int, int]:
        row = (
            await db_session.execute(
                select(CharacterStats.score, CharacterStats.all_time_score).where(
                    CharacterStats.character_id == character.id,
                    CharacterStats.era_id == era.id,
                )
            )
        ).one()
        return (row.score, row.all_time_score)

    points_before = await author_points()

    resp = await client.delete(_delete_url(active_task.id), headers=auth_headers)

    _assert_refused_with(resp, ErrorCode.task_has_history)
    assert "retire" in resp.json()["detail"]["message"].lower()
    assert await _status_of(db_session, active_task.id) is TaskStatus.active
    surviving = await db_session.scalar(
        select(Praxis.task_id).where(Praxis.id == praxis_solo.id)
    )
    assert surviving == active_task.id
    assert await author_points() == points_before


@pytest.mark.asyncio
async def test_task_referenced_only_by_a_duel_is_refused(
    client: AsyncClient,
    account: Account,
    character: Character,
    era: Era,
    auth_headers: dict,
    db_session: AsyncSession,
):
    await make_admin(db_session, account)
    task = await make_task(db_session, character, title=JUNK_TITLE)
    # ``make_duel`` puts the duel and both praxes on one task; repoint only the
    # duel row so it is the single thing referencing ours.
    duel, _challenger, _opponent = await make_duel(db_session, era, label="del")
    duel.task_id = task.id
    await db_session.commit()

    resp = await client.delete(_delete_url(task.id), headers=auth_headers)

    _assert_refused_with(resp, ErrorCode.task_has_history)
    assert await _task_exists(db_session, task.id)


@pytest.mark.asyncio
async def test_task_referenced_only_by_an_applied_metatask_is_refused(
    client: AsyncClient,
    account: Account,
    character: Character,
    active_task: Task,
    auth_headers: dict,
    db_session: AsyncSession,
):
    await make_admin(db_session, account)
    task = await make_task(db_session, character, title=JUNK_TITLE)
    # The praxis sits on ANOTHER task; ours is only applied to it as a metatask.
    praxis = await make_solo_praxis(db_session, active_task, character)
    db_session.add(PraxisMetaTask(praxis_id=praxis.id, task_id=task.id))
    await db_session.commit()

    resp = await client.delete(_delete_url(task.id), headers=auth_headers)

    _assert_refused_with(resp, ErrorCode.task_has_history)
    assert await _task_exists(db_session, task.id)


@pytest.mark.asyncio
async def test_task_referenced_only_by_a_comment_is_refused(
    client: AsyncClient,
    account: Account,
    character: Character,
    auth_headers: dict,
    db_session: AsyncSession,
):
    await make_admin(db_session, account)
    task = await make_task(db_session, character, title=JUNK_TITLE)
    db_session.add(
        Comment(task_id=task.id, created_by_id=character.id, body_text="nice one")
    )
    await db_session.commit()

    resp = await client.delete(_delete_url(task.id), headers=auth_headers)

    _assert_refused_with(resp, ErrorCode.task_has_history)
    assert await _task_exists(db_session, task.id)


# ---------------------------------------------------------------------------
# Seed-keyed tasks — refused whatever their dependents
# ---------------------------------------------------------------------------


@pytest.mark.asyncio
@pytest.mark.parametrize(
    "seed_key", [ONBOARDING_TASK_SEED_KEY, DUEL_FIXTURE_TASK_SEED_KEY]
)
async def test_seed_keyed_task_is_refused_even_when_unreferenced(
    seed_key: str,
    client: AsyncClient,
    account: Account,
    character: Character,
    auth_headers: dict,
    db_session: AsyncSession,
):
    """Any ``seed_key`` at all (#3064), never the title: the seeder owns the row
    and would only put it back on the next deploy."""
    await make_admin(db_session, account)
    task = await make_task(db_session, character, title="Any wording at all")
    task.seed_key = seed_key
    await db_session.commit()

    resp = await client.delete(_delete_url(task.id), headers=auth_headers)

    _assert_refused_with(resp, ErrorCode.task_seed_owned)
    assert await _task_exists(db_session, task.id)


# ---------------------------------------------------------------------------
# The status endpoint: no back door in, an undo out (#3305)
# ---------------------------------------------------------------------------


async def _put_status(client: AsyncClient, headers: dict, task_id: int, status: str):
    return await client.put(
        _status_url(task_id), headers=headers, json={"status": status}
    )


@pytest.mark.asyncio
async def test_status_endpoint_deletes_an_unreferenced_task(
    client: AsyncClient,
    account: Account,
    character: Character,
    auth_headers: dict,
    db_session: AsyncSession,
):
    await make_admin(db_session, account)
    task = await make_task(db_session, character, title=JUNK_TITLE, commit=True)

    resp = await _put_status(client, auth_headers, task.id, "deleted")

    assert resp.status_code == 200, resp.text
    assert resp.json()["status"] == "deleted"


@pytest.mark.asyncio
async def test_status_endpoint_refuses_a_task_with_history(
    client: AsyncClient,
    account: Account,
    active_task: Task,
    praxis_solo: Praxis,
    auth_headers: dict,
    db_session: AsyncSession,
):
    await make_admin(db_session, account)

    resp = await _put_status(client, auth_headers, active_task.id, "deleted")

    _assert_refused_with(resp, ErrorCode.task_has_history)
    assert await _status_of(db_session, active_task.id) is TaskStatus.active


@pytest.mark.asyncio
async def test_status_endpoint_refuses_a_seed_owned_task(
    client: AsyncClient,
    account: Account,
    character: Character,
    auth_headers: dict,
    db_session: AsyncSession,
):
    await make_admin(db_session, account)
    task = await make_task(db_session, character, title="Seeded", commit=True)
    task.seed_key = ONBOARDING_TASK_SEED_KEY
    await db_session.commit()

    resp = await _put_status(client, auth_headers, task.id, "deleted")

    _assert_refused_with(resp, ErrorCode.task_seed_owned)
    assert await _status_of(db_session, task.id) is TaskStatus.active


@pytest.mark.asyncio
@pytest.mark.parametrize("target", ["pending", "active", "retired"])
async def test_leaving_deleted_restores_the_task(
    target: str,
    client: AsyncClient,
    account: Account,
    character: Character,
    auth_headers: dict,
    db_session: AsyncSession,
):
    await make_admin(db_session, account)
    task = await make_task(db_session, character, title=JUNK_TITLE, commit=True)
    deleted = await client.delete(_delete_url(task.id), headers=auth_headers)
    assert deleted.status_code == 204

    resp = await _put_status(client, auth_headers, task.id, target)

    assert resp.status_code == 200, resp.text
    assert await _status_of(db_session, task.id) is TaskStatus[target]
