"""Three signals, not one button (ADR-0079, #1810).

**The seam is the consensus service, reached through its routes.** What used to
be one per-member ``has_submitted`` doing three jobs is now Done (social),
Propose (opens the window) and Approve (a vote on the live proposal), and the
thing worth testing about a split is that the pieces *stay* split: that Done
starts nothing, that cancelling a proposal does not un-finish anybody's part,
and that solo never enters the machinery at all.

The cancel-on-edit rule itself is tested where it fires — at the room, in
``test_praxis_room.py`` — because a CRDT update is the trigger and a service
call would not prove the trigger exists. Withdraw is here: it is the same
cancellation reached by a route.

The pending-window mechanics that predate this issue (a partial submit opens the
window, all-submit clears it, a lapsed window auto-publishes on read) live in
``test_praxes.py`` and are deliberately not restated here.
"""

from datetime import datetime, timedelta, timezone

import pytest
from httpx import AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession

from models.character import Character
from models.praxis import Praxis
from models.task import Task


def _member(body: dict, character_id: int) -> dict:
    return next(m for m in body["members"] if m["character_id"] == character_id)


# ---------------------------------------------------------------------------
# Done — social only
# ---------------------------------------------------------------------------


@pytest.mark.asyncio
async def test_marking_done_changes_nothing_else(
    client: AsyncClient,
    praxis_collab: Praxis,
    character: Character,
    character2: Character,
    auth_headers: dict,
):
    """Done gates nothing and starts nothing (ADR-0079).

    The assertion is mostly a list of things that must NOT have happened: no
    window, no status change, nobody recorded as approving. That is the whole
    content of "purely social" — and it is exactly what the old single boolean
    could not say, because saying "my part is finished" opened the countdown and
    froze the document for everyone else.
    """
    before = await client.get(f"/praxes/{praxis_collab.id}", headers=auth_headers)
    assert before.json()["status"] == "in_progress"

    resp = await client.post(
        f"/praxes/{praxis_collab.id}/done",
        json={"is_done": True},
        headers=auth_headers,
    )
    assert resp.status_code == 200, resp.text
    body = resp.json()

    assert body["status"] == "in_progress"
    assert body["submit_proposed_at"] is None
    assert not any(m["has_submitted"] for m in body["members"])
    assert all(m["submitted_at"] is None for m in body["members"])
    # And it is the actor's own row that moved, not the pair's.
    assert _member(body, character.id)["character_id"] == character.id
    assert _member(body, character2.id)["has_submitted"] is False


@pytest.mark.asyncio
async def test_done_is_reversible(
    client: AsyncClient,
    praxis_collab: Praxis,
    character: Character,
    auth_headers: dict,
    db_session: AsyncSession,
):
    """"Freely reversible" — a member who un-ticks Done leaves nothing behind.

    Read off the row rather than the wire, because ``is_done`` is not on
    ``PraxisMemberOut`` yet: adding a field to a response model makes it required
    in the generated client (#1400), which is a frontend edit, and this issue's
    pair (#1811) owns that half.
    """
    for value in (True, False, True):
        resp = await client.post(
            f"/praxes/{praxis_collab.id}/done",
            json={"is_done": value},
            headers=auth_headers,
        )
        assert resp.status_code == 200, resp.text

        await db_session.commit()
        praxis = await db_session.get(Praxis, praxis_collab.id)
        await db_session.refresh(praxis)
        row = next(m for m in praxis.members if m.character_id == character.id)
        assert row.is_done is value


@pytest.mark.asyncio
async def test_a_cancelled_proposal_leaves_done_alone(
    client: AsyncClient,
    praxis_collab: Praxis,
    character: Character,
    auth_headers: dict,
    auth_headers2: dict,
    db_session: AsyncSession,
):
    """The split, stated as the one thing that would silently re-merge it.

    Withdraw clears every approval — the group is not ready to publish — and says
    nothing about whether a member considers their own part finished. Clearing
    Done here would put the two meanings back on one flag with two names.
    """
    await client.post(
        f"/praxes/{praxis_collab.id}/done", json={"is_done": True}, headers=auth_headers
    )
    proposed = await client.post(
        f"/praxes/{praxis_collab.id}/submit", headers=auth_headers
    )
    assert proposed.json()["status"] == "pending"

    withdrawn = await client.post(
        f"/praxes/{praxis_collab.id}/unsubmit", headers=auth_headers2
    )
    assert withdrawn.status_code == 200, withdrawn.text
    assert not any(m["has_submitted"] for m in withdrawn.json()["members"])

    await db_session.commit()
    praxis = await db_session.get(Praxis, praxis_collab.id)
    await db_session.refresh(praxis)
    row = next(m for m in praxis.members if m.character_id == character.id)
    assert row.is_done is True


