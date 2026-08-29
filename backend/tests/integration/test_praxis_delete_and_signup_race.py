"""Two production bugs that both came down to "the database was not asked to help".

**Dropping a task.** Every FK into ``praxis.id`` was NO ACTION, so
``DELETE /praxes/{id}`` failed the moment anything hung off the praxis — in two
different ways depending on whether the session had the child loaded. Both are
covered here in one delete, because a fix for one does not imply the other:

* ``media_item`` is eagerly loaded by ``get_praxis`` for the detail view and has
  no ``delete-orphan`` cascade, so SQLAlchemy tried to *de-associate* it —
  ``UPDATE media_item SET praxis_id = NULL`` into a NOT NULL column. This is the
  reported bug: a raw asyncpg not-null violation shown to the player, and the
  drop silently not happening.
* ``vote`` is ``lazy='raise'`` and never loaded, so Postgres refused the parent
  DELETE outright with a foreign-key violation.

**Signing up twice.** The "already an active member of this task" gate is a read
followed by a write with nothing in the schema behind it. In production one tap
on a phone fired four requests 2–100ms apart and created four praxes on one task,
because all four ran the check before any of them committed.
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
    """Point the media pipeline at a throwaway directory."""
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
    """The praxis and both kinds of child row go, and the player gets a 204."""
    create_response = await client.post(
        "/praxes",
        json={"task_id": active_task.id, "type": "solo", "title": "Drop me"},
        headers=auth_headers,
    )
    assert create_response.status_code == 201, create_response.text
    praxis_id = create_response.json()["id"]

    # The loaded-child failure mode: media, through the real upload route.
    upload_response = await client.post(
        f"/praxes/{praxis_id}/media",
        files={"file": ("IMG_0951.jpg", _jpeg_bytes(), "image/jpeg")},
        headers=auth_headers,
    )
    assert upload_response.status_code == 201, upload_response.text

    # The unloaded-child failure mode. Written straight to the session rather
    # than through the vote service, which would first require submitting the
    # praxis — and a submitted praxis cannot be dropped at all. Unsubmitting
    # preserves votes, so this state is reachable in the app.
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
    """A signup takes the advisory lock for its transaction, keyed on the character.

    What this asserts is that the lock is *taken* and *correctly keyed* — that
    a second signup by this character would have to wait, and that a signup by
    anyone else would not. It deliberately does not assert that Postgres blocks
    on a held lock; that is Postgres's job, not this codebase's.

    A genuinely concurrent version is not possible here: the whole suite shares
    one connection inside one transaction (see ``conftest``), and advisory locks
    are re-entrant within a transaction, so two "concurrent" signups would both
    sail through and prove nothing.
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


# ---------------------------------------------------------------------------
# Dropping a duel side (#1831)
# ---------------------------------------------------------------------------
#
# The praxis-child FKs above all cascade. The two duel FKs deliberately do not
# — ``models/praxis.py`` and migration 0006 both say why: a duel is a contract
# between two players, not a part of either side, so the database refuses the
# delete rather than letting the duel vanish with it.
#
# That refusal was reachable from the UI. ``useEditPraxis``' ``cancel``
# branched only on collab-vs-not, and a duel side is stored ``type='solo'``
# with a ``duel_id`` (ADR-0011) — so "drop task" handed every duellist the
# plain delete, which the database threw out as a generic 409 after a dialog
# promising the draft was already gone.
#
# #1831 first ruled the fix as "dissolve the challenge, then delete",
# frontend-only. That alone does not work: ``cancel_duel_challenge`` only sets
# ``status='declined'`` and never clears ``duel.challenger_praxis_id`` — nor can
# it, the column is ``nullable=False``. The row still referenced the praxis after
# the cancel and the DELETE was refused exactly as before, which made the bug
# wider than the issue's title: ANY praxis that had ever carried a challenge
# could never be dropped again, however the duel ended.
#
# Owner ruling (2026-08-15): the *declined* row goes with the praxis; a duel that
# reached a result keeps refusing the delete. The reasoning and the exact
# predicate live on ``services.praxis_duel.discard_dissolved_duels_for_praxis``.
# Both halves are pinned below — the dissolve-then-drop sequence the composer's
# ``cancel`` runs, and the settled duel that still refuses.


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
    """Stage one: the challenge is out, nobody has answered it.

    The whole sequence the composer's ``cancel`` runs, in order: dissolve, then
    delete. Both halves must land — a 409 on the delete after a 200 on the cancel
    would leave the challenge irreversibly dissolved *and* the draft still there,
    which is strictly worse than the original refusal.
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

    # The dissolved challenge goes with the praxis (owner ruling, 2026-08-15):
    # it never became votable and never froze an outcome, so there is no history
    # in it to keep. Nothing else could read it either — the row would be
    # unreachable from every surface the moment its challenger praxis vanished.
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
    """Stage two: the challenge was accepted, so the opponent has a real praxis.

    This is the half the confirm dialog has to promise correctly. Dropping your
    side at compose stage is NOT a forfeit — forfeiting exists only at
    ``settled`` (ADR-0011 §Forfeit) — so the opponent keeps their draft, keeps
    their stats, and simply stops being in a duel.
    """
    # character2 is level 5 from the fixture; character needs the duel gate met
    # before they can accept.
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

    # The opponent's side survives, unpenalised, and reads as an ordinary solo:
    # `get_duel_for_praxis` excludes `declined`, so `duel_id` comes back null
    # and no mode chip or duel band renders on it (#992).
    opponent_view = await client.get(
        f"/praxes/{opponent_praxis_id}", headers=auth_headers
    )
    assert opponent_view.status_code == 200, opponent_view.text
    assert opponent_view.json()["type"] == PraxisType.solo.value
    assert opponent_view.json()["duel_id"] is None

    # …and the dissolved contract went with the dropped draft, exactly as in the
    # pending case: an accepted-then-cancelled duel never became votable either.
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
    """The other side of the ruling: a duel that reached a result is not droppable.

    Reachable, and the only way a *settled* duel's side is ever in_progress again:
    unsubmitting a settled side forfeits the contest (ADR-0011 §Forfeit) and
    reopens the praxis for editing. The duel stays ``settled`` with a winner by
    default, so there is no route to ``declined`` — the cancel is refused — and
    the draft stays undroppable. If this ever starts returning 204, a real
    contest's record can be destroyed by the loser.
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

    # A settled duel cannot be dissolved, so the declined escape hatch is shut.
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
    """The FK refusal itself, pinned so the cancel step cannot be called redundant.

    ``delete_praxis`` discards only *declined* duels; a live one it leaves alone,
    and the guard is then the database (``duel.challenger_praxis_id`` is NO
    ACTION), surfacing through ``main.integrity_error_handler`` as a generic 409.
    So the composer must still dissolve the challenge before dropping the draft.
    If a future migration ever let this cascade, a live duel would silently
    vanish with one player's draft, and this assertion is what would notice.

    The failed flush aborts the SAVEPOINT this test shares with the client, so
    nothing may touch the session afterwards — the assertion is deliberately
    the last statement in the test.
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
