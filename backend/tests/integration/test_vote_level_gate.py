"""Voting is gated on having EVER reached ``era.vote_level_required`` (#3102).

The seam under test is ``services.vote.cast_vote_on_praxis`` (what
``POST /praxes/{id}/vote`` calls) plus the ``can_vote`` flag ``/auth/me``
advertises. Both read one predicate, ``services.era_gates.may_vote``, over one
durable fact, ``Character.peak_level`` — which ``apply_era_reset`` never lowers,
so a veteran keeps the vote when a rollover returns them to level 0.

Every level here is read off the live era; none is restated.
"""
import importlib.util
from pathlib import Path

import pytest
from fastapi import HTTPException
from httpx import AsyncClient
from sqlalchemy import select, text
from sqlalchemy.ext.asyncio import AsyncSession

from errors import ErrorCode
from game_config import CURRENT_ERA
from models.account import Account
from models.character import Character
from models.character_stats import CharacterStats
from models.era import Era
from models.praxis import Praxis
from services.auth import create_jwt
from services.character_stats import recalculate_character_stats
from services.era import apply_era_reset
from services.vote import cast_vote_on_praxis
from tests.integration.factories import make_character, make_solo_praxis, make_task

# Every character here is seated in a faction row the seed fixture provides.
pytestmark = pytest.mark.usefixtures("some_faction")

REQUIRED_LEVEL: int = CURRENT_ERA.vote_level_required
_MIGRATION_PATH = (
    Path(__file__).resolve().parents[2]
    / "alembic"
    / "versions"
    / "0022_character_peak_level.py"
)


async def _sealed_praxis(session: AsyncSession, task, author: Character) -> Praxis:
    """A factory praxis with its member roster loaded.

    The factory adds the ``PraxisMember`` after the praxis is already in the
    identity map, so ``praxis.members`` is unloaded until a refresh — and the
    ownership check reads it.
    """
    praxis = await make_solo_praxis(session, task, author)
    await session.refresh(praxis)
    return praxis


async def _someone_elses_praxis(session: AsyncSession, era: Era) -> Praxis:
    author = await make_character(session, era, username="gate_author", level=5)
    task = await make_task(session, author, title="gate target task")
    return await _sealed_praxis(session, task, author)


async def _roll_era(
    session: AsyncSession, account: Account, characters: list[Character]
) -> Era:
    new_era_row = Era(
        name=CURRENT_ERA.name,
        config_key=CURRENT_ERA.config_key,
        started_by=account.id,
    )
    session.add(new_era_row)
    await session.flush()
    await apply_era_reset(characters, new_era_row, session)
    return new_era_row


async def _assert_gated(
    voter: Character, praxis: Praxis, session: AsyncSession
) -> None:
    with pytest.raises(HTTPException) as refusal:
        await cast_vote_on_praxis(voter, praxis.id, 4, session)
    assert refusal.value.status_code == 403
    assert refusal.value.detail["code"] == ErrorCode.vote_level_too_low.value


@pytest.mark.asyncio
async def test_never_reached_the_level_is_refused_with_a_named_code(
    client: AsyncClient, db_session: AsyncSession, era: Era
):
    praxis = await _someone_elses_praxis(db_session, era)
    newcomer = await make_character(
        db_session, era, username="gate_newcomer", level=REQUIRED_LEVEL - 1
    )
    await db_session.commit()
    headers = {"Authorization": f"Bearer {create_jwt(newcomer.account_id)}"}

    vote = await client.post(
        f"/praxes/{praxis.id}/vote", json={"value": 4}, headers=headers
    )
    assert vote.status_code == 403
    assert vote.json()["detail"]["code"] == ErrorCode.vote_level_too_low.value

    me = (await client.get("/auth/me", headers=headers)).json()
    assert me["can_vote"] is False
    assert me["vote_level_required"] == REQUIRED_LEVEL
    # The gate is its own signal: the per-praxis flag still says the module
    # exists, so the client draws the gate line rather than nothing.
    detail = (await client.get(f"/praxes/{praxis.id}", headers=headers)).json()
    assert detail["viewer_can_vote"] is True


