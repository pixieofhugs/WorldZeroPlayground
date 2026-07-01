import dataclasses
import re
from typing import Optional

from fastapi import HTTPException
from sqlalchemy import func, or_, select
from sqlalchemy.sql import Select, false as sa_false
from sqlalchemy.ext.asyncio import AsyncSession

from game_config import CURRENT_ERA, EraConfig
from models.account import Account
from models.character import Character, CharacterStatus
from models.character_stats import CharacterStats
from models.invitation_letter import InvitationLetter
from models.praxis import ModerationStatus, Praxis, PraxisMember, PraxisStatus
from models.task import Task
from schemas.character import CharacterCreate, CharacterOut, CharacterUpdate
from services.era import get_current_era_row, get_current_era_row_safe, get_or_create_stats
from services.scoring import compute_level, compute_vote_budget, compute_votes_available

# Status set for the account-scoped roster: a player's own lives, excluding banned.
_ROSTER_STATUSES: frozenset[CharacterStatus] = frozenset(
    {CharacterStatus.active, CharacterStatus.paused}
)
_DEFAULT_HANDLE = "wanderer"
_HANDLE_MAX_LEN = 14


def build_character_out(
    character: Character,
    stats: CharacterStats | None,
) -> CharacterOut:
    """Flatten a Character row plus its (optional) CharacterStats into CharacterOut.

    votes_available is computed on read from stats.score and votes_spent_this_era.
    """
    return CharacterOut(
        id=character.id,
        username=character.username,
        display_name=character.display_name,
        bio=character.bio,
        avatar_url=character.avatar_url,
        location=character.location,
        faction_slug=character.faction_slug,
        status=character.status.value,
        created_at=character.created_at,
        score=stats.score if stats else 0,
        all_time_score=stats.all_time_score if stats else 0,
        level=stats.level if stats else 0,
        votes_available=compute_votes_available(stats) if stats else 0,
    )


@dataclasses.dataclass(frozen=True)
class CharacterCreationResult:
    character: Character
    stats: CharacterStats


async def get_character_by_id(character_id: int, session: AsyncSession) -> Character | None:
    result = await session.execute(
        select(Character).where(
            Character.id == character_id,
            Character.status == CharacterStatus.active,
        )
    )
    return result.scalar_one_or_none()


ALBESCENT_FACTION_SLUG = "albescent"

_ALBESCENT_SENTINEL_SLUGS: frozenset[str] = frozenset({"na", "aged_out", "albescent"})


async def _account_has_character_at_level(
    account_id: int,
    min_level: int,
    session: AsyncSession,
) -> bool:
    """True when the account has at least one active character with stats.level >= min_level
    in the current era."""
    era_row = await get_current_era_row(session)
    result = await session.execute(
        select(Character.id)
        .join(
            CharacterStats,
            (CharacterStats.character_id == Character.id)
            & (CharacterStats.era_id == era_row.id),
        )
        .where(
            Character.account_id == account_id,
            Character.status == CharacterStatus.active,
            CharacterStats.level >= min_level,
        )
        .limit(1)
    )
    return result.scalar_one_or_none() is not None


async def can_create_additional_character(
    account_id: int,
    session: AsyncSession,
    era: EraConfig = CURRENT_ERA,
) -> bool:
    """True when this account may create another character.

    Requires at least one existing active character at level
    ``era.second_character_level_required`` or above in the current era.
    """
    return await _account_has_character_at_level(
        account_id, era.second_character_level_required, session
    )


