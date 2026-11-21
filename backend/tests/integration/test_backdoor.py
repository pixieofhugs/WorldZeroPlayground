"""#3848: a ``backdoor`` task is hidden from everyone but admins, members and
the faction that ``reads_the_array``, and only while its door is open."""

from datetime import datetime, timedelta, timezone

import pytest
from fastapi import HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from errors import ErrorCode
from faction_slugs import real_faction_slugs
from game_config import CURRENT_ERA
from models.character import Character
from models.duel import Duel, DuelStatus
from models.era import Era
from models.faction import Faction
from models.praxis import PraxisStatus
from models.task import Task, TaskStatus
from services.auth import create_jwt
from services.backdoor import door_open, door_open_clause
from services.duel import respond_to_duel_challenge
from services.era import retire_board_at_era_close
from services.signup_eligibility import task_status_closed
from services.task import list_tasks
from tests.integration.factories import (
    DEFAULT_FACTION_SLUG,
    make_admin,
    make_character,
    make_solo_praxis,
    make_task,
)

READER_SLUG = next(
    s
    for s in sorted(real_faction_slugs(CURRENT_ERA))
    if CURRENT_ERA.factions[s].reads_the_array
)
HOUR = timedelta(hours=1)
LEVEL = max(
    CURRENT_ERA.collaboration_level_required, CURRENT_ERA.comment_level_required
)


def _now() -> datetime:
    return datetime.now(timezone.utc)


def _headers(character: Character) -> dict:
    return {"Authorization": f"Bearer {create_jwt(character.account_id)}"}


async def _door(
    db, creator, *, opens=-HOUR, closes=None, status=TaskStatus.backdoor, **kw
) -> Task:
    task = await make_task(db, creator, status=status, **kw)
    task.backdoor_opens_at = _now() + opens
    task.backdoor_closes_at = None if closes is None else _now() + closes
    await db.commit()
    await db.refresh(task)
    return task


@pytest.fixture
async def reader(
    db_session: AsyncSession, era: Era, some_faction: Faction
) -> Character:
    if await db_session.get(Faction, READER_SLUG) is None:
        db_session.add(Faction(slug=READER_SLUG))
        await db_session.flush()
    c = await make_character(
        db_session, era, username="reader", faction_slug=READER_SLUG, level=LEVEL
    )
    await db_session.commit()
    return c


def test_the_default_faction_does_not_read_the_array():
    assert not CURRENT_ERA.factions[DEFAULT_FACTION_SLUG].reads_the_array


async def _ids(client, query, headers) -> set[int]:
    r = await client.get(f"/tasks{query}", headers=headers)
    assert r.status_code == 200, r.text
    return {row["id"] for row in r.json()}


@pytest.mark.asyncio
async def test_no_list_shows_a_backdoor_to_a_non_admin(
    client, character, reader, db_session
):
    door = await _door(db_session, character)
    for who in (_headers(character), _headers(reader)):
        for q in (
            "",
            "?status=backdoor",
            "?status=all&task_type=all",
            f"?created_by={character.id}",
        ):
            assert door.id not in await _ids(client, q, who), q


@pytest.mark.asyncio
async def test_detail_follows_the_window_and_the_viewer(
    client, account, character, character2, reader, db_session
):
    door = await _door(db_session, character)
    later = await _door(db_session, character, opens=HOUR, title="later")

    assert (
        await client.get(f"/tasks/{door.id}", headers=_headers(character2))
    ).status_code == 404
    assert (await client.get(f"/tasks/{door.id}")).status_code == 404
    got = await client.get(f"/tasks/{door.id}", headers=_headers(reader))
    assert got.status_code == 200
    assert (
        await client.get(f"/tasks/{later.id}", headers=_headers(reader))
    ).status_code == 404

    await make_solo_praxis(db_session, door, character2)
    await db_session.commit()
    assert (
        await client.get(f"/tasks/{door.id}", headers=_headers(character2))
    ).status_code == 200

    await make_admin(db_session, account)
    assert (
        await client.get(f"/tasks/{later.id}", headers=_headers(character))
    ).status_code == 200


