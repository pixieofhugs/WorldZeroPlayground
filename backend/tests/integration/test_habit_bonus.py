"""The habit bonus is stamped at seal time and read identically everywhere (#1617).

A faction may grant ``habit_bonus_points`` on any praxis a member seals within
``era.habit_window_days`` of another praxis of their own. Which faction holds
it is the era's business — this module finds the holder by the perk.

**The seam under test is the write**: ``services.collab_consensus._apply_seal``,
the single writer of ``submitted_at`` / ``era_id`` and now of
``PraxisMember.habit_bonus_points``. These tests drive it through the API so the
stamp is asserted on the real path.

The second seam is the *agreement* between the two readers.
``services.praxis_scoring.compute_contributions`` is called with different praxis
sets by ``services.praxis_out`` (one page of a feed, grouped by author) and by
``services.character_stats`` (a character's whole history). The column exists
precisely so those two cannot disagree, so
:func:`test_feed_and_recalc_agree_on_the_same_praxis` pins it explicitly — it is
the regression this whole design is buying.
"""
from datetime import datetime, timedelta, timezone

import pytest
from httpx import AsyncClient
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from faction_slugs import real_faction_slugs
from game_config import CURRENT_ERA
from models.account import Account
from models.character import Character
from models.character_stats import CharacterStats
from models.era import Era
from models.faction import Faction
from models.praxis import ModerationStatus, Praxis, PraxisMember, PraxisStatus
from models.task import Task, TaskStatus
from services.character_stats import recalculate_character_stats
from services.praxis_out import author_contributions_for
from tests.integration.factories import DEFAULT_FACTION_SLUG

#: The habit bonus is a PERK, so this module finds its holder by the perk rather
#: than by name (#2708). It used to read ``CURRENT_ERA.factions["ua"]``, which
#: is a `KeyError` at IMPORT — the whole module dying, not one test failing —
#: the moment an era drops UA.
HABIT_BONUS_SLUG = next(
    (
        slug
        for slug in real_faction_slugs(CURRENT_ERA)
        if CURRENT_ERA.factions[slug].habit_bonus_points > 0
    ),
    None,
)
#: A faction that was left at the 0 default — the "scores as before" control.
NO_HABIT_BONUS_SLUG = next(
    (
        slug
        for slug in real_faction_slugs(CURRENT_ERA)
        if CURRENT_ERA.factions[slug].habit_bonus_points == 0
    ),
    None,
)
HABIT_BONUS = (
    CURRENT_ERA.factions[HABIT_BONUS_SLUG].habit_bonus_points
    if HABIT_BONUS_SLUG
    else 0
)
HABIT_WINDOW_DAYS = CURRENT_ERA.habit_window_days

#: These tests drive the shared ``character`` fixture, which is seated in
#: ``DEFAULT_FACTION_SLUG``. They therefore only have a subject when the era's
#: first real faction is the one holding the bonus — true in Era 1, where UA is
#: both. An era that gives the bonus to someone else (or to nobody, as Era 2
#: does) has no habit bonus for THIS suite to observe; rewriting it around the
#: holder belongs with the other per-era rules modules (#2709), not here.
pytestmark = pytest.mark.skipif(
    HABIT_BONUS_SLUG is None or HABIT_BONUS_SLUG != DEFAULT_FACTION_SLUG,
    reason="the live era's first real faction does not hold the habit bonus",
)


# ---------------------------------------------------------------------------
# helpers
# ---------------------------------------------------------------------------

async def _extra_task(session: AsyncSession, character: Character, title: str) -> Task:
    """A second active task — a character may not hold one task twice (#1359)."""
    task = Task(
        title=title,
        description="A test task",
        point_value=10,
        level_required=0,
        status=TaskStatus.active,
        created_by=character.id,
        primary_faction_slug=character.faction_slug,
    )
    session.add(task)
    await session.commit()
    await session.refresh(task)
    return task