async def can_start_as_albescent(
    account_id: int,
    session: AsyncSession,
    era: EraConfig = CURRENT_ERA,
) -> bool:
    """True when this account may create a new character in the Albescent faction.

    Both conditions must hold on the *same* character:
    (a) active and at level ``era.albescent_level_required`` or above, and
    (b) has a submitted, non-hidden qualifying praxis for every non-sentinel
        faction in the era (i.e. every faction except ``na``, ``aged_out``,
        and ``albescent``).
    """
    required_faction_slugs = frozenset(
        slug for slug in era.factions if slug not in _ALBESCENT_SENTINEL_SLUGS
    )
    era_row = await get_current_era_row(session)

    level_result = await session.execute(
        select(Character.id)
        .join(
            CharacterStats,
            (CharacterStats.character_id == Character.id)
            & (CharacterStats.era_id == era_row.id),
        )
        .where(
            Character.account_id == account_id,
            Character.status == CharacterStatus.active,
            CharacterStats.level >= era.albescent_level_required,
        )
    )
    qualifying_character_ids = [row[0] for row in level_result.all()]

    if not qualifying_character_ids:
        return False

    if not required_faction_slugs:
        return True

    for character_id in qualifying_character_ids:
        covered_result = await session.execute(
            select(Task.primary_faction_slug)
            .distinct()
            .join(Praxis, Praxis.task_id == Task.id)
            .where(
                Praxis.created_by_id == character_id,
                Praxis.status == PraxisStatus.submitted,
                Praxis.moderation_status.in_(
                    [ModerationStatus.visible, ModerationStatus.flagged]
                ),
                Task.primary_faction_slug.in_(list(required_faction_slugs)),
            )
        )
        covered_slugs = frozenset(row[0] for row in covered_result.all())
        if covered_slugs >= required_faction_slugs:
            return True

    return False


async def get_account_invited_faction_slugs(
    account_id: int,
    session: AsyncSession,
    era: EraConfig = CURRENT_ERA,
) -> list[str]:
    """Faction slugs the account holds a current-era invitation for (ADR-0019).

    Account-pooled: an invite on *any* of the account's characters counts. Sentinels
    (``na``, ``aged_out``) and ``albescent`` are excluded — they are never invite-joinable.
    Returns ``[]`` when the era is unseeded or no invites exist (the norm until #272
    delivers invitations).
    """
    era_row = await get_current_era_row_safe(session)
    if era_row is None:
        return []
    result = await session.execute(
        select(InvitationLetter.faction_slug)
        .distinct()
        .join(Character, Character.id == InvitationLetter.character_id)
        .where(
            Character.account_id == account_id,
            InvitationLetter.era_id == era_row.id,
            InvitationLetter.faction_slug.notin_(list(_ALBESCENT_SENTINEL_SLUGS)),
        )
    )
    return sorted(row[0] for row in result.all())


async def _derive_unique_username(display_name: str, session: AsyncSession) -> str:
    """Lowercase + strip non-alphanumerics + slice; ``wanderer`` fallback; auto-suffix
    (``wren``, ``wren2``, …) until globally unique."""
    base = re.sub(r"[^a-z0-9]", "", display_name.lower())[:_HANDLE_MAX_LEN] or _DEFAULT_HANDLE
    candidate = base
    suffix = 2
    # ponytail: serial probe; the username UNIQUE constraint is the real backstop
    # against a concurrent-create race. Loop handles the common (sequential) case.
    while await session.scalar(
        select(Character.id).where(Character.username == candidate)
    ) is not None:
        candidate = f"{base}{suffix}"
        suffix += 1
    return candidate


async def resolve_active_character(
    account: Account,
    session: AsyncSession,
) -> Character | None:
    """The account's "carried" life: ``active_character_id`` when it points at an
    owned active character, else the most-recently-created active one, else None."""
    if account.active_character_id is not None:
        active = await session.scalar(
            select(Character).where(
                Character.id == account.active_character_id,
                Character.account_id == account.id,
                Character.status == CharacterStatus.active,
            )
        )
        if active is not None:
            return active
    return await session.scalar(
        select(Character)
        .where(
            Character.account_id == account.id,
            Character.status == CharacterStatus.active,
        )
        .order_by(Character.created_at.desc())
        .limit(1)
    )


async def set_active_character(
    account: Account,
    character_id: int,
    session: AsyncSession,
) -> None:
    """Point the account at a different owned, active life. 404 if not owned/missing,
    409 if the target life is paused/banned (can't carry a non-active life)."""
    character = await session.get(Character, character_id)
    if character is None or character.account_id != account.id:
        raise HTTPException(status_code=404, detail="Character not found.")
    if character.status != CharacterStatus.active:
        raise HTTPException(status_code=409, detail="That life is not active.")
    account.active_character_id = character_id
    await session.flush()


