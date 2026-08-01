"""Nudging a collaborator or duel rival (#1083).

The three rules are the feature, so they are what this file pins:

1. **Collab** — a member who has cast may nudge a member who has not. A member
   who has not cast may not, and a non-member may not at all.
2. **Duel** — a participant may nudge the rival while the duel is ``active``,
   and nobody else may. ``pending`` and ``settled`` are both refused.
3. **Rate limit** — one per sender → recipient → praxis per 24h, 422 on a
   repeat, and the button's disabled state (``nudged_at``) comes back from the
   server so a reload cannot un-nudge it.

Plus the delivery check the issue leads with: the nudge lands in the
RECIPIENT's activity feed, not in a message nobody reads.
"""
from datetime import datetime, timedelta, timezone

import pytest
from sqlalchemy import select, update
from sqlalchemy.ext.asyncio import AsyncSession

from models.character import Character
from models.duel import Duel, DuelStatus
from models.nudge import Nudge
from models.praxis import (
    ModerationStatus,
    Praxis,
    PraxisMember,
    PraxisStatus,
    PraxisType,
)
from models.task import Task


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------


async def _set_cast(
    session: AsyncSession, praxis_id: int, character_id: int, cast: bool
) -> None:
    """Mark one member's part filed / not filed."""
    await session.execute(
        update(PraxisMember)
        .where(
            PraxisMember.praxis_id == praxis_id,
            PraxisMember.character_id == character_id,
        )
        .values(
            has_submitted=cast,
            submitted_at=datetime.now(timezone.utc) if cast else None,
        )
    )
    await session.commit()


async def _backdate_nudges(session: AsyncSession, delta: timedelta) -> None:
    """Age every stored nudge, so the 24h window can be crossed without sleeping."""
    result = await session.execute(select(Nudge))
    for nudge in result.scalars().all():
        nudge.created_at = datetime.now(timezone.utc) - delta
    await session.commit()


async def _make_duel(
    session: AsyncSession,
    task: Task,
    challenger: Character,
    opponent: Character,
    status: DuelStatus,
    *,
    opponent_submitted: bool = False,
    challenger_submitted: bool = True,
) -> tuple[Duel, Praxis, Praxis]:
    """Two linked solo praxes + the Duel row (ADR-0011).

    Built directly rather than through the challenge/accept routes: what is under
    test is the nudge gate at each duel status, not how a duel gets there.
    """

    def _side(character: Character, submitted: bool) -> Praxis:
        return Praxis(
            task_id=task.id,
            created_by_id=character.id,
            type=PraxisType.solo,
            status=PraxisStatus.submitted if submitted else PraxisStatus.in_progress,
            moderation_status=ModerationStatus.visible,
            title="side",
            body_text="proof",
        )

    challenger_praxis = _side(challenger, challenger_submitted)
    opponent_praxis = _side(opponent, opponent_submitted)
    session.add_all([challenger_praxis, opponent_praxis])
    await session.flush()

    session.add_all(
        [
            PraxisMember(
                praxis_id=challenger_praxis.id,
                character_id=challenger.id,
                has_submitted=challenger_submitted,
            ),
            PraxisMember(
                praxis_id=opponent_praxis.id,
                character_id=opponent.id,
                has_submitted=opponent_submitted,
            ),
        ]
    )

    duel = Duel(
        task_id=task.id,
        challenger_praxis_id=challenger_praxis.id,
        opponent_character_id=opponent.id,
        # A pending duel has no opponent side yet — that is the whole reason
        # `pending` cannot be nudged.
        opponent_praxis_id=(
            opponent_praxis.id if status != DuelStatus.pending else None
        ),
        status=status,
    )
    session.add(duel)
    await session.commit()
    await session.refresh(duel)
    return duel, challenger_praxis, opponent_praxis


# ---------------------------------------------------------------------------
# Delivery — the feed, not an inbox
# ---------------------------------------------------------------------------


