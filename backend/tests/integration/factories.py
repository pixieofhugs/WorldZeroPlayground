"""Row builders shared by the integration tests.

``conftest.py`` holds pytest FIXTURES — one character, one task, one praxis,
injected by name. That covers a test that needs *the* character. It does not
cover a test that needs four of them, which is why thirty-odd suites grew a
private ``_make_character`` / ``_make_task`` / ``_make_admin`` / ``_make_duel``.
Sixty-four such helpers existed, several byte-identical to each other: three
copies of ``_make_task`` matched exactly, and all five ``_make_admin`` differed
only in whether they ended in ``flush()`` or ``commit()``.

So the builders live here as plain async functions, and the fixtures in
``conftest.py`` are built from them. Every keyword below is one that a caller
already varied — this is the union of the copies, not speculative flexibility.

Everything flushes rather than commits by default: ``db_session`` wraps each
test in a transaction it rolls back, so a flush is enough to make a row visible
to the request under test, and it keeps the id assignment explicit.
"""

from typing import Optional

from sqlalchemy.ext.asyncio import AsyncSession

from models.account import Account
from models.character import Character, CharacterStatus
from models.character_stats import CharacterStats
from models.duel import Duel, DuelStatus
from models.praxis import ModerationStatus, Praxis, PraxisMember, PraxisStatus, PraxisType
from models.roles import AccountRole, Role
from models.task import Task, TaskStatus
from models.vote import Vote


async def make_account(session: AsyncSession, email: str) -> Account:
    account = Account(email=email)
    session.add(account)
    await session.flush()
    return account


async def make_admin(session: AsyncSession, account: Account, *, commit: bool = True) -> None:
    """Grant the admin role to ``account``.

    ``commit`` because one caller (``test_era_reset_script``) drives a script
    that opens its own session and must not see a half-written grant.
    """
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
    faction_slug: str = "ua",
    level: int = 0,
    score: int = 0,
    all_time_score: int = 0,
    votes_spent_this_era: int = 0,
    status: CharacterStatus = CharacterStatus.active,
) -> Character:
    """A character seated in ``era``, with its stats row.

    Pass ``account`` for a second or third life on an existing account; leave it
    out and one is created from ``email`` (defaulting to ``<username>@example.com``).
    That split is the whole difference between the seven copies this replaces.
    """
    if account is None:
        account = await make_account(session, email or f"{username}@example.com")
    character = Character(
        account_id=account.id,
        username=username,
        display_name=display_name or username,
        faction_slug=faction_slug,
        status=status,
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
    faction_slug: str = "ua",
    commit: bool = False,
) -> Task:
    """An active task authored by ``creator``.

    ``ua`` is the default slug because it is the only faction the shared
    fixtures seed a row for, and most callers do not read the slug at all.
    """
    task = Task(
        title=title,
        description=description,
        point_value=point_value,
        level_required=level_required,
        status=status,
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
    challenger_faction: str = "ua",
    opponent_faction: str = "ua",
    challenger_moderation: ModerationStatus = ModerationStatus.visible,
    opponent_moderation: ModerationStatus = ModerationStatus.visible,
    commit: bool = False,
) -> tuple[Duel, Character, Character]:
    """A full duel: two characters, their two solo praxes, and one voter.

    ``label`` namespaces the usernames so several duels can coexist in one test
    without colliding on the unique constraint.

    ``challenger_votes`` / ``opponent_votes`` are the STAR VALUE of a single
    vote, not a count of votes — one voter rates each side at most once, which
    is what the anti-self-voting budget allows. Zero means the side went unrated.

    Note the duel row names only the OPPONENT character: the challenger is
    whoever authored ``challenger_praxis_id``. Reproduced here rather than
    tidied, because the schema is the schema.
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
