"""One ACCOUNT may not hold both sides of a duel (#1237, ADR-0041).

The guard used to compare *character* ids, so two characters on one account read
as two different players: the main could challenge a throwaway alt, the alt could
accept (acceptance has no task-level gate, ADR-0051), and a forfeit would then
hand the main a deterministic duel-win multiplier ahead of any votes (ADR-0052).

Both entry points are pinned here. The single-character case is deliberately NOT
the interesting one — it passed before the fix and proves nothing — so every test
below uses *two distinct characters on one account*, plus a cross-account control
so a failure can't be explained away by some unrelated precondition.
"""
from typing import Optional

import pytest
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from game_config import CURRENT_ERA
from models.account import Account
from models.character import Character
from models.character_stats import CharacterStats
from models.duel import Duel, DuelStatus
from models.era import Era
from models.praxis import (
    ModerationStatus,
    Praxis,
    PraxisMember,
    PraxisStatus,
    PraxisType,
)
from errors import ErrorCode
from models.task import Task
from services.duel import (
    SELF_DUEL_DETAIL,
    issue_duel_challenge,
    respond_to_duel_challenge,
)

from fastapi import HTTPException
from tests.integration.factories import DEFAULT_FACTION_SLUG


async def _make_character(
    session: AsyncSession,
    account: Account,
    era: Era,
    username: str,
    level: int,
) -> Character:
    """A character on ``account`` seated at ``level`` in the current era."""
    character = Character(
        account_id=account.id,
        username=username,
        display_name=username,
        faction_slug=DEFAULT_FACTION_SLUG,
    )
    session.add(character)
    await session.flush()
    session.add(
        CharacterStats(
            character_id=character.id,
            era_id=era.id,
            score=0,
            all_time_score=0,
            level=level,
            votes_spent_this_era=0,
        )
    )
    await session.flush()
    return character


async def _make_in_progress_praxis(
    session: AsyncSession, task: Task, author: Character
) -> Praxis:
    """The challenger's solo praxis — a duel is attached to an existing one (ADR-0011)."""
    praxis = Praxis(
        task_id=task.id,
        type=PraxisType.solo,
        status=PraxisStatus.in_progress,
        moderation_status=ModerationStatus.visible,
        created_by_id=author.id,
    )
    session.add(praxis)
    await session.flush()
    session.add(
        PraxisMember(praxis_id=praxis.id, character_id=author.id, has_submitted=False)
    )
    await session.flush()
    return praxis


async def _set_level(session: AsyncSession, character: Character, era: Era, level: int) -> None:
    result = await session.execute(
        select(CharacterStats).where(
            CharacterStats.character_id == character.id,
            CharacterStats.era_id == era.id,
        )
    )
    stats = result.scalar_one()
    stats.level = level
    await session.flush()


# ---------------------------------------------------------------------------
# Entry point 1 — issuing the challenge
# ---------------------------------------------------------------------------


@pytest.mark.asyncio
async def test_challenging_an_alt_on_the_same_account_is_rejected(
    db_session: AsyncSession,
    account: Account,
    character: Character,
    era: Era,
    active_task: Task,
) -> None:
    """Two DIFFERENT character ids, one account — the case that used to slip through."""
    await _set_level(db_session, character, era, CURRENT_ERA.duel_level_required)
    alt = await _make_character(
        db_session, account, era, "sockpuppet", CURRENT_ERA.duel_level_required
    )
    challenger_praxis = await _make_in_progress_praxis(db_session, active_task, character)
    assert alt.id != character.id
    assert alt.account_id == character.account_id

    with pytest.raises(HTTPException) as exception_info:
        await issue_duel_challenge(
            challenger_character_id=character.id,
            challenger_praxis_id=challenger_praxis.id,
            opponent_character_id=alt.id,
            session=db_session,
        )

    assert exception_info.value.status_code == 400
    assert exception_info.value.detail == {
        "code": ErrorCode.duel_self_challenge.value,
        "message": SELF_DUEL_DETAIL,
    }

    # No Duel row was created.
    result = await db_session.execute(
        select(Duel).where(Duel.challenger_praxis_id == challenger_praxis.id)
    )
    assert result.scalar_one_or_none() is None


@pytest.mark.asyncio
async def test_challenging_your_own_character_is_still_rejected(
    db_session: AsyncSession,
    character: Character,
    era: Era,
    active_task: Task,
) -> None:
    """The pre-existing same-id case keeps working — the account lookup didn't lose it."""
    await _set_level(db_session, character, era, CURRENT_ERA.duel_level_required)
    challenger_praxis = await _make_in_progress_praxis(db_session, active_task, character)

    with pytest.raises(HTTPException) as exception_info:
        await issue_duel_challenge(
            challenger_character_id=character.id,
            challenger_praxis_id=challenger_praxis.id,
            opponent_character_id=character.id,
            session=db_session,
        )

    assert exception_info.value.status_code == 400
    assert exception_info.value.detail == {
        "code": ErrorCode.duel_self_challenge.value,
        "message": SELF_DUEL_DETAIL,
    }