async def list_account_roster(
    account: Account,
    session: AsyncSession,
) -> list[tuple[Character, CharacterStats | None]]:
    """The account's own lives (active + paused, not banned) with current-era stats,
    carried life first then newest-first."""
    era_row = await get_current_era_row_safe(session)
    era_id = era_row.id if era_row else None
    join_condition = (
        (CharacterStats.character_id == Character.id) & sa_false()
        if era_id is None
        else (CharacterStats.character_id == Character.id)
        & (CharacterStats.era_id == era_id)
    )
    result = await session.execute(
        select(Character, CharacterStats)
        .outerjoin(CharacterStats, join_condition)
        .where(
            Character.account_id == account.id,
            Character.status.in_(list(_ROSTER_STATUSES)),
        )
        .order_by(Character.created_at.desc())
    )
    rows = list(result.all())
    active = await resolve_active_character(account, session)
    active_id = active.id if active else None
    # Carried life first; created_at desc otherwise (already ordered by the query).
    rows.sort(key=lambda row: row[0].id != active_id)
    return rows


async def create_character(
    account_id: int,
    data: CharacterCreate,
    session: AsyncSession,
    era: EraConfig = CURRENT_ERA,
) -> CharacterCreationResult:
    era_row = await get_current_era_row(session)

    display_name = (data.display_name or "").strip()
    if not display_name:
        raise HTTPException(status_code=400, detail="A chosen name is required.")

    requested_faction_slug = (data.faction_slug or "").strip().lower() or None

    # Count existing active characters for this account
    result = await session.execute(
        select(func.count()).select_from(Character).where(
            Character.account_id == account_id,
            Character.status == CharacterStatus.active,
        )
    )
    existing_count = result.scalar_one()

    if existing_count > 0:
        # Need level >= era.second_character_level_required on at least one
        # character to create another.
        if not await can_create_additional_character(account_id, session, era):
            raise HTTPException(
                status_code=403,
                detail=(
                    f"Must reach level {era.second_character_level_required} "
                    "before creating additional characters."
                ),
            )

    # ADR-0019: born unaffiliated by default. A non-None faction must be one the
    # account holds an invitation for. Albescent is never a creation option.
    if requested_faction_slug is None:
        starting_faction_slug = "na"
    elif requested_faction_slug == ALBESCENT_FACTION_SLUG:
        raise HTTPException(
            status_code=400,
            detail="Albescent is joined in the field, not chosen at creation.",
        )
    else:
        invited = await get_account_invited_faction_slugs(account_id, session, era)
        if requested_faction_slug not in invited:
            raise HTTPException(
                status_code=400,
                detail="You don't hold an invitation for that faction.",
            )
        starting_faction_slug = requested_faction_slug

    explicit_username = (data.username or "").strip() or None
    username = explicit_username or await _derive_unique_username(display_name, session)

    character = Character(
        account_id=account_id,
        username=username,
        display_name=display_name,
        bio=data.bio or "",
        avatar_url=data.avatar_url or "",
        location=data.location or "",
        faction_slug=starting_faction_slug,
    )
    session.add(character)
    await session.flush()  # get character.id before creating stats

    stats = await get_or_create_stats(
        session,
        character_id=character.id,
        era_id=era_row.id,
    )

    # Carry the new life: it becomes the account's active character.
    account = await session.get(Account, account_id)
    account.active_character_id = character.id

    await session.flush()
    await session.refresh(character)
    await session.refresh(stats)
    return CharacterCreationResult(character=character, stats=stats)


async def update_character(
    character_id: int,
    data: CharacterUpdate,
    session: AsyncSession,
) -> Character:
    character = await get_character_by_id(character_id, session)
    if character is None:
        raise HTTPException(status_code=404, detail="Character not found.")

    for field, value in data.model_dump(exclude_unset=True).items():
        if value is None:
            value = ""
        setattr(character, field, value)

    await session.flush()
    await session.refresh(character)
    return character