@pytest.mark.asyncio
async def test_done_is_refused_on_a_solo_praxis(
    client: AsyncClient,
    praxis_solo: Praxis,
    auth_headers: dict,
):
    """Solo and duel are untouched (ADR-0079) — including by the new signal.

    One member means Done and Publish are the same click, so a per-member Done
    there is a caller that has misread the model. A duel is two solo praxes
    (ADR-0011), so it is this case twice.
    """
    resp = await client.post(
        f"/praxes/{praxis_solo.id}/done", json={"is_done": True}, headers=auth_headers
    )
    assert resp.status_code == 422, resp.text


@pytest.mark.asyncio
async def test_a_non_member_cannot_mark_done(
    client: AsyncClient,
    praxis_collab: Praxis,
    auth_headers3: dict,
):
    """Done is a member's signal, through the same ADR-0013 door as every other."""
    resp = await client.post(
        f"/praxes/{praxis_collab.id}/done",
        json={"is_done": True},
        headers=auth_headers3,
    )
    assert resp.status_code == 403, resp.text


# ---------------------------------------------------------------------------
# Propose / Approve / Withdraw
# ---------------------------------------------------------------------------


@pytest.mark.asyncio
async def test_the_proposer_implicitly_approves(
    client: AsyncClient,
    praxis_collab: Praxis,
    character: Character,
    character2: Character,
    auth_headers: dict,
):
    """Propose carries the proposer's own approval (ADR-0079).

    Otherwise "I think we're ready to publish" would leave them a holdout against
    their own proposal, and a two-member collab could never reach consensus
    without four clicks.
    """
    resp = await client.post(f"/praxes/{praxis_collab.id}/submit", headers=auth_headers)
    body = resp.json()

    assert body["status"] == "pending"
    assert body["submit_proposed_at"] is not None
    assert _member(body, character.id)["has_submitted"] is True
    assert _member(body, character2.id)["has_submitted"] is False


@pytest.mark.asyncio
async def test_withdraw_returns_the_collab_to_drafting(
    client: AsyncClient,
    praxis_collab: Praxis,
    auth_headers: dict,
    auth_headers2: dict,
):
    """Withdraw has the same effect as an edit, and any member may take it.

    The withdrawer here is the member who did *not* propose — the holdout, who
    under the old model had nothing of their own to pull back and, once the
    document froze, no way to answer the countdown at all.
    """
    await client.post(f"/praxes/{praxis_collab.id}/submit", headers=auth_headers)

    resp = await client.post(
        f"/praxes/{praxis_collab.id}/unsubmit", headers=auth_headers2
    )
    assert resp.status_code == 200, resp.text
    body = resp.json()

    assert body["status"] == "in_progress"
    assert body["submit_proposed_at"] is None
    assert not any(m["has_submitted"] for m in body["members"])
    assert all(m["submitted_at"] is None for m in body["members"])


@pytest.mark.asyncio
async def test_silence_publishes_the_praxis_the_window_was_opened_on(
    client: AsyncClient,
    praxis_collab: Praxis,
    auth_headers: dict,
    db_session: AsyncSession,
    active_task: Task,
):
    """Silence is consent, unchanged — and now fair, because typing answers it.

    The window is read from ``era.collab_auto_submit_days`` rather than restated,
    so this test cannot drift from the era that owns the rule.
    """
    from game_config import CURRENT_ERA

    await client.post(f"/praxes/{praxis_collab.id}/submit", headers=auth_headers)

    praxis = await db_session.get(Praxis, praxis_collab.id)
    praxis.submit_proposed_at = datetime.now(timezone.utc) - timedelta(
        days=CURRENT_ERA.collab_auto_submit_days, seconds=1
    )
    await db_session.commit()

    resp = await client.get(f"/praxes/{praxis_collab.id}")
    assert resp.json()["status"] == "submitted"