@pytest.mark.asyncio
async def test_challenging_a_character_on_another_account_still_succeeds(
    db_session: AsyncSession,
    character: Character,
    character2: Character,
    era: Era,
    active_task: Task,
) -> None:
    """Control for the two tests above: identical setup, a different account."""
    await _set_level(db_session, character, era, CURRENT_ERA.duel_level_required)
    challenger_praxis = await _make_in_progress_praxis(db_session, active_task, character)
    assert character2.account_id != character.account_id

    _praxis, duel = await issue_duel_challenge(
        challenger_character_id=character.id,
        challenger_praxis_id=challenger_praxis.id,
        opponent_character_id=character2.id,
        session=db_session,
    )

    assert duel.status == DuelStatus.pending
    assert duel.opponent_character_id == character2.id


# ---------------------------------------------------------------------------
# Entry point 2 — responding to the challenge
# ---------------------------------------------------------------------------


async def _pending_same_account_duel(
    db_session: AsyncSession,
    account: Account,
    character: Character,
    era: Era,
    task: Task,
) -> tuple[Duel, Character]:
    """A pending same-account duel written straight to the DB.

    Deliberately bypasses ``issue_duel_challenge``, which now rejects it: this is
    the shape a row created before the guard existed would have, and the only way
    to reach the responder path independently of the challenge path.
    """
    await _set_level(db_session, character, era, CURRENT_ERA.duel_level_required)
    alt = await _make_character(
        db_session, account, era, "sockpuppet", CURRENT_ERA.duel_level_required
    )
    challenger_praxis = await _make_in_progress_praxis(db_session, task, character)
    duel = Duel(
        task_id=task.id,
        challenger_praxis_id=challenger_praxis.id,
        opponent_character_id=alt.id,
        status=DuelStatus.pending,
    )
    db_session.add(duel)
    await db_session.flush()
    return duel, alt


@pytest.mark.asyncio
async def test_accepting_a_challenge_from_your_own_character_is_rejected(
    db_session: AsyncSession,
    account: Account,
    character: Character,
    era: Era,
    active_task: Task,
) -> None:
    """The invited character IS the responder, so the invitation check passes —
    only the account comparison stops this."""
    duel, alt = await _pending_same_account_duel(
        db_session, account, character, era, active_task
    )

    with pytest.raises(HTTPException) as exception_info:
        await respond_to_duel_challenge(duel.id, alt.id, True, db_session)

    assert exception_info.value.status_code == 400
    assert exception_info.value.detail == {
        "code": ErrorCode.duel_self_challenge.value,
        "message": SELF_DUEL_DETAIL,
    }
    assert duel.status == DuelStatus.pending
    assert duel.opponent_praxis_id is None


@pytest.mark.asyncio
async def test_declining_a_challenge_from_your_own_character_is_allowed(
    db_session: AsyncSession,
    account: Account,
    character: Character,
    era: Era,
    active_task: Task,
) -> None:
    """The guard is on the ACCEPT path only, so a same-account challenge that
    predates it can still be dissolved rather than stranded as pending."""
    duel, alt = await _pending_same_account_duel(
        db_session, account, character, era, active_task
    )

    opponent_praxis: Optional[Praxis]
    opponent_praxis, updated_duel = await respond_to_duel_challenge(
        duel.id, alt.id, False, db_session
    )

    assert opponent_praxis is None
    assert updated_duel.status == DuelStatus.declined
    assert updated_duel.declined_at is not None


@pytest.mark.asyncio
async def test_accepting_a_challenge_from_another_account_still_succeeds(
    db_session: AsyncSession,
    character: Character,
    character2: Character,
    era: Era,
    active_task: Task,
) -> None:
    """Control for the responder guard: the ordinary two-account duel still accepts."""
    await _set_level(db_session, character, era, CURRENT_ERA.duel_level_required)
    await _set_level(db_session, character2, era, CURRENT_ERA.duel_level_required)
    challenger_praxis = await _make_in_progress_praxis(db_session, active_task, character)
    duel = Duel(
        task_id=active_task.id,
        challenger_praxis_id=challenger_praxis.id,
        opponent_character_id=character2.id,
        status=DuelStatus.pending,
    )
    db_session.add(duel)
    await db_session.flush()

    opponent_praxis, updated_duel = await respond_to_duel_challenge(
        duel.id, character2.id, True, db_session
    )

    assert opponent_praxis is not None
    assert updated_duel.status == DuelStatus.active
    assert updated_duel.opponent_praxis_id == opponent_praxis.id
