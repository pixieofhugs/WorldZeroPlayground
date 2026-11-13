"""Row builders shared by the integration tests (fixtures for *the* row live in
conftest).

Builders flush, not commit: the test transaction rolls back anyway.

The default faction is frozen at import (#3014), defaults included. A test that
moves the era must pass the faction itself; ``test_live_era_frozen_constants.py``
enforces it.
"""

from typing import Optional

from sqlalchemy.ext.asyncio import AsyncSession

from faction_slugs import real_faction_slugs
from game_config import CURRENT_ERA
from models.account import Account
from models.character import Character, CharacterStatus
from models.character_stats import CharacterStats
from models.duel import Duel, DuelStatus
from models.praxis import (
    ModerationStatus,
    Praxis,
    PraxisMember,
    PraxisStatus,
    PraxisType,
)
from models.roles import AccountRole, Role
from models.task import Task, TaskStatus, TaskType
from models.vote import Vote

#: The live era's first real faction (not ``na``, not Albescent) (#2708).
#: A test may know only that it got *some* faction: read numbers off
#: ``era.factions[character.faction_slug]``, never a named slug. Perk-specific
#: tests live in ``tests/integration/eras/``.
DEFAULT_FACTION_SLUG = real_faction_slugs(CURRENT_ERA)[0]


async def make_account(session: AsyncSession, email: str) -> Account:
    account = Account(email=email)
    session.add(account)
    await session.flush()
    return account


async def make_admin(session: AsyncSession, account: Account, *, commit: bool = True) -> None:
    """Grant the admin role; ``commit`` for callers whose code opens its own session."""
    role = Role(name="admin", description="Administrator")
    session.add(role)
    await session.flush()
    session.add(AccountRole(account_id=account.id, role_id=role.id, granted_by=account.id))
    if commit:
        await session.commit()
    else:
        await session.flush()


async def make_character(
    session: AsyncSession,
    era,
    *,
    username: str,
    account: Optional[Account] = None,
    email: Optional[str] = None,
    display_name: Optional[str] = None,
    faction_slug: str = DEFAULT_FACTION_SLUG,
    level: int = 0,
    peak_level: Optional[int] = None,
    score: int = 0,
    all_time_score: int = 0,
    votes_spent_this_era: int = 0,
    status: CharacterStatus = CharacterStatus.active,
) -> Character:
    """A character with its ``era`` stats row; pass ``account`` for a second life."""
    if account is None:
        account = await make_account(session, email or f"{username}@example.com")
    character = Character(
        account_id=account.id,
        username=username,
        display_name=display_name or username,
        faction_slug=faction_slug,
        status=status,
        # Override only for a post-reset veteran (#3102).
        peak_level=level if peak_level is None else peak_level,
    )
    session.add(character)
    await session.flush()
    session.add(
        CharacterStats(
            character_id=character.id,
            era_id=era.id,
            score=score,
            all_time_score=all_time_score,
            level=level,
            votes_spent_this_era=votes_spent_this_era,
        )
    )
    await session.flush()
    return character


async def make_task(
    session: AsyncSession,
    creator: Character,
    *,
    title: str = "duel task",
    description: str = "proof",
    point_value: int = 10,
    level_required: int = 0,
    status: TaskStatus = TaskStatus.active,
    task_type: TaskType = TaskType.standard,
    faction_slug: str = DEFAULT_FACTION_SLUG,
    commit: bool = False,
) -> Task:
    """A task by ``creator``; by default own-faction for a default character.

    ``commit`` for suites that read it from a second session.
    """
    task = Task(
        title=title,
        description=description,
        point_value=point_value,
        level_required=level_required,
        status=status,
        task_type=task_type,
        created_by=creator.id,
        primary_faction_slug=faction_slug,
    )
    session.add(task)
    if commit:
        await session.commit()
        await session.refresh(task)
    else:
        await session.flush()
    return task


