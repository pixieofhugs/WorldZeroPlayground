"""Era close freezes every duel outcome (ADR-0052, #824).

ADR-0011 says a duel's winner floats with the votes and "a definitive winner
only exists at era close". These tests exercise that close: ``apply_era_reset``
resolves a *mix* of duels in one pass — clear leader, forfeit win, tie, and an
incomplete ``active`` duel — asserting ``winner_character_id``, the frozen
per-side vote snapshot, and the terminal ``resolved`` status.
"""

import pytest
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from faction_slugs import real_faction_slugs
from game_config import CURRENT_ERA
from models.account import Account
from models.character import Character
from models.duel import Duel, DuelStatus
from models.era import Era
from models.faction import Faction
from models.praxis import (
    ModerationStatus,
    Praxis,
)
from services.duel_outcome import duel_winner
from services.era import apply_era_reset
from tests.integration.factories import (
    cast_vote,
    make_character,
    make_duel,
)

#: The two sides of a lone-tie-taker tie, derived from the PERK and never named
#: (#2664, extending #2708). The rule is "the SOLE holder of `takes_duel_ties`
#: takes the tie", so a fixture that hardcoded "snide" would stop naming the
#: rule the moment an era moved the ability — and a fixture default could pick
#: a second holder and silently turn the case under test into a real tie.
TIE_TAKER = next(
    (
        slug
        for slug in real_faction_slugs(CURRENT_ERA)
        if CURRENT_ERA.factions[slug].takes_duel_ties
    ),
    None,
)
NOT_TIE_TAKER = next(
    slug
    for slug in real_faction_slugs(CURRENT_ERA)
    if not CURRENT_ERA.factions[slug].takes_duel_ties
)


# ---------------------------------------------------------------------------
# helpers
# ---------------------------------------------------------------------------


async def _close_the_era(session: AsyncSession, starter: Account) -> Era:
    new_era_row = Era(
        name=CURRENT_ERA.name,
        config_key=CURRENT_ERA.config_key,
        started_by=starter.id,
    )
    session.add(new_era_row)
    await session.flush()
    await apply_era_reset([], new_era_row, session)
    return new_era_row


# ---------------------------------------------------------------------------
# the pure rule
# ---------------------------------------------------------------------------


def test_duel_winner_prefers_forfeit_over_the_tally():
    """A forfeit decides the duel even when the forfeiter is far ahead on votes."""
    assert (
        duel_winner(
            challenger_character_id=1,
            opponent_character_id=2,
            challenger_points=99,
            opponent_points=0,
            challenger_moderation=ModerationStatus.visible,
            opponent_moderation=ModerationStatus.visible,
            forfeited_by_character_id=1,
        )
        == 2
    )


def test_duel_winner_needs_strictly_greater_points():
    assert (
        duel_winner(
            challenger_character_id=1,
            opponent_character_id=2,
            challenger_points=4,
            opponent_points=3,
            challenger_moderation=ModerationStatus.visible,
            opponent_moderation=ModerationStatus.visible,
        )
        == 1
    )
    assert (
        duel_winner(
            challenger_character_id=1,
            opponent_character_id=2,
            challenger_points=3,
            opponent_points=3,
            challenger_moderation=ModerationStatus.visible,
            opponent_moderation=ModerationStatus.visible,
        )
        is None
    )


# ---------------------------------------------------------------------------
# era close over a mix of duels
# ---------------------------------------------------------------------------