@pytest.mark.asyncio
async def test_nudge_lands_in_the_recipients_feed(
    client,
    db_session: AsyncSession,
    praxis_collab: Praxis,
    character: Character,
    character2: Character,
    auth_headers: dict,
    auth_headers2: dict,
) -> None:
    """The headline check: nudge → the recipient sees it in their activity feed."""
    await _set_cast(db_session, praxis_collab.id, character.id, True)

    response = await client.post(
        f"/praxes/{praxis_collab.id}/nudge/{character2.id}", headers=auth_headers
    )
    assert response.status_code == 200, response.text
    body = response.json()
    assert body["from_character_id"] == character.id
    assert body["to_character_id"] == character2.id
    assert body["praxis_id"] == praxis_collab.id

    feed = await client.get("/activity-feed", headers=auth_headers2)
    assert feed.status_code == 200
    nudges = [item for item in feed.json()["items"] if item["type"] == "nudge"]
    assert len(nudges) == 1
    assert nudges[0]["actor_display_name"] == character.display_name
    assert nudges[0]["payload"]["praxis_id"] == praxis_collab.id
    assert nudges[0]["payload"]["task_title"] == "Test Task"


@pytest.mark.asyncio
async def test_the_sender_does_not_see_their_own_nudge(
    client,
    db_session: AsyncSession,
    praxis_collab: Praxis,
    character: Character,
    character2: Character,
    auth_headers: dict,
) -> None:
    """A nudge is a thing that happened TO you, so it is one-directional."""
    await _set_cast(db_session, praxis_collab.id, character.id, True)
    await client.post(
        f"/praxes/{praxis_collab.id}/nudge/{character2.id}", headers=auth_headers
    )

    feed = await client.get("/activity-feed", headers=auth_headers)
    assert [item for item in feed.json()["items"] if item["type"] == "nudge"] == []


# ---------------------------------------------------------------------------
# Rule 3 — the rate limit (a safety control, not a nicety)
# ---------------------------------------------------------------------------


@pytest.mark.asyncio
async def test_second_nudge_inside_24h_is_refused(
    client,
    db_session: AsyncSession,
    praxis_collab: Praxis,
    character: Character,
    character2: Character,
    auth_headers: dict,
) -> None:
    await _set_cast(db_session, praxis_collab.id, character.id, True)

    first = await client.post(
        f"/praxes/{praxis_collab.id}/nudge/{character2.id}", headers=auth_headers
    )
    assert first.status_code == 200

    second = await client.post(
        f"/praxes/{praxis_collab.id}/nudge/{character2.id}", headers=auth_headers
    )
    assert second.status_code == 422, second.text

    # And it wrote nothing — a refused poke must not extend the window either.
    stored = (await db_session.execute(select(Nudge))).scalars().all()
    assert len(stored) == 1


@pytest.mark.asyncio
async def test_the_window_reopens_after_24h(
    client,
    db_session: AsyncSession,
    praxis_collab: Praxis,
    character: Character,
    character2: Character,
    auth_headers: dict,
) -> None:
    await _set_cast(db_session, praxis_collab.id, character.id, True)
    await client.post(
        f"/praxes/{praxis_collab.id}/nudge/{character2.id}", headers=auth_headers
    )

    await _backdate_nudges(db_session, timedelta(days=1, hours=1))

    again = await client.post(
        f"/praxes/{praxis_collab.id}/nudge/{character2.id}", headers=auth_headers
    )
    assert again.status_code == 200, again.text


@pytest.mark.asyncio
async def test_the_limit_is_per_recipient_not_per_sender(
    client,
    db_session: AsyncSession,
    praxis_collab: Praxis,
    character: Character,
    character2: Character,
    character3: Character,
    auth_headers: dict,
) -> None:
    """Two outstanding members are two separate 24h windows."""
    db_session.add(
        PraxisMember(praxis_id=praxis_collab.id, character_id=character3.id)
    )
    await db_session.commit()
    await _set_cast(db_session, praxis_collab.id, character.id, True)

    first = await client.post(
        f"/praxes/{praxis_collab.id}/nudge/{character2.id}", headers=auth_headers
    )
    second = await client.post(
        f"/praxes/{praxis_collab.id}/nudge/{character3.id}", headers=auth_headers
    )
    assert (first.status_code, second.status_code) == (200, 200)


# ---------------------------------------------------------------------------
# Button state comes from the server (a reload must not un-nudge it)
# ---------------------------------------------------------------------------