async def _seal_solo(client: AsyncClient, task: Task, headers: dict, title: str) -> int:
    """Create and submit a solo praxis through the API; return its id."""
    created = await client.post(
        "/praxes",
        json={"task_id": task.id, "type": "solo", "title": title},
        headers=headers,
    )
    assert created.status_code == 201, created.text
    praxis_id = created.json()["id"]
    submitted = await client.post(f"/praxes/{praxis_id}/submit", headers=headers)
    assert submitted.status_code == 200, submitted.text
    return praxis_id


async def _backdate(session: AsyncSession, praxis_id: int, days: int) -> None:
    """Move a sealed praxis's ``submitted_at`` back, so the next seal can see it
    from a chosen distance. Only the timestamp moves; the row stays a real seal."""
    praxis = await session.get(Praxis, praxis_id)
    praxis.submitted_at = datetime.now(timezone.utc) - timedelta(days=days)
    await session.commit()


async def _open_era_before(session: AsyncSession, era: Era, days: int) -> None:
    """Pull the era's ``started_at`` back behind the backdated praxes.

    ``services.character_stats`` bounds its gather by the era window, so a praxis
    backdated behind an era row created seconds ago falls outside it and banks
    nothing. Only tests that assert a *score* need this; the stamp itself is
    written at seal time and does not care.
    """
    era.started_at = datetime.now(timezone.utc) - timedelta(days=days)
    await session.commit()


async def _stats(
    session: AsyncSession, character_id: int, era_id: int
) -> CharacterStats:
    result = await session.execute(
        select(CharacterStats).where(
            CharacterStats.character_id == character_id,
            CharacterStats.era_id == era_id,
        )
    )
    return result.scalar_one()


async def _stamp(session: AsyncSession, praxis_id: int, character_id: int) -> int:
    result = await session.execute(
        select(PraxisMember.habit_bonus_points).where(
            PraxisMember.praxis_id == praxis_id,
            PraxisMember.character_id == character_id,
        )
    )
    return result.scalar_one()


# ---------------------------------------------------------------------------
# the window
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_second_praxis_inside_the_window_carries_the_bonus(
    client: AsyncClient,
    db_session: AsyncSession,
    character: Character,
    active_task: Task,
    era: Era,
    auth_headers: dict,
):
    """Six days apart: the second earns it, the first never could — no predecessor."""
    assert HABIT_BONUS > 0, "this test needs an era whose faction holds the bonus"
    first_id = await _seal_solo(client, active_task, auth_headers, "First")
    assert await _stamp(db_session, first_id, character.id) == 0

    await _backdate(db_session, first_id, days=HABIT_WINDOW_DAYS - 1)
    second_task = await _extra_task(db_session, character, "Second Task")
    second_id = await _seal_solo(client, second_task, auth_headers, "Second")

    assert await _stamp(db_session, second_id, character.id) == HABIT_BONUS


@pytest.mark.asyncio
async def test_praxis_outside_the_window_carries_nothing(
    client: AsyncClient,
    db_session: AsyncSession,
    character: Character,
    active_task: Task,
    era: Era,
    auth_headers: dict,
):
    """A day past the window is out. Neither praxis earns anything."""
    first_id = await _seal_solo(client, active_task, auth_headers, "First")
    await _backdate(db_session, first_id, days=HABIT_WINDOW_DAYS + 1)

    second_task = await _extra_task(db_session, character, "Second Task")
    second_id = await _seal_solo(client, second_task, auth_headers, "Second")

    assert await _stamp(db_session, first_id, character.id) == 0
    assert await _stamp(db_session, second_id, character.id) == 0


