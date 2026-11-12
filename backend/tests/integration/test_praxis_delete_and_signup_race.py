"""Two bugs where the database was not asked to help.

Dropping a task: FKs into ``praxis.id`` were NO ACTION. Eager-loaded
``media_item`` got de-associated (NOT NULL violation); unloaded ``vote`` hit an
FK violation. One delete covers both. Signing up twice: one phone tap fired four
requests and made four praxes, since the active-member check had no lock.
"""

import io

import pytest
from httpx import AsyncClient
from PIL import Image
from sqlalchemy import func, select, text
from sqlalchemy.ext.asyncio import AsyncSession

from models.account import Account
from models.character import Character
from models.character_stats import CharacterStats
from models.duel import Duel, DuelStatus
from models.praxis import MediaItem, Praxis, PraxisType
from models.task import Task
from models.vote import Vote
from services import media as media_service
from services.praxis import _SIGNUP_LOCK_NAMESPACE


@pytest.fixture(autouse=True)
def media_root(tmp_path, monkeypatch):
    monkeypatch.setattr(media_service.settings, "MEDIA_ROOT", str(tmp_path))
    return tmp_path


def _jpeg_bytes() -> bytes:
    image = Image.new("RGB", (16, 16), color=(10, 120, 200))
    buffer = io.BytesIO()
    image.save(buffer, format="JPEG")
    return buffer.getvalue()


@pytest.mark.asyncio
async def test_drop_a_task_that_has_media_and_a_vote_on_it(
    client: AsyncClient,
    character: Character,
    account: Account,
    active_task: Task,
    auth_headers: dict,
    db_session: AsyncSession,
):
    create_response = await client.post(
        "/praxes",
        json={"task_id": active_task.id, "type": "solo", "title": "Drop me"},
        headers=auth_headers,
    )
    assert create_response.status_code == 201, create_response.text
    praxis_id = create_response.json()["id"]

    # Loaded-child failure mode: media, through the real upload route.
    upload_response = await client.post(
        f"/praxes/{praxis_id}/media",
        files={"file": ("IMG_0951.jpg", _jpeg_bytes(), "image/jpeg")},
        headers=auth_headers,
    )
    assert upload_response.status_code == 201, upload_response.text

    # Unloaded-child failure mode, written directly: the vote service needs a
    # submitted praxis, which can't be dropped. Reachable via unsubmit.
    db_session.add(
        Vote(
            praxis_id=praxis_id,
            voter_character_id=character.id,
            voter_account_id=account.id,
            value=3,
        )
    )
    await db_session.flush()

    delete_response = await client.delete(f"/praxes/{praxis_id}", headers=auth_headers)
    assert delete_response.status_code == 204, delete_response.text

    assert await db_session.get(Praxis, praxis_id) is None
    assert await db_session.scalar(
        select(func.count()).select_from(MediaItem).where(MediaItem.praxis_id == praxis_id)
    ) == 0
    assert await db_session.scalar(
        select(func.count()).select_from(Vote).where(Vote.praxis_id == praxis_id)
    ) == 0


@pytest.mark.asyncio
async def test_signing_up_holds_a_lock_keyed_on_the_character(
    client: AsyncClient,
    character: Character,
    character2: Character,
    active_task: Task,
    auth_headers: dict,
    db_connection,
):
    """A signup takes an advisory xact lock keyed on the character.

    Asserts the lock is taken and keyed, not that Postgres blocks: the suite
    shares one transaction and advisory locks are re-entrant within it.
    """
    response = await client.post(
        "/praxes",
        json={"task_id": active_task.id, "type": "solo", "title": "Lock me"},
        headers=auth_headers,
    )
    assert response.status_code == 201, response.text

    # `pg_try_advisory_xact_lock` never waits: False means someone else holds it.
    probe = text("SELECT pg_try_advisory_xact_lock(:namespace, :key)")

    async with db_connection.engine.connect() as other_connection:
        held_by_signup = await other_connection.scalar(
            probe, {"namespace": _SIGNUP_LOCK_NAMESPACE, "key": character.id}
        )
        assert held_by_signup is False, (
            "create_praxis did not hold the signup lock — concurrent signups can "
            "each read 'not yet a member' and each insert one"
        )

        free_for_others = await other_connection.scalar(
            probe, {"namespace": _SIGNUP_LOCK_NAMESPACE, "key": character2.id}
        )
        assert free_for_others is True, (
            "the lock is not keyed on the character — one player signing up "
            "would serialise every other player's signups too"
        )