@pytest.mark.asyncio
async def test_roster_row_carries_nudged_at_and_it_survives_a_reload(
    client,
    db_session: AsyncSession,
    praxis_collab: Praxis,
    character: Character,
    character2: Character,
    auth_headers: dict,
    auth_headers2: dict,
) -> None:
    await _set_cast(db_session, praxis_collab.id, character.id, True)

    before = await client.get(f"/praxes/{praxis_collab.id}", headers=auth_headers)
    rows = {m["character_id"]: m for m in before.json()["members"]}
    assert rows[character2.id]["nudged_at"] is None

    await client.post(
        f"/praxes/{praxis_collab.id}/nudge/{character2.id}", headers=auth_headers
    )

    # The reload — the whole point of not keeping this in React state.
    after = await client.get(f"/praxes/{praxis_collab.id}", headers=auth_headers)
    rows = {m["character_id"]: m for m in after.json()["members"]}
    assert rows[character2.id]["nudged_at"] is not None
    # Viewer-relative: the recipient has nudged nobody, so their read is clean.
    theirs = await client.get(f"/praxes/{praxis_collab.id}", headers=auth_headers2)
    theirs_rows = {m["character_id"]: m for m in theirs.json()["members"]}
    assert theirs_rows[character.id]["nudged_at"] is None


@pytest.mark.asyncio
async def test_nudged_at_clears_once_the_window_lapses(
    client,
    db_session: AsyncSession,
    praxis_collab: Praxis,
    character: Character,
    character2: Character,
    auth_headers: dict,
) -> None:
    """`nudged_at` means "you may not nudge again yet", so it must expire with it."""
    await _set_cast(db_session, praxis_collab.id, character.id, True)
    await client.post(
        f"/praxes/{praxis_collab.id}/nudge/{character2.id}", headers=auth_headers
    )
    await _backdate_nudges(db_session, timedelta(days=1, hours=1))

    reloaded = await client.get(f"/praxes/{praxis_collab.id}", headers=auth_headers)
    rows = {m["character_id"]: m for m in reloaded.json()["members"]}
    assert rows[character2.id]["nudged_at"] is None


# ---------------------------------------------------------------------------
# Rule 1 — collab authorization
# ---------------------------------------------------------------------------


@pytest.mark.asyncio
async def test_a_member_who_has_not_cast_cannot_nudge(
    client,
    praxis_collab: Praxis,
    character2: Character,
    auth_headers: dict,
) -> None:
    """You do not get to hurry people you have not caught up with."""
    response = await client.post(
        f"/praxes/{praxis_collab.id}/nudge/{character2.id}", headers=auth_headers
    )
    assert response.status_code == 403, response.text


@pytest.mark.asyncio
async def test_a_non_member_cannot_nudge_a_collab(
    client,
    db_session: AsyncSession,
    praxis_collab: Praxis,
    character: Character,
    character2: Character,
    character3: Character,
    auth_headers3: dict,
) -> None:
    """Not the public — even a caster elsewhere is a stranger to this circle."""
    await _set_cast(db_session, praxis_collab.id, character.id, True)
    response = await client.post(
        f"/praxes/{praxis_collab.id}/nudge/{character2.id}", headers=auth_headers3
    )
    assert response.status_code == 403, response.text


@pytest.mark.asyncio
async def test_cannot_nudge_a_member_who_has_already_cast(
    client,
    db_session: AsyncSession,
    praxis_collab: Praxis,
    character: Character,
    character2: Character,
    auth_headers: dict,
) -> None:
    await _set_cast(db_session, praxis_collab.id, character.id, True)
    await _set_cast(db_session, praxis_collab.id, character2.id, True)

    response = await client.post(
        f"/praxes/{praxis_collab.id}/nudge/{character2.id}", headers=auth_headers
    )
    assert response.status_code == 422, response.text


@pytest.mark.asyncio
async def test_cannot_nudge_yourself(
    client,
    db_session: AsyncSession,
    praxis_collab: Praxis,
    character: Character,
    auth_headers: dict,
) -> None:
    await _set_cast(db_session, praxis_collab.id, character.id, True)
    response = await client.post(
        f"/praxes/{praxis_collab.id}/nudge/{character.id}", headers=auth_headers
    )
    assert response.status_code == 400, response.text


@pytest.mark.asyncio
async def test_cannot_nudge_a_stranger_who_is_not_in_the_praxis(
    client,
    db_session: AsyncSession,
    praxis_collab: Praxis,
    character: Character,
    character3: Character,
    auth_headers: dict,
) -> None:
    await _set_cast(db_session, praxis_collab.id, character.id, True)
    response = await client.post(
        f"/praxes/{praxis_collab.id}/nudge/{character3.id}", headers=auth_headers
    )
    assert response.status_code == 403, response.text


@pytest.mark.asyncio
async def test_anonymous_cannot_nudge(
    client, praxis_collab: Praxis, character2: Character
) -> None:
    response = await client.post(f"/praxes/{praxis_collab.id}/nudge/{character2.id}")
    assert response.status_code in (401, 403)