async def make_solo_praxis(
    session: AsyncSession,
    task: Task,
    author: Character,
    *,
    title: str = "side",
    body_text: str = "proof",
    status: PraxisStatus = PraxisStatus.submitted,
    moderation_status: ModerationStatus = ModerationStatus.visible,
) -> Praxis:
    """A solo praxis on ``task`` with ``author`` as its one member."""
    praxis = Praxis(
        task_id=task.id,
        created_by_id=author.id,
        type=PraxisType.solo,
        status=status,
        title=title,
        body_text=body_text,
        moderation_status=moderation_status,
    )
    session.add(praxis)
    await session.flush()
    session.add(PraxisMember(praxis_id=praxis.id, character_id=author.id))
    await session.flush()
    return praxis


async def cast_vote(session: AsyncSession, praxis: Praxis, voter: Character, value: int) -> None:
    session.add(
        Vote(
            praxis_id=praxis.id,
            voter_character_id=voter.id,
            voter_account_id=voter.account_id,
            value=value,
        )
    )
    await session.flush()


async def make_duel(
    session: AsyncSession,
    era,
    *,
    label: str,
    status: DuelStatus = DuelStatus.settled,
    challenger_votes: int = 0,
    opponent_votes: int = 0,
    forfeiter: Optional[str] = None,
    winner_character_id: Optional[int] = None,
    challenger_faction: str = DEFAULT_FACTION_SLUG,
    opponent_faction: str = DEFAULT_FACTION_SLUG,
    challenger_moderation: ModerationStatus = ModerationStatus.visible,
    opponent_moderation: ModerationStatus = ModerationStatus.visible,
    commit: bool = False,
) -> tuple[Duel, Character, Character]:
    """A duel: two characters, their solo praxes on ONE shared task, and one voter.

    ``label`` namespaces usernames. ``*_votes`` are the star value of a single
    vote (0 = unrated), not a count. The duel row names only the opponent; the
    challenger is the author of ``challenger_praxis_id``.
    """
    challenger = await make_character(
        session, era, username=f"{label}ch", faction_slug=challenger_faction
    )
    opponent = await make_character(
        session, era, username=f"{label}op", faction_slug=opponent_faction
    )
    voter = await make_character(session, era, username=f"{label}v")
    task = await make_task(session, challenger)
    challenger_praxis = await make_solo_praxis(
        session, task, challenger, moderation_status=challenger_moderation
    )
    opponent_praxis = await make_solo_praxis(
        session, task, opponent, moderation_status=opponent_moderation
    )

    if challenger_votes:
        await cast_vote(session, challenger_praxis, voter, challenger_votes)
    if opponent_votes:
        await cast_vote(session, opponent_praxis, voter, opponent_votes)

    forfeited_by = None
    if forfeiter == "challenger":
        forfeited_by = challenger.id
    elif forfeiter == "opponent":
        forfeited_by = opponent.id

    duel = Duel(
        task_id=task.id,
        challenger_praxis_id=challenger_praxis.id,
        opponent_character_id=opponent.id,
        opponent_praxis_id=opponent_praxis.id,
        status=status,
        forfeited_by_character_id=forfeited_by,
        winner_character_id=winner_character_id,
    )
    session.add(duel)
    if commit:
        await session.commit()
    else:
        await session.flush()
    return duel, challenger, opponent


async def rejoin_gate_open(
    character_id: int,
    target_slug: str,
    era_id: int,
    session,
    era=None,
) -> bool:
    """Is the rejoin lock (only) open, per ``move_refusal`` (#3168)? Ignores other
    locks."""
    from dataclasses import replace

    from errors import DETAIL_CODE_KEY, ErrorCode
    from services.faction_service import load_move_facts, move_refusal

    era = era or CURRENT_ERA
    character = await session.get(Character, character_id)
    facts = replace(
        await load_move_facts(character, era_id, session, era), current_slug=""
    )
    refusal = move_refusal(target_slug, facts, era)
    closed = {
        ErrorCode.faction_rejoin_forbidden.value,
        ErrorCode.faction_not_found.value,
    }
    return refusal is None or refusal.detail[DETAIL_CODE_KEY] not in closed