@pytest.mark.asyncio
async def test_reaching_the_level_allows_a_vote_immediately(
    db_session: AsyncSession, era: Era
):
    praxis = await _someone_elses_praxis(db_session, era)
    climber = await make_character(db_session, era, username="gate_climber")
    await _assert_gated(climber, praxis, db_session)

    # The real way up: a sealed praxis worth the level's threshold, then the
    # one recalculation every score change runs through.
    own_task = await make_task(
        db_session,
        climber,
        title="gate climb task",
        point_value=CURRENT_ERA.level_thresholds[REQUIRED_LEVEL],
    )
    await make_solo_praxis(db_session, own_task, climber)
    await recalculate_character_stats(climber.id, db_session)
    await db_session.flush()
    await db_session.refresh(climber)
    assert climber.peak_level >= REQUIRED_LEVEL

    cast = await cast_vote_on_praxis(climber, praxis.id, 4, db_session)
    assert cast.vote.value == 4


@pytest.mark.asyncio
async def test_a_veteran_keeps_the_vote_across_an_era_reset_and_a_newcomer_does_not(
    db_session: AsyncSession, era: Era, account: Account
):
    praxis = await _someone_elses_praxis(db_session, era)
    veteran = await make_character(
        db_session, era, username="gate_veteran", level=REQUIRED_LEVEL
    )

    new_era_row = await _roll_era(db_session, account, [veteran])

    stats = (
        await db_session.execute(
            select(CharacterStats).where(
                CharacterStats.character_id == veteran.id,
                CharacterStats.era_id == new_era_row.id,
            )
        )
    ).scalar_one()
    # The premise, not the claim: the reset really did return them to level 0.
    assert CURRENT_ERA.reset_level and stats.level == 0

    cast = await cast_vote_on_praxis(veteran, praxis.id, 5, db_session)
    assert cast.vote.value == 5

    newcomer = await make_character(
        db_session, new_era_row, username="gate_after_reset"
    )
    await _assert_gated(newcomer, praxis, db_session)


@pytest.mark.asyncio
async def test_a_gated_character_still_gets_the_own_praxis_refusal(
    db_session: AsyncSession, era: Era
):
    """ADR-0041's refusal is unchanged and still answers first."""
    newcomer = await make_character(db_session, era, username="gate_self_voter")
    task = await make_task(db_session, newcomer, title="gate own task")
    own_praxis = await _sealed_praxis(db_session, task, newcomer)

    with pytest.raises(HTTPException) as refusal:
        await cast_vote_on_praxis(newcomer, own_praxis.id, 4, db_session)
    assert refusal.value.status_code == 403
    assert refusal.value.detail == "Cannot vote on your own praxis."


@pytest.mark.asyncio
async def test_backfill_qualifies_anyone_who_reached_the_level_in_any_era(
    db_session: AsyncSession, era: Era, account: Account
):
    spec = importlib.util.spec_from_file_location(
        "peak_level_migration", _MIGRATION_PATH
    )
    migration = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(migration)

    praxis = await _someone_elses_praxis(db_session, era)
    veteran = await make_character(
        db_session, era, username="gate_backfill_veteran", level=REQUIRED_LEVEL
    )
    never = await make_character(db_session, era, username="gate_backfill_never")
    await _roll_era(db_session, account, [veteran, never])
    # The state a deployed database is in the moment the column lands.
    veteran.peak_level = 0
    await db_session.flush()

    await db_session.execute(text(migration.BACKFILL_SQL))
    await db_session.refresh(veteran)
    await db_session.refresh(never)

    assert veteran.peak_level == REQUIRED_LEVEL
    assert never.peak_level == 0
    cast = await cast_vote_on_praxis(veteran, praxis.id, 3, db_session)
    assert cast.vote.value == 3
    await _assert_gated(never, praxis, db_session)