# ---------------------------------------------------------------------------
# Rule 2 — duel authorization
# ---------------------------------------------------------------------------


@pytest.mark.asyncio
async def test_a_duel_participant_may_nudge_the_rival_while_active(
    client,
    db_session: AsyncSession,
    active_task: Task,
    character: Character,
    character2: Character,
    auth_headers: dict,
    auth_headers2: dict,
) -> None:
    _, _, opponent_praxis = await _make_duel(
        db_session, active_task, character, character2, DuelStatus.active
    )

    # The praxis nudged is the RIVAL's side — the one they owe.
    response = await client.post(
        f"/praxes/{opponent_praxis.id}/nudge/{character2.id}", headers=auth_headers
    )
    assert response.status_code == 200, response.text

    feed = await client.get("/activity-feed", headers=auth_headers2)
    nudges = [item for item in feed.json()["items"] if item["type"] == "nudge"]
    assert len(nudges) == 1
    assert nudges[0]["payload"]["praxis_id"] == opponent_praxis.id


@pytest.mark.asyncio
async def test_a_non_participant_cannot_nudge_a_duel_side(
    client,
    db_session: AsyncSession,
    active_task: Task,
    character: Character,
    character2: Character,
    character3: Character,
    auth_headers3: dict,
) -> None:
    _, _, opponent_praxis = await _make_duel(
        db_session, active_task, character, character2, DuelStatus.active
    )
    response = await client.post(
        f"/praxes/{opponent_praxis.id}/nudge/{character2.id}", headers=auth_headers3
    )
    assert response.status_code == 403, response.text


@pytest.mark.asyncio
async def test_a_pending_duel_cannot_be_nudged(
    client,
    db_session: AsyncSession,
    active_task: Task,
    character: Character,
    character2: Character,
    auth_headers: dict,
) -> None:
    """`pending` is live-incomplete too, and is still refused.

    At `pending` the opponent has not accepted, so there is no opponent praxis to
    owe anything — and what IS outstanding is a decision, which already sits in
    their requests tab as a `duel_challenge`.
    """
    _, challenger_praxis, opponent_praxis = await _make_duel(
        db_session, active_task, character, character2, DuelStatus.pending
    )
    response = await client.post(
        f"/praxes/{opponent_praxis.id}/nudge/{character2.id}", headers=auth_headers
    )
    # The un-linked side is not part of any duel as far as the gate can see.
    assert response.status_code == 403, response.text


@pytest.mark.asyncio
async def test_a_settled_duel_cannot_be_nudged(
    client,
    db_session: AsyncSession,
    active_task: Task,
    character: Character,
    character2: Character,
    auth_headers: dict,
) -> None:
    """Once both sides are in there is nothing left to hurry."""
    _, _, opponent_praxis = await _make_duel(
        db_session,
        active_task,
        character,
        character2,
        DuelStatus.settled,
        opponent_submitted=True,
    )
    response = await client.post(
        f"/praxes/{opponent_praxis.id}/nudge/{character2.id}", headers=auth_headers
    )
    assert response.status_code == 422, response.text


@pytest.mark.asyncio
async def test_a_plain_solo_praxis_cannot_be_nudged(
    client,
    db_session: AsyncSession,
    active_task: Task,
    character: Character,
    character2: Character,
    auth_headers: dict,
) -> None:
    """Nobody is waiting on a stranger's private draft (ADR-0024)."""
    praxis = Praxis(
        task_id=active_task.id,
        created_by_id=character2.id,
        type=PraxisType.solo,
        status=PraxisStatus.in_progress,
        moderation_status=ModerationStatus.visible,
    )
    db_session.add(praxis)
    await db_session.flush()
    db_session.add(
        PraxisMember(praxis_id=praxis.id, character_id=character2.id)
    )
    await db_session.commit()

    response = await client.post(
        f"/praxes/{praxis.id}/nudge/{character2.id}", headers=auth_headers
    )
    assert response.status_code == 403, response.text


