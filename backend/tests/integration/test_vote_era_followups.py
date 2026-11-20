"""Era-id truth for votes and the closing roll (#3652).

Seams: ``tally_votes(cast_in="sealed")``, ``recompute_votes_spent_this_era``,
``cast_vote_on_praxis`` on a closed-era collab, ``apply_era_reset`` for an
active duel, and the era-reset CLI's board.
"""
import dataclasses
from datetime import datetime, timedelta, timezone

import pytest
from sqlalchemy import select, update
from sqlalchemy.ext.asyncio import AsyncSession

from faction_slugs import real_faction_slugs
from game_config import CURRENT_ERA, TaskDef
from models.character import Character
from models.character_stats import CharacterStats
from models.duel import DuelStatus
from models.era import Era
from models.praxis import Praxis, PraxisMember, PraxisStatus, PraxisType
from models.task import Task, TaskStatus
from models.vote import Vote
from scripts.era_reset import reset_era
from services.character_stats import (
    recalculate_character_stats,
    recompute_votes_spent_this_era,
)
from services.era import apply_era_reset
from services.vote import cast_vote_on_praxis
from services.vote_tally import tally_votes
from tests.integration.factories import (
    DEFAULT_FACTION_SLUG,
    cast_vote,
    make_admin,
    make_duel,
    make_solo_praxis,
    make_task,
)

pytestmark = pytest.mark.asyncio

LIVE_ERA_ONLY_EVER_REBOUND_TO_ITSELF = (
    "reset_era re-opens whatever the latest Era row names, and the CLI test "
    "gets that row from the `era` fixture, which writes CURRENT_ERA.config_key"
)

OWN_TASK_MODIFIER: float = CURRENT_ERA.factions[DEFAULT_FACTION_SLUG].own_task_modifier


async def _live_era_after(db_session: AsyncSession, prior: Era, account) -> Era:
    """Backdates ``prior``; the returned row is live (highest id)."""
    prior.started_at = prior.started_at - timedelta(days=60)
    row = Era(
        name=CURRENT_ERA.name,
        config_key=CURRENT_ERA.config_key,
        started_by_id=account.id,
        started_at=prior.started_at + timedelta(days=30),
    )
    db_session.add(row)
    await db_session.commit()
    await db_session.refresh(row)
    return row


async def _stats(db_session: AsyncSession, character: Character, era_row: Era):
    return await db_session.scalar(
        select(CharacterStats).where(
            CharacterStats.character_id == character.id,
            CharacterStats.era_id == era_row.id,
        )
    )


async def test_sealed_tally_follows_the_stored_era_not_the_timestamp(
    db_session, account, character, character2, era, some_faction
):
    live = await _live_era_after(db_session, era, account)
    task = await make_task(db_session, character)
    praxis = await make_solo_praxis(db_session, task, character)
    # Sealed in the prior era by stamp, though the clock says the live window.
    praxis.era_id = era.id
    praxis.submitted_at = live.started_at + timedelta(minutes=1)
    await cast_vote(db_session, praxis, character2, 4)
    await db_session.execute(update(Vote).values(era_id=era.id))
    await db_session.commit()

    tally = (await tally_votes([praxis.id], db_session, cast_in="sealed"))[praxis.id]
    assert (tally.points_from_votes, tally.voter_count) == (4, 1)


async def test_votes_spent_rebuild_counts_by_vote_era_not_created_at(
    db_session, character, character2, era, some_faction
):
    task = await make_task(db_session, character)
    praxis = await make_solo_praxis(db_session, task, character)
    await cast_vote(db_session, praxis, character2, 3)
    await db_session.execute(
        update(Vote).values(created_at=era.started_at - timedelta(days=5))
    )
    await db_session.commit()

    repairs = await recompute_votes_spent_this_era(
        db_session, era_row=era, dry_run=True
    )
    assert [(r.character_id, r.after) for r in repairs] == [(character2.id, 1)]


async def test_a_live_vote_on_a_closed_era_collab_credits_every_member(
    db_session, account, character, character2, character3, era, some_faction
):
    live = await _live_era_after(db_session, era, account)
    task = await make_task(db_session, character, point_value=40)
    praxis = Praxis(
        task_id=task.id,
        created_by_id=character.id,
        type=PraxisType.collab,
        status=PraxisStatus.submitted,
        title="Two of us",
        body_text="proof",
        submitted_at=era.started_at + timedelta(days=1),
        era_id=era.id,
    )
    db_session.add(praxis)
    await db_session.flush()
    db_session.add_all(
        PraxisMember(praxis_id=praxis.id, character_id=m.id, has_approved=True)
        for m in (character, character3)
    )
    for member in (character, character3):
        db_session.add(CharacterStats(character_id=member.id, era_id=live.id))
    await db_session.commit()
    await db_session.refresh(praxis)

    await cast_vote_on_praxis(character2, praxis.id, 5, db_session)
    await db_session.commit()

    for member in (character, character3):
        assert (await _stats(db_session, member, live)).score == 5


async def test_an_active_duel_closes_with_its_no_contest_score(
    db_session, account, era, some_faction
):
    duel, challenger, _ = await make_duel(
        db_session, era, label="d", status=DuelStatus.active, challenger_votes=5
    )
    await recalculate_character_stats(challenger.id, db_session)
    provisional = (await _stats(db_session, challenger, era)).score

    new_era = Era(
        name=CURRENT_ERA.name,
        config_key=CURRENT_ERA.config_key,
        started_by_id=account.id,
        started_at=datetime.now(timezone.utc) + timedelta(minutes=1),
    )
    db_session.add(new_era)
    await db_session.flush()
    await apply_era_reset([], new_era, db_session)

    await db_session.refresh(duel)
    assert duel.status == DuelStatus.resolved and duel.winner_character_id is None
    final = (await _stats(db_session, challenger, era)).score
    assert final == round(10 * OWN_TASK_MODIFIER + 5)
    assert final < provisional


async def test_the_cli_roll_opens_the_board_the_admin_roll_does(
    db_session, account, character, era, some_faction, monkeypatch
):
    await make_admin(db_session, account, commit=False)
    slug = real_faction_slugs(CURRENT_ERA)[0]
    await make_task(db_session, character, title="Alpha", faction_slug=slug)
    listed = dataclasses.replace(
        CURRENT_ERA,
        reactivate_tasks=("Alpha",),
        tasks=(
            TaskDef(
                title="Beta",
                description="d",
                faction_slug=slug,
                level_required=1,
                point_value=5,
            ),
        ),
    )
    import scripts.era_reset as era_reset

    monkeypatch.setattr(era_reset, "era_config_for_key", lambda key: listed)

    assert await reset_era(db_session, character.username, confirmed=True) == 0

    rows = (await db_session.execute(select(Task))).scalars().all()
    assert {t.title for t in rows if t.status == TaskStatus.active} == {"Alpha", "Beta"}