@pytest.mark.asyncio
async def test_era_reset_freezes_a_mix_of_duels(
    db_session: AsyncSession, era: Era, account: Account, some_faction: Faction
):
    """One reset resolves clear-leader, forfeit, tie and incomplete duels together."""
    leader_duel, leader_ch, leader_op = await make_duel(
        db_session, era, label="lead", status=DuelStatus.settled,
        challenger_votes=5, opponent_votes=2,
    )
    forfeit_duel, forfeit_ch, forfeit_op = await make_duel(
        db_session, era, label="forf", status=DuelStatus.settled,
        challenger_votes=5, opponent_votes=1, forfeiter="challenger",
    )
    tie_duel, tie_ch, tie_op = await make_duel(
        db_session, era, label="tie", status=DuelStatus.settled,
        challenger_votes=3, opponent_votes=3,
    )
    incomplete_duel, incomplete_ch, incomplete_op = await make_duel(
        db_session, era, label="inc", status=DuelStatus.active,
        challenger_votes=None, opponent_votes=None,
    )

    await _close_the_era(db_session, account)

    # ── clear leader: more vote points wins, both sides snapshotted ─────────
    await db_session.refresh(leader_duel)
    assert leader_duel.status == DuelStatus.resolved
    assert leader_duel.winner_character_id == leader_ch.id
    assert leader_duel.challenger_final_points == 5
    assert leader_duel.opponent_final_points == 2
    assert leader_duel.resolved_at is not None

    # ── forfeit: the non-forfeiter wins despite trailing on votes ──────────
    await db_session.refresh(forfeit_duel)
    assert forfeit_duel.status == DuelStatus.resolved
    assert forfeit_duel.winner_character_id == forfeit_op.id
    # The snapshot still records what the tally actually said.
    assert forfeit_duel.challenger_final_points == 5
    assert forfeit_duel.opponent_final_points == 1

    # ── tie: null winner, equal snapshots ──────────────────────────────────
    await db_session.refresh(tie_duel)
    assert tie_duel.status == DuelStatus.resolved
    assert tie_duel.winner_character_id is None
    assert tie_duel.challenger_final_points == 3
    assert tie_duel.opponent_final_points == 3

    # ── incomplete `active` duel: no-contest, never became votable ──────────
    await db_session.refresh(incomplete_duel)
    assert incomplete_duel.status == DuelStatus.resolved
    assert incomplete_duel.winner_character_id is None
    assert incomplete_duel.challenger_final_points == 0
    assert incomplete_duel.opponent_final_points == 0


@pytest.mark.asyncio
async def test_era_reset_freezes_the_snide_tie_to_snide(
    db_session: AsyncSession, era: Era, account: Account, some_faction: Faction
):
    """A tied duel with a lone Snide side freezes to Snide, not a NULL winner (#748).

    Snide wins ties everywhere the live multiplier applies; the permanent frozen
    record must agree, or `duel_victor` (#823) would lose a win the site showed.
    """
    # Every era faction's row is seeded by ``some_faction``. The side named
    # here is the one holding ``takes_duel_ties``, i.e. the faction
    # ``services.scoring.sole_tie_taker_slug`` picks out — so this names the
    # rule, not a roster (#2708, #2664).
    if TIE_TAKER is None:
        pytest.skip(f"no faction in {CURRENT_ERA.config_key} takes duel ties")
    duel, challenger, _opponent = await make_duel(
        db_session, era, label="snidefreeze", status=DuelStatus.settled,
        challenger_votes=3, opponent_votes=3,
        challenger_faction=TIE_TAKER, opponent_faction=NOT_TIE_TAKER,
    )

    await _close_the_era(db_session, account)

    await db_session.refresh(duel)
    assert duel.status == DuelStatus.resolved
    assert duel.winner_character_id == challenger.id
    assert duel.challenger_final_points == 3
    assert duel.opponent_final_points == 3


@pytest.mark.asyncio
async def test_era_reset_wins_for_the_opponent_side_too(
    db_session: AsyncSession, era: Era, account: Account, some_faction: Faction
):
    """The winner is not biased to the challenger — the opponent can win outright."""
    duel, challenger, opponent = await make_duel(
        db_session, era, label="opwin", status=DuelStatus.settled,
        challenger_votes=1, opponent_votes=4,
    )

    await _close_the_era(db_session, account)

    await db_session.refresh(duel)
    assert duel.winner_character_id == opponent.id
    assert duel.challenger_final_points == 1
    assert duel.opponent_final_points == 4


@pytest.mark.asyncio
async def test_era_reset_will_not_freeze_a_win_for_a_failed_side(
    db_session: AsyncSession, era: Era, account: Account, some_faction: Faction
):
    """A praxis a moderator ruled failed cannot win the frozen record (#1442).

    The failed side leads 5–1, and still loses: the tally is not the input that
    decides eligibility. This is the era-close half of the fix — the settlement
    path is covered in ``test_praxis_card_breakdown``, and the two must agree
    because they share one rule.
    """
    duel, _challenger, opponent = await make_duel(
        db_session, era, label="failwin", status=DuelStatus.settled,
        challenger_votes=5, opponent_votes=1,
        challenger_moderation=ModerationStatus.failed,
    )

    await _close_the_era(db_session, account)

    await db_session.refresh(duel)
    assert duel.status == DuelStatus.resolved
    assert duel.winner_character_id == opponent.id
    # The snapshot still records what the tally actually said — the ruling
    # changes who won, not what the voters did.
    assert duel.challenger_final_points == 5
    assert duel.opponent_final_points == 1