@pytest.mark.asyncio
async def test_duel_side_carries_nudged_at(
    client,
    db_session: AsyncSession,
    active_task: Task,
    character: Character,
    character2: Character,
    auth_headers: dict,
) -> None:
    duel, _, opponent_praxis = await _make_duel(
        db_session, active_task, character, character2, DuelStatus.active
    )
    await client.post(
        f"/praxes/{opponent_praxis.id}/nudge/{character2.id}", headers=auth_headers
    )

    detail = await client.get(f"/duels/{duel.id}/detail", headers=auth_headers)
    assert detail.status_code == 200, detail.text
    body = detail.json()
    assert body["opponent"]["nudged_at"] is not None
    assert body["challenger"]["nudged_at"] is None


@pytest.mark.asyncio
async def test_duel_rate_limit_is_enforced_too(
    client,
    db_session: AsyncSession,
    active_task: Task,
    character: Character,
    character2: Character,
    auth_headers: dict,
) -> None:
    _, _, opponent_praxis = await _make_duel(
        db_session, active_task, character, character2, DuelStatus.active
    )
    first = await client.post(
        f"/praxes/{opponent_praxis.id}/nudge/{character2.id}", headers=auth_headers
    )
    second = await client.post(
        f"/praxes/{opponent_praxis.id}/nudge/{character2.id}", headers=auth_headers
    )
    assert (first.status_code, second.status_code) == (200, 422)


@pytest.mark.asyncio
async def test_the_duel_status_gate_itself_refuses_pending(
    client,
    db_session: AsyncSession,
    active_task: Task,
    character: Character,
    character2: Character,
    auth_headers: dict,
) -> None:
    """Pin the `status == active` check, not just the missing-opponent-side case.

    The test above proves a realistic pending duel is refused because it has no
    opponent praxis. This one links both sides and *then* sets `pending`, so the
    only thing standing between the sender and a nudge is the status check —
    which is what would silently rot if someone widened the gate to
    `_LIVE_INCOMPLETE_DUEL_STATUSES`.
    """
    duel, _, opponent_praxis = await _make_duel(
        db_session, active_task, character, character2, DuelStatus.active
    )
    duel.status = DuelStatus.pending
    await db_session.commit()

    response = await client.post(
        f"/praxes/{opponent_praxis.id}/nudge/{character2.id}", headers=auth_headers
    )
    assert response.status_code == 422, response.text


# ---------------------------------------------------------------------------
# Bulk nudge — "nudge the crew" (#1415)
# ---------------------------------------------------------------------------


@pytest.mark.asyncio
async def test_bulk_nudge_pokes_every_eligible_member_in_one_call(
    client,
    db_session: AsyncSession,
    praxis_collab: Praxis,
    character: Character,
    character2: Character,
    character3: Character,
    auth_headers: dict,
    auth_headers2: dict,
) -> None:
    """Every member other than the sender who has not submitted gets nudged."""
    db_session.add(
        PraxisMember(praxis_id=praxis_collab.id, character_id=character3.id)
    )
    await db_session.commit()
    await _set_cast(db_session, praxis_collab.id, character.id, True)

    response = await client.post(
        f"/praxes/{praxis_collab.id}/nudge", headers=auth_headers
    )
    assert response.status_code == 200, response.text
    results = {entry["character_id"]: entry for entry in response.json()}
    assert set(results) == {character2.id, character3.id}
    for entry in results.values():
        assert entry["nudge"] is not None
        assert entry["error"] is None
        assert entry["nudge"]["from_character_id"] == character.id

    # Landed in the recipient's feed, same as the single-recipient route.
    feed = await client.get("/activity-feed", headers=auth_headers2)
    nudges = [item for item in feed.json()["items"] if item["type"] == "nudge"]
    assert len(nudges) == 1


@pytest.mark.asyncio
async def test_bulk_nudge_excludes_the_sender_and_already_submitted_members(
    client,
    db_session: AsyncSession,
    praxis_collab: Praxis,
    character: Character,
    character2: Character,
    character3: Character,
    auth_headers: dict,
) -> None:
    """The sender is never a candidate, and neither is a member who already cast."""
    db_session.add(
        PraxisMember(praxis_id=praxis_collab.id, character_id=character3.id)
    )
    await db_session.commit()
    await _set_cast(db_session, praxis_collab.id, character.id, True)
    await _set_cast(db_session, praxis_collab.id, character2.id, True)

    response = await client.post(
        f"/praxes/{praxis_collab.id}/nudge", headers=auth_headers
    )
    assert response.status_code == 200, response.text
    results = {entry["character_id"]: entry for entry in response.json()}
    assert set(results) == {character3.id}