# Dropping a duel side (#1831). The duel FKs deliberately do not cascade (see
# models/praxis.py). ``cancel_duel_challenge`` only sets ``declined`` and cannot
# clear ``challenger_praxis_id`` (NOT NULL), so ``delete_praxis`` discards
# declined duels; a duel with a result still refuses. Predicate and rationale:
# ``services.praxis_duel.discard_dissolved_duels_for_praxis``.


async def _duel_side(client: AsyncClient, headers: dict, task_id: int, opponent_id: int):
    """Sign up solo and attach a duel challenge to it. Returns (praxis_id, duel_id)."""
    create = await client.post(
        "/praxes",
        json={"task_id": task_id, "type": "solo", "title": "Duel me"},
        headers=headers,
    )
    assert create.status_code == 201, create.text
    praxis_id = create.json()["id"]
    challenge = await client.post(
        "/duels/challenge",
        json={"challenger_praxis_id": praxis_id, "opponent_character_id": opponent_id},
        headers=headers,
    )
    assert challenge.status_code == 201, challenge.text
    return praxis_id, challenge.json()["id"]


@pytest.mark.asyncio
async def test_dropping_a_pending_duel_side_dissolves_the_challenge_then_deletes(
    client: AsyncClient,
    character: Character,
    character2: Character,
    active_task: Task,
    auth_headers2: dict,
    db_session: AsyncSession,
):
    """Pending challenge: the composer's ``cancel`` dissolves, then deletes.

    A 409 after the cancel would leave the challenge dissolved and the draft there.
    """
    praxis_id, duel_id = await _duel_side(
        client, auth_headers2, active_task.id, character.id
    )

    cancel = await client.post(f"/duels/{duel_id}/cancel", headers=auth_headers2)
    assert cancel.status_code == 200, cancel.text
    assert cancel.json()["status"] == "declined"

    delete = await client.delete(f"/praxes/{praxis_id}", headers=auth_headers2)
    assert delete.status_code == 204, delete.text
    assert await db_session.get(Praxis, praxis_id) is None

    # The dissolved challenge goes with the praxis: no history in it to keep.
    assert await db_session.get(Duel, duel_id) is None


@pytest.mark.asyncio
async def test_dropping_an_active_duel_side_leaves_the_opponent_a_plain_solo(
    client: AsyncClient,
    character: Character,
    character2: Character,
    active_task: Task,
    auth_headers: dict,
    auth_headers2: dict,
    db_session: AsyncSession,
):
    """Accepted challenge: dropping at compose stage is not a forfeit.

    The opponent keeps their draft and stats and stops being in a duel
    (forfeit exists only at ``settled``, ADR-0011).
    """
    # character needs the duel level gate met before accepting.
    stats = await db_session.scalar(
        select(CharacterStats).where(CharacterStats.character_id == character.id)
    )
    stats.level = 2
    await db_session.commit()

    praxis_id, duel_id = await _duel_side(
        client, auth_headers2, active_task.id, character.id
    )
    accept = await client.post(
        f"/duels/{duel_id}/respond", json={"accept": True}, headers=auth_headers
    )
    assert accept.status_code == 200, accept.text

    duel = await db_session.get(Duel, duel_id)
    await db_session.refresh(duel)
    assert duel.status is DuelStatus.active
    opponent_praxis_id = duel.opponent_praxis_id
    assert opponent_praxis_id is not None

    cancel = await client.post(f"/duels/{duel_id}/cancel", headers=auth_headers2)
    assert cancel.status_code == 200, cancel.text

    delete = await client.delete(f"/praxes/{praxis_id}", headers=auth_headers2)
    assert delete.status_code == 204, delete.text
    assert await db_session.get(Praxis, praxis_id) is None

    # `get_duel_for_praxis` excludes `declined`, so the survivor reads as solo.
    opponent_view = await client.get(
        f"/praxes/{opponent_praxis_id}", headers=auth_headers
    )
    assert opponent_view.status_code == 200, opponent_view.text
    assert opponent_view.json()["type"] == PraxisType.solo.value
    assert opponent_view.json()["duel_id"] is None

    assert await db_session.get(Duel, duel_id) is None