async def soft_delete_character(
    character_id: int,
    session: AsyncSession,
    era: EraConfig = CURRENT_ERA,
) -> None:
    character = await get_character_by_id(character_id, session)
    if character is None:
        raise HTTPException(status_code=404, detail="Character not found.")
    character.status = CharacterStatus.banned

    # ADR-0011 §Forfeit (#307): a ban forfeits every *settled* duel the banned
    # character is a side of — the opponent wins by default. Sticky: leave duels
    # already forfeited untouched. Recalc the winners so their win modifier lands
    # (the banned side's own score is never read, so we don't recalc it).
    from models.duel import Duel, DuelStatus
    from services.character_stats import recalculate_character_stats

    own_praxis_ids = select(Praxis.id).where(Praxis.created_by_id == character_id)
    duels = (await session.execute(
        select(Duel).where(
            Duel.status == DuelStatus.settled,
            Duel.forfeited_by_character_id.is_(None),
            or_(
                Duel.opponent_character_id == character_id,
                Duel.challenger_praxis_id.in_(own_praxis_ids),
            ),
        )
    )).scalars().all()

    winner_ids: set[int] = set()
    for duel in duels:
        duel.forfeited_by_character_id = character_id
        challenger_praxis = await session.get(Praxis, duel.challenger_praxis_id)
        challenger_character_id = (
            challenger_praxis.created_by_id if challenger_praxis else None
        )
        winner_id = (
            duel.opponent_character_id
            if challenger_character_id == character_id
            else challenger_character_id
        )
        if winner_id is not None:
            winner_ids.add(winner_id)
    await session.flush()

    if winner_ids:
        era_row = await get_current_era_row(session)
        for winner_id in winner_ids:
            await recalculate_character_stats(
                winner_id, session, era, era_row=era_row
            )
        await session.flush()


def _character_stats_era_join(era_id: int | None) -> Select:
    """Return a ``select(Character, CharacterStats)`` outer-joined on the given era.

    When ``era_id`` is None (era unseeded), the join evaluates to false so every
    ``CharacterStats`` column is NULL — the caller still gets a row per Character
    and ``build_character_out`` substitutes zero stats.
    """
    if era_id is None:
        join_condition = (CharacterStats.character_id == Character.id) & sa_false()
    else:
        join_condition = (
            (CharacterStats.character_id == Character.id)
            & (CharacterStats.era_id == era_id)
        )
    return (
        select(Character, CharacterStats)
        .outerjoin(CharacterStats, join_condition)
        .where(Character.status == CharacterStatus.active)
    )


async def list_characters_for_viewer(
    session: AsyncSession,
    *,
    search: Optional[str] = None,
    faction_slug: Optional[str] = None,
    exclude_active_task_id: Optional[int] = None,
    limit: int = 50,
    offset: int = 0,
) -> list[tuple[Character, CharacterStats | None]]:
    """List active characters with current-era stats. Optional name/faction filters.

    ``exclude_active_task_id`` drops characters who already hold an active
    (in_progress or submitted) praxis membership for that task — so the invite
    search doesn't surface players the backend would 409 (#320). Everymen are
    never excluded (Double Dipper perk: they may hold multiple memberships per
    task), mirroring :func:`services.praxis.is_active_member_of_task`.
    """
    from services.praxis import EVERYMEN_FACTION_SLUG

    era_row = await get_current_era_row_safe(session)
    era_id = era_row.id if era_row else None

    query = _character_stats_era_join(era_id)
    if search:
        # Match on handle OR display name so "@Mol" surfaces "Molly" (@mollusk).
        # The inserted mention is still @username; display_name only *matches*.
        query = query.where(
            or_(
                Character.username.ilike(f"%{search}%"),
                Character.display_name.ilike(f"%{search}%"),
            )
        )
    if faction_slug:
        query = query.where(Character.faction_slug == faction_slug)
    if exclude_active_task_id is not None:
        active_member_ids = (
            select(PraxisMember.character_id)
            .join(Praxis, PraxisMember.praxis_id == Praxis.id)
            .where(
                Praxis.task_id == exclude_active_task_id,
                Praxis.status.in_([PraxisStatus.in_progress, PraxisStatus.submitted]),
            )
        )
        query = query.where(
            or_(
                Character.faction_slug == EVERYMEN_FACTION_SLUG,
                Character.id.notin_(active_member_ids),
            )
        )
    query = (
        query.order_by(CharacterStats.score.desc().nulls_last())
        .limit(limit)
        .offset(offset)
    )

    result = await session.execute(query)
    return list(result.all())