@pytest.mark.asyncio
async def test_era_reset_freezes_no_winner_when_both_sides_failed(
    db_session: AsyncSession, era: Era, account: Account, some_faction: Faction
):
    """Nobody won. A NULL winner, not the higher tally and not the tiebreak."""
    duel, _challenger, _opponent = await make_duel(
        db_session, era, label="bothfail", status=DuelStatus.settled,
        challenger_votes=5, opponent_votes=1,
        challenger_moderation=ModerationStatus.failed,
        opponent_moderation=ModerationStatus.failed,
    )

    await _close_the_era(db_session, account)

    await db_session.refresh(duel)
    assert duel.status == DuelStatus.resolved
    assert duel.winner_character_id is None


@pytest.mark.asyncio
async def test_era_reset_leaves_pending_and_declined_duels_untouched(
    db_session: AsyncSession, era: Era, account: Account, some_faction: Faction
):
    """A duel that was never accepted was never a contest — it is not resolved."""
    pending_duel, _, _ = await make_duel(
        db_session, era, label="pend", status=DuelStatus.pending,
        challenger_votes=None, opponent_votes=None,
    )
    declined_duel, _, _ = await make_duel(
        db_session, era, label="decl", status=DuelStatus.declined,
        challenger_votes=None, opponent_votes=None,
    )

    await _close_the_era(db_session, account)

    await db_session.refresh(pending_duel)
    await db_session.refresh(declined_duel)
    assert pending_duel.status == DuelStatus.pending
    assert pending_duel.resolved_at is None
    assert declined_duel.status == DuelStatus.declined
    assert declined_duel.resolved_at is None


@pytest.mark.asyncio
async def test_resolution_is_sticky_across_a_second_era_close(
    db_session: AsyncSession, era: Era, account: Account, some_faction: Faction
):
    """A resolved duel is terminal: later votes and later resets never move it."""
    duel, challenger, opponent = await make_duel(
        db_session, era, label="stick", status=DuelStatus.settled,
        challenger_votes=5, opponent_votes=2,
    )

    await _close_the_era(db_session, account)
    await db_session.refresh(duel)
    frozen_at = duel.resolved_at

    # Votes keep arriving (they are never reset) — the frozen outcome must hold.
    late_voter = await make_character(
        db_session, era, username="late", email="late@x.com"
    )
    opponent_praxis = await db_session.get(Praxis, duel.opponent_praxis_id)
    await cast_vote(db_session, opponent_praxis, late_voter, 5)

    await _close_the_era(db_session, account)

    await db_session.refresh(duel)
    assert duel.winner_character_id == challenger.id
    assert duel.opponent_final_points == 2
    assert duel.resolved_at == frozen_at


@pytest.mark.asyncio
async def test_era_reset_script_resolves_duels(
    account: Account, character: Character, db_session: AsyncSession,
    era: Era, some_faction: Faction,
):
    """The freeze runs through the real entry point, not just the service.

    That entry point was ``PUT /admin/era/reset`` until #1667 deleted it as
    unreachable; the rollover is now ``scripts/era_reset.py`` (#1666). Composing
    the two halves is the point of this test: the rest of this file proves
    ``apply_era_reset`` freezes duels, and ``test_era_reset_script.py`` proves
    the script opens an era — neither alone proves an operator's rollover
    actually settles the board.
    """
    from scripts.era_reset import reset_era
    from tests.integration.factories import make_admin

    await make_admin(db_session, account)
    duel, challenger, _ = await make_duel(
        db_session, era, label="api", status=DuelStatus.settled,
        challenger_votes=4, opponent_votes=1,
    )
    await db_session.commit()

    assert await reset_era(db_session, character.username, confirmed=True) == 0

    result = await db_session.execute(select(Duel).where(Duel.id == duel.id))
    resolved = result.scalar_one()
    await db_session.refresh(resolved)
    assert resolved.status == DuelStatus.resolved
    assert resolved.winner_character_id == challenger.id