@pytest.mark.asyncio
async def test_discovery_endpoint(client, character, reader, db_session):
    door = await _door(db_session, character, point_value=20, title="Hush")
    await _door(db_session, character, opens=HOUR, title="later")
    await _door(db_session, character, opens=-2 * HOUR, closes=-HOUR, title="gone")

    assert (
        await client.get("/tasks/backdoor", headers=_headers(character))
    ).json() == []
    assert (await client.get("/tasks/backdoor")).json() == []
    rows = (await client.get("/tasks/backdoor", headers=_headers(reader))).json()
    assert [
        (r["id"], r["title"], r["point_value"], r["level_required"]) for r in rows
    ] == [(door.id, "Hush", 20, 0)]
    assert set(rows[0]) == {
        "id",
        "title",
        "point_value",
        "level_required",
        "backdoor_opens_at",
    }


@pytest.mark.asyncio
async def test_closed_door_settles_to_retired_on_read(
    client, character, reader, db_session
):
    gone = await _door(db_session, character, opens=-2 * HOUR, closes=-HOUR)
    got = await client.get(f"/tasks/{gone.id}", headers=_headers(character))
    assert got.status_code == 200
    assert got.json()["status"] == "retired"
    assert got.json()["backdoor_opens_at"] is None
    await db_session.refresh(gone)
    assert gone.status is TaskStatus.retired
    assert gone.backdoor_closes_at is None
    archived = await list_tasks(
        db_session, status="retired", viewer=character, skip_level_check=True
    )
    assert gone.id in {t.id for t in archived}


@pytest.mark.asyncio
async def test_signup_solo_and_collab_for_reader_only(
    client, character, reader, db_session
):
    door = await _door(db_session, character)
    r = await client.post(
        "/praxes", json={"task_id": door.id, "type": "solo"}, headers=_headers(reader)
    )
    assert r.status_code == 201, r.text

    out = await client.post(
        "/praxes",
        json={"task_id": door.id, "type": "solo"},
        headers=_headers(character),
    )
    assert out.status_code == 404
    assert out.json()["detail"]["code"] == ErrorCode.task_not_found.value
    assert "backdoor" not in out.text

    scheduled = await _door(db_session, character, opens=HOUR, title="later")
    early = await client.post(
        "/praxes",
        json={"task_id": scheduled.id, "type": "solo"},
        headers=_headers(reader),
    )
    assert early.status_code == 404


@pytest.mark.asyncio
async def test_duel_acceptance_refused_as_not_found(
    db_session, character, character2, reader, era
):
    door = await _door(db_session, reader)
    mine = await make_solo_praxis(
        db_session, door, reader, status=PraxisStatus.in_progress
    )
    duel = Duel(
        task_id=door.id,
        challenger_praxis_id=mine.id,
        opponent_character_id=character2.id,
        status=DuelStatus.pending,
    )
    db_session.add(duel)
    await db_session.commit()
    with pytest.raises(HTTPException) as err:
        await respond_to_duel_challenge(duel.id, character2.id, True, db_session)
    assert err.value.status_code == 404
    assert err.value.detail["code"] == ErrorCode.task_not_found.value


@pytest.mark.asyncio
async def test_python_and_sql_door_open_agree(db_session, character, reader):
    now = _now()
    cases = [
        (-HOUR, None),
        (HOUR, None),
        (-2 * HOUR, -HOUR),
        (-HOUR, HOUR),
    ]
    tasks = [
        await _door(db_session, character, opens=o, closes=c, title=f"t{i}")
        for i, (o, c) in enumerate(cases)
    ]
    other = await make_task(db_session, character, title="plain", commit=True)
    sql = set(await db_session.scalars(select(Task.id).where(door_open_clause(now))))
    assert {t.id for t in [*tasks, other] if door_open(t, now)} == sql
    assert sql == {tasks[0].id, tasks[3].id}


