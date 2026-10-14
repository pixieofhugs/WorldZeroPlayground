"""#2865 -- the server sends the RESOLVED faction and duel multipliers.

**Seam: the wire.** ``build_task_out_for_viewer`` -> ``TaskOut`` and
``get_duel_detail`` -> ``DuelSideOut``. The client used to re-derive which
modifier applies (own vs other, ``na`` counts as own, the duel tie branch) from
``/game-config``; these fields are what it now formats instead. They are ADDITIVE:
the raw modifiers stay on ``/game-config`` (ADR-0055 / ADR-0053).

The era is rebuilt with distinguishable modifiers because era 1 neutralises the
task modifiers, and a test over all-1.0 values could not tell a resolved
multiplier from a missing one.
"""
from dataclasses import replace

import pytest
from sqlalchemy.ext.asyncio import AsyncSession

from faction_slugs import CROSS_FACTION_SLUG, real_faction_slugs
from game_config import CURRENT_ERA, EraConfig
from models.duel import DuelStatus
from models.era import Era
from models.faction import Faction
from services.duel import get_duel_detail
from services.scoring import compute_duel_multiplier, compute_faction_multiplier
from services.task import build_task_out_for_viewer
from tests.integration.factories import make_character, make_duel, make_task

MINE, THEIRS = real_faction_slugs(CURRENT_ERA)[:2]


def _skewed_era(
    *, mine_takes_ties: bool = False, theirs_takes_ties: bool = False
) -> EraConfig:
    factions = dict(CURRENT_ERA.factions)
    for slug, takes_ties in ((MINE, mine_takes_ties), (THEIRS, theirs_takes_ties)):
        factions[slug] = replace(
            factions[slug],
            own_task_modifier=1.3,
            other_task_modifier=0.7,
            duel_win_modifier=2.0,
            duel_loss_modifier=0.25,
            takes_duel_ties=takes_ties,
        )
    return replace(CURRENT_ERA, factions=factions)


@pytest.mark.asyncio
@pytest.mark.parametrize("task_faction", [MINE, THEIRS, CROSS_FACTION_SLUG])
async def test_task_carries_the_multiplier_the_scorer_would_apply(
    db_session: AsyncSession, era: Era, some_faction: Faction, task_faction: str
) -> None:
    viewer = await make_character(db_session, era, username="viewer", faction_slug=MINE)
    task = await make_task(db_session, viewer, faction_slug=task_faction)
    skewed = _skewed_era()

    out = await build_task_out_for_viewer(task, viewer, db_session, skewed)

    expected = compute_faction_multiplier(MINE, task_faction, skewed)
    assert out.viewer_faction_multiplier == expected
    assert out.viewer_faction_multiplier == (0.7 if task_faction == THEIRS else 1.3)


@pytest.mark.asyncio
async def test_anonymous_viewer_gets_the_identity(
    db_session: AsyncSession, era: Era, some_faction: Faction
) -> None:
    author = await make_character(db_session, era, username="author", faction_slug=MINE)
    task = await make_task(db_session, author, faction_slug=THEIRS)

    out = await build_task_out_for_viewer(task, None, db_session, _skewed_era())

    assert out.viewer_faction_multiplier == 1.0


@pytest.mark.asyncio
@pytest.mark.parametrize(
    "mine_ties, theirs_ties, expected_tie",
    [(False, False, 1.0), (True, True, 1.0), (True, False, 2.0), (False, True, 0.25)],
)
async def test_duel_sides_carry_win_loss_and_the_resolved_tie(
    db_session: AsyncSession, era: Era, some_faction: Faction,
    mine_ties: bool, theirs_ties: bool, expected_tie: float,
) -> None:
    skewed = _skewed_era(mine_takes_ties=mine_ties, theirs_takes_ties=theirs_ties)
    duel, _challenger, _opponent = await make_duel(
        db_session, era, label="rm", status=DuelStatus.active,
        challenger_faction=MINE, opponent_faction=THEIRS,
    )

    detail = await get_duel_detail(duel.id, None, db_session, skewed)

    side = detail.challenger
    assert (side.win_multiplier, side.loss_multiplier) == (2.0, 0.25)
    assert side.tie_multiplier == expected_tie
    assert side.tie_multiplier == compute_duel_multiplier(
        MINE, THEIRS, False, True, skewed
    )