@pytest.mark.asyncio
@pytest.mark.parametrize(
    "moderation_status", [ModerationStatus.hidden, ModerationStatus.failed]
)
async def test_unscored_predecessor_does_not_prop_up_a_streak(
    client: AsyncClient,
    db_session: AsyncSession,
    character: Character,
    active_task: Task,
    era: Era,
    auth_headers: dict,
    moderation_status: ModerationStatus,
):
    """Only a praxis that actually scores can be a predecessor (#1373).

    ``hidden`` is off the site; ``failed`` is an admin ruling that the work was
    not done. Either one banking a habit for the next praxis would pay for work
    the site has already refused to pay for.
    """
    first_id = await _seal_solo(client, active_task, auth_headers, "First")
    await _backdate(db_session, first_id, days=1)
    first = await db_session.get(Praxis, first_id)
    first.moderation_status = moderation_status
    await db_session.commit()

    second_task = await _extra_task(db_session, character, "Second Task")
    second_id = await _seal_solo(client, second_task, auth_headers, "Second")

    assert await _stamp(db_session, second_id, character.id) == 0


@pytest.mark.asyncio
async def test_faction_without_the_ability_scores_as_before(
    client: AsyncClient,
    db_session: AsyncSession,
    account2: Account,
    era: Era,
    some_faction: Faction,
    auth_headers2: dict,
    character: Character,
    active_task: Task,
):
    """A faction left at the 0 default earns nothing however habitual it is.

    The control is found by the perk it lacks, not by name (#2708); its row is
    already seeded by ``some_faction``.
    """
    assert NO_HABIT_BONUS_SLUG is not None, "this test needs a faction without it"

    without = Character(
        account_id=account2.id,
        username="nobonuscharacter",
        display_name="No Bonus Character",
        faction_slug=NO_HABIT_BONUS_SLUG,
    )
    db_session.add(without)
    await db_session.flush()
    db_session.add(
        CharacterStats(character_id=without.id, era_id=era.id, score=0, level=0)
    )
    await db_session.commit()

    first_id = await _seal_solo(client, active_task, auth_headers2, "First")
    await _backdate(db_session, first_id, days=1)
    second_task = await _extra_task(db_session, character, "Second Task")
    second_id = await _seal_solo(client, second_task, auth_headers2, "Second")

    assert await _stamp(db_session, second_id, without.id) == 0


# ---------------------------------------------------------------------------
# the reason the column exists
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_feed_and_recalc_agree_on_the_same_praxis(
    client: AsyncClient,
    db_session: AsyncSession,
    character: Character,
    active_task: Task,
    era: Era,
    auth_headers: dict,
):
    """The regression the stamp is bought to prevent.

    ``praxis_out.author_contributions_for`` is handed ONE PAGE of praxes;
    ``recalculate_character_stats`` gathers the character's whole history. A
    habit bonus derived from whichever list is in hand would find no predecessor
    on the page and a predecessor in the recompute — the same praxis scoring two
    different ways depending on which surface asked. The page here holds *only*
    the second praxis, so a derived implementation fails this and a stamped one
    cannot.
    """
    await _open_era_before(db_session, era, days=30)
    first_id = await _seal_solo(client, active_task, auth_headers, "First")
    await _backdate(db_session, first_id, days=1)
    second_task = await _extra_task(db_session, character, "Second Task")
    second_id = await _seal_solo(client, second_task, auth_headers, "Second")

    second = await db_session.get(Praxis, second_id)
    page = await author_contributions_for([second], db_session, CURRENT_ERA)
    from_feed = page[second_id]

    await recalculate_character_stats(character.id, db_session, CURRENT_ERA)
    await db_session.commit()
    stats = await _stats(db_session, character.id, era.id)

    assert from_feed.habit_bonus_points == HABIT_BONUS
    # first (10, no bonus) + second (10 + bonus) — the recompute sees both.
    assert stats.score == round(
        active_task.point_value * 2 + HABIT_BONUS
    )
    # The card's own total for the second praxis carries the same bonus the
    # recompute banked for it.
    assert from_feed.total == active_task.point_value + HABIT_BONUS