@pytest.mark.asyncio
async def test_bulk_nudge_skips_a_recipient_still_cooling_down_without_failing_the_call(
    client,
    db_session: AsyncSession,
    praxis_collab: Praxis,
    character: Character,
    character2: Character,
    character3: Character,
    auth_headers: dict,
) -> None:
    """Partial success (the whole point): one recipient's cooldown must not
    fail the crew nudge for everyone else."""
    db_session.add(
        PraxisMember(praxis_id=praxis_collab.id, character_id=character3.id)
    )
    await db_session.commit()
    await _set_cast(db_session, praxis_collab.id, character.id, True)

    # character2 is already inside their cooldown window.
    first = await client.post(
        f"/praxes/{praxis_collab.id}/nudge/{character2.id}", headers=auth_headers
    )
    assert first.status_code == 200

    response = await client.post(
        f"/praxes/{praxis_collab.id}/nudge", headers=auth_headers
    )
    assert response.status_code == 200, response.text
    results = {entry["character_id"]: entry for entry in response.json()}
    assert set(results) == {character2.id, character3.id}

    skipped = results[character2.id]
    assert skipped["nudge"] is None
    assert skipped["error"] is not None
    assert skipped["status_code"] == 422

    sent = results[character3.id]
    assert sent["nudge"] is not None
    assert sent["error"] is None

    # And it did not write a second nudge row for the skipped recipient.
    stored = (
        await db_session.execute(
            select(Nudge).where(
                Nudge.from_character_id == character.id,
                Nudge.to_character_id == character2.id,
            )
        )
    ).scalars().all()
    assert len(stored) == 1


@pytest.mark.asyncio
async def test_bulk_nudge_requires_the_sender_to_have_cast_on_a_collab(
    client,
    praxis_collab: Praxis,
    character2: Character,
    auth_headers: dict,
) -> None:
    """The call-wide sender guard still applies — you cannot hurry others
    before filing your own part."""
    response = await client.post(
        f"/praxes/{praxis_collab.id}/nudge", headers=auth_headers
    )
    assert response.status_code == 403, response.text


@pytest.mark.asyncio
async def test_bulk_nudge_refuses_a_non_member(
    client,
    db_session: AsyncSession,
    praxis_collab: Praxis,
    character: Character,
    auth_headers3: dict,
) -> None:
    """Not the public — a stranger to this circle cannot nudge the crew either."""
    await _set_cast(db_session, praxis_collab.id, character.id, True)
    response = await client.post(
        f"/praxes/{praxis_collab.id}/nudge", headers=auth_headers3
    )
    assert response.status_code == 403, response.text


@pytest.mark.asyncio
async def test_bulk_nudge_refuses_a_praxis_that_is_not_open(
    client,
    db_session: AsyncSession,
    praxis_collab: Praxis,
    character: Character,
    auth_headers: dict,
) -> None:
    """Nothing is outstanding on a submitted praxis — the call-wide status
    guard preserved from `send_nudge`."""
    await _set_cast(db_session, praxis_collab.id, character.id, True)
    praxis_collab.status = PraxisStatus.submitted
    await db_session.commit()

    response = await client.post(
        f"/praxes/{praxis_collab.id}/nudge", headers=auth_headers
    )
    assert response.status_code == 422, response.text


@pytest.mark.asyncio
async def test_anonymous_cannot_bulk_nudge(
    client, praxis_collab: Praxis
) -> None:
    response = await client.post(f"/praxes/{praxis_collab.id}/nudge")
    assert response.status_code in (401, 403)


@pytest.mark.asyncio
async def test_bulk_nudge_a_duel_pokes_the_one_rival_side(
    client,
    db_session: AsyncSession,
    active_task: Task,
    character: Character,
    character2: Character,
    auth_headers: dict,
    auth_headers2: dict,
) -> None:
    """A duel side has exactly one member, so the bulk route degrades to the
    same single poke `send_nudge` would issue — same guards, same delivery."""
    _, _, opponent_praxis = await _make_duel(
        db_session, active_task, character, character2, DuelStatus.active
    )

    response = await client.post(
        f"/praxes/{opponent_praxis.id}/nudge", headers=auth_headers
    )
    assert response.status_code == 200, response.text
    results = response.json()
    assert len(results) == 1
    assert results[0]["character_id"] == character2.id
    assert results[0]["nudge"] is not None

    feed = await client.get("/activity-feed", headers=auth_headers2)
    nudges = [item for item in feed.json()["items"] if item["type"] == "nudge"]
    assert len(nudges) == 1