@pytest.mark.asyncio
async def test_signup_gate_python_and_sql_agree(db_session, character, reader):
    door = await _door(db_session, character)
    for who in (character, reader):
        in_sql = door.id in {
            t.id
            for t in await list_tasks(
                db_session,
                status="backdoor",
                viewer=who,
                can_sign_up=True,
                is_admin=True,
                skip_level_check=True,
                task_type="all",
            )
        }
        assert in_sql == (not task_status_closed(door, who)), who.username


@pytest.mark.asyncio
async def test_collab_invitee_keeps_the_task_and_praxis_after_host_leaves(
    client, character, character2, reader, db_session
):
    door = await _door(db_session, character)
    created = await client.post(
        "/praxes",
        json={"task_id": door.id, "type": "collab", "title": "x"},
        headers=_headers(reader),
    )
    pid = created.json()["id"]
    inv = await client.post(
        f"/praxes/{pid}/invite",
        json={"invitee_id": character2.id},
        headers=_headers(reader),
    )
    assert inv.status_code == 200, inv.text
    ok = await client.post(
        f"/praxes/{pid}/invite/{inv.json()['id']}/respond",
        json={"accept": True},
        headers=_headers(character2),
    )
    assert ok.status_code == 200, ok.text
    left = await client.post(f"/praxes/{pid}/leave", headers=_headers(reader))
    assert left.status_code == 200, left.text

    assert (
        await client.get(f"/tasks/{door.id}", headers=_headers(character2))
    ).status_code == 200
    assert (
        await client.get(f"/praxes/{pid}", headers=_headers(character2))
    ).status_code == 200


@pytest.mark.asyncio
async def test_admin_window_validation_and_leaving_clears_dates(
    client, account, character, db_session
):
    await make_admin(db_session, account)
    task = await make_task(db_session, character, commit=True)
    h = _headers(character)
    t = _now()
    bad = await client.put(
        f"/admin/tasks/{task.id}/status",
        json={
            "status": "backdoor",
            "backdoor_opens_at": t.isoformat(),
            "backdoor_closes_at": t.isoformat(),
        },
        headers=h,
    )
    assert bad.status_code == 422
    assert bad.json()["detail"]["code"] == ErrorCode.backdoor_window_invalid.value

    ok = await client.put(
        f"/admin/tasks/{task.id}/status",
        json={"status": "backdoor", "backdoor_closes_at": (t + HOUR).isoformat()},
        headers=h,
    )
    assert ok.status_code == 200, ok.text
    assert ok.json()["backdoor_opens_at"] and ok.json()["backdoor_closes_at"]

    edit = await client.patch(
        f"/admin/tasks/{task.id}",
        json={"point_value": 99, "backdoor_closes_at": (t - HOUR).isoformat()},
        headers=h,
    )
    assert edit.status_code == 422

    back = await client.put(
        f"/admin/tasks/{task.id}/status", json={"status": "retired"}, headers=h
    )
    assert back.json()["backdoor_opens_at"] is None
    assert back.json()["backdoor_closes_at"] is None


@pytest.mark.asyncio
async def test_era_close_retires_a_backdoor(db_session, character):
    door = await _door(db_session, character)
    await retire_board_at_era_close(db_session)
    await db_session.refresh(door)
    assert door.status is TaskStatus.retired


@pytest.mark.asyncio
async def test_a_backdoor_is_not_announced_or_commentable(
    client, character, reader, db_session
):
    door = await _door(db_session, character, title="Whisper")
    feed = await client.get("/activity-feed", headers=_headers(reader))
    assert "Whisper" not in feed.text
    c = await client.post(
        f"/tasks/{door.id}/comments", json={"body_text": "hi"}, headers=_headers(reader)
    )
    assert c.status_code == 403
    assert c.json()["detail"]["code"] == ErrorCode.task_not_open_for_comments.value