@pytest.mark.asyncio
async def test_recomputing_twice_does_not_move_the_total(
    client: AsyncClient,
    db_session: AsyncSession,
    character: Character,
    active_task: Task,
    era: Era,
    auth_headers: dict,
):
    """The bonus is history, not a live derivation: recompute is idempotent."""
    await _open_era_before(db_session, era, days=30)
    first_id = await _seal_solo(client, active_task, auth_headers, "First")
    await _backdate(db_session, first_id, days=1)
    second_task = await _extra_task(db_session, character, "Second Task")
    await _seal_solo(client, second_task, auth_headers, "Second")

    await recalculate_character_stats(character.id, db_session, CURRENT_ERA)
    await db_session.commit()
    stats = await _stats(db_session, character.id, era.id)
    once = stats.score

    await recalculate_character_stats(character.id, db_session, CURRENT_ERA)
    await db_session.commit()
    await db_session.refresh(stats)

    assert stats.score == once
    assert once == round(active_task.point_value * 2 + HABIT_BONUS)


@pytest.mark.asyncio
async def test_the_payload_can_still_explain_its_own_total(
    client: AsyncClient,
    db_session: AsyncSession,
    character: Character,
    active_task: Task,
    era: Era,
    auth_headers: dict,
):
    """``score`` never gains a term the breakdown cannot name (ADR-0053).

    The habit bonus is flat and sits outside ``display_multiplier``, so without a
    field of its own the wire's documented invariant would quietly become false
    for every such praxis — a card and a detail page reading the same payload and
    computing different sums is exactly what the one-number rule forbids.
    """
    first_id = await _seal_solo(client, active_task, auth_headers, "First")
    await _backdate(db_session, first_id, days=1)
    second_task = await _extra_task(db_session, character, "Second Task")
    second_id = await _seal_solo(client, second_task, auth_headers, "Second")

    detail = await client.get(f"/praxes/{second_id}", headers=auth_headers)
    assert detail.status_code == 200, detail.text
    body = detail.json()

    assert body["habit_bonus_points"] == HABIT_BONUS
    assert body["score"] == (
        (body["task_point_value"] + body["metatask_points"])
        * body["display_multiplier"]
        + body["points_from_votes"]
        + body["habit_bonus_points"]
    )


# ---------------------------------------------------------------------------
# per member, not per praxis
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_a_collab_stamps_each_member_against_their_own_history(
    client: AsyncClient,
    db_session: AsyncSession,
    character: Character,
    character2: Character,
    active_task: Task,
    era: Era,
    auth_headers: dict,
    auth_headers2: dict,
):
    """One seal, two answers — the reason the stamp lives on ``PraxisMember``.

    Only ``character2`` has filed recently; ``character`` has never filed at all.
    The collab seals once for the group, and the bonus must follow each member's
    own history rather than the author's. A single column on ``Praxis`` could not
    hold both answers.

    ``character2`` authors it because the collab door has a level gate
    (``era.collaboration_level_required``) that the level-0 ``character`` fixture
    does not clear — the invitee deliberately bypasses it (#1511).
    """
    warm_up_id = await _seal_solo(client, active_task, auth_headers2, "Warm Up")
    await _backdate(db_session, warm_up_id, days=1)

    collab_task = await _extra_task(db_session, character, "Collab Task")
    created = await client.post(
        "/praxes",
        json={"task_id": collab_task.id, "type": "collab", "title": "Together"},
        headers=auth_headers2,
    )
    assert created.status_code == 201, created.text
    collab_id = created.json()["id"]

    invite = await client.post(
        f"/praxes/{collab_id}/invite",
        json={"invitee_id": character.id},
        headers=auth_headers2,
    )
    assert invite.status_code in (200, 201), invite.text
    invite_id = invite.json()["id"]
    accepted = await client.post(
        f"/praxes/{collab_id}/invite/{invite_id}/respond",
        json={"accept": True},
        headers=auth_headers,
    )
    assert accepted.status_code == 200, accepted.text

    for headers in (auth_headers2, auth_headers):
        submitted = await client.post(f"/praxes/{collab_id}/submit", headers=headers)
        assert submitted.status_code == 200, submitted.text

    collab = await db_session.get(Praxis, collab_id)
    await db_session.refresh(collab)
    assert collab.status == PraxisStatus.submitted
    assert await _stamp(db_session, collab_id, character2.id) == HABIT_BONUS
    assert await _stamp(db_session, collab_id, character.id) == 0