@pytest.mark.asyncio
async def test_a_settled_duel_still_refuses_the_delete_after_a_forfeit(
    client: AsyncClient,
    character: Character,
    character2: Character,
    active_task: Task,
    auth_headers: dict,
    auth_headers2: dict,
    db_session: AsyncSession,
):
    """A settled duel's side (reopened by forfeit) stays undroppable.

    A 204 here would let the loser destroy a real contest's record.
    """
    stats = await db_session.scalar(
        select(CharacterStats).where(CharacterStats.character_id == character.id)
    )
    stats.level = 2
    await db_session.commit()

    praxis_id, duel_id = await _duel_side(
        client, auth_headers2, active_task.id, character.id
    )
    accept = await client.post(
        f"/duels/{duel_id}/respond", json={"accept": True}, headers=auth_headers
    )
    assert accept.status_code == 200, accept.text
    opponent_praxis_id = accept.json()["opponent_praxis_id"]

    for praxis, headers in ((praxis_id, auth_headers2), (opponent_praxis_id, auth_headers)):
        submit = await client.post(f"/praxes/{praxis}/submit", headers=headers)
        assert submit.status_code == 200, submit.text

    duel = await db_session.get(Duel, duel_id)
    await db_session.refresh(duel)
    assert duel.status is DuelStatus.settled

    # Forfeit: reopening a settled side is the one door back to in_progress.
    unsubmit = await client.post(
        f"/praxes/{praxis_id}/unsubmit", headers=auth_headers2
    )
    assert unsubmit.status_code == 200, unsubmit.text

    # A settled duel cannot be dissolved.
    cancel = await client.post(f"/duels/{duel_id}/cancel", headers=auth_headers2)
    assert cancel.status_code == 400, cancel.text

    # Last statement: the failed flush aborts the shared SAVEPOINT.
    delete = await client.delete(f"/praxes/{praxis_id}", headers=auth_headers2)
    assert delete.status_code == 409, (
        "a duel that reached a result keeps its Duel row and keeps refusing the "
        "delete — only a *declined* challenge goes with the praxis (#1831)"
    )


@pytest.mark.asyncio
async def test_deleting_a_duel_side_without_dissolving_the_duel_is_refused(
    client: AsyncClient,
    character: Character,
    character2: Character,
    active_task: Task,
    auth_headers2: dict,
):
    """The FK refusal itself, so the cancel step cannot be called redundant.

    A live duel is guarded by NO ACTION on ``challenger_praxis_id`` (generic 409).
    If a migration let it cascade, a live duel would vanish with a draft.
    The failed flush aborts the shared SAVEPOINT, so the assert is last.
    """
    praxis_id, _duel_id = await _duel_side(
        client, auth_headers2, active_task.id, character.id
    )

    delete = await client.delete(f"/praxes/{praxis_id}", headers=auth_headers2)
    assert delete.status_code == 409, (
        "the duel FKs are meant to refuse this delete — if it now succeeds, the "
        "NO ACTION guard in migration 0006 has been weakened and a duel can be "
        "destroyed by one side dropping their task"
    )
