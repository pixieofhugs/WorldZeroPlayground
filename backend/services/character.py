import dataclasses
import re
from datetime import datetime, timezone
from typing import Optional

from fastapi import HTTPException
from sqlalchemy import and_, case, exists, func, or_, select, union
from sqlalchemy.exc import IntegrityError
from sqlalchemy.sql import Select, false as sa_false
from sqlalchemy.ext.asyncio import AsyncSession

from errors import ErrorCode, raise_coded
from faction_slugs import (
    ALBESCENT_FACTION_SLUG,
    UNAFFILIATED_FACTION_SLUG,
    faction_filter_slugs,
)
from game_config import CURRENT_ERA, EraConfig
from models.account import Account, AccountStatus
from models.character import Character, CharacterStatus
from models.character_stats import CharacterStats
from models.faction_defection_history import FactionDefectionHistory
from models.invitation_letter import InvitationLetter
from models.praxis import Praxis, PraxisMember, PraxisStatus
from schemas.character import BadgeOut, CharacterCreate, CharacterOut, CharacterUpdate
from services.albescent_reveal import is_albescent_revealed
from services.secret_faction import has_stamp, set_stamp
from services.era import get_current_era_row, get_current_era_row_safe, get_or_create_stats
from services.era_gates import meets_albescent_level
from services.media import delete_stored_avatar

# A life a moderator banned, as opposed to one its player left (``departed_at``).
MOD_BANNED = and_(
    Character.status == CharacterStatus.banned, Character.departed_at.is_(None)
)

# The rule is "not banned"; a set so a future life state needs no rewrite.
_ROSTER_STATUSES: frozenset[CharacterStatus] = frozenset({CharacterStatus.active})
_DEFAULT_HANDLE = "wanderer"
_HANDLE_MAX_LEN = 14


def build_character_out(
    character: Character,
    stats: CharacterStats | None,
    badges: list[BadgeOut] | None = None,
    invitations: list[str] | None = None,
) -> CharacterOut:
    """Flatten Character + optional stats. List callers should use
    :func:`build_character_outs` to batch badges (#655); ``invitations`` is only
    supplied by /auth/me (#243)."""
    return CharacterOut(
        id=character.id,
        username=character.username,
        display_name=character.display_name,
        bio=character.bio,
        tagline=character.tagline,
        avatar_url=character.avatar_url,
        location=character.location,
        faction_slug=character.faction_slug,
        status=character.status.value,
        created_at=character.created_at,
        score=stats.score if stats else 0,
        all_time_score=character.all_time_score,
        level=stats.level if stats else 0,
        badges=badges or [],
        invitations=invitations or [],
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


def record_level_reached(character: Character, level: int) -> None:
    """Raise ``peak_level``; never lower it (#3102). The column's only writer,
    enforced by ``test_peak_level_single_writer.py``."""
    character.peak_level = max(character.peak_level, level)


# ALBESCENT_FACTION_SLUG is re-exported from here for existing importers.

_ALBESCENT_SENTINEL_SLUGS: frozenset[str] = frozenset(
    {UNAFFILIATED_FACTION_SLUG, ALBESCENT_FACTION_SLUG}
)


def _sentinel_slugs(era: EraConfig) -> frozenset[str]:
    return frozenset({UNAFFILIATED_FACTION_SLUG, era.secret_faction_slug})


async def account_peak_level_and_ban(
    account_id: int,
    era_id: int,
    session: AsyncSession,
) -> tuple[int, bool]:
    """Highest level among the active characters in ``era_id`` (or 0), and
    whether a moderator ban stands, in one round trip."""
    row = (
        await session.execute(
            select(
                select(func.max(CharacterStats.level))
                .select_from(Character)
                .join(
                    CharacterStats,
                    (CharacterStats.character_id == Character.id)
                    & (CharacterStats.era_id == era_id),
                )
                .where(
                    Character.account_id == account_id,
                    Character.status == CharacterStatus.active,
                )
                .scalar_subquery(),
                exists().where(Character.account_id == account_id, MOD_BANNED),
            )
        )
    ).one()
    return row[0] or 0, bool(row[1])


async def _character_covers_every_faction(
    character: Character,
    era_id: int,
    session: AsyncSession,
    era: EraConfig,
) -> bool:
    """Invited to or ever a member of every faction, for one life in one era.

    Needs all three sources: letters exclude the held faction and are deleted on
    defection (#2218), which writes a defection row for the same slug instead.
    Era-scoped, hence the result is stamped (:func:`stamp_albescent_unlock`).
    """
    required_faction_slugs = frozenset(
        slug for slug in era.factions if slug not in _sentinel_slugs(era)
    )
    if not required_faction_slugs:
        return True

    covered_result = await session.execute(
        union(
            select(InvitationLetter.faction_slug).where(
                InvitationLetter.character_id == character.id,
                InvitationLetter.era_id == era_id,
            ),
            select(FactionDefectionHistory.faction_slug).where(
                FactionDefectionHistory.character_id == character.id,
                FactionDefectionHistory.era_id == era_id,
            ),
        )
    )
    covered_slugs = {row[0] for row in covered_result.all()} | {
        character.faction_slug
    }
    return covered_slugs >= required_faction_slugs


async def character_earns_albescent(
    character: Character,
    era_id: int,
    session: AsyncSession,
    era: EraConfig = CURRENT_ERA,
) -> bool:
    """Does this one life earn Albescent (level + every faction) now (#2399)?

    Banned lives never earn. The site asks :func:`can_start_as_albescent`.
    """
    if character.status not in _ROSTER_STATUSES:
        return False
    level = await session.scalar(
        select(CharacterStats.level).where(
            CharacterStats.character_id == character.id,
            CharacterStats.era_id == era_id,
        )
    )
    # Shared with the defect_to_faction ceiling (#2868); None is below it.
    if not meets_albescent_level(level, character.faction_slug, False, era):
        return False
    return await _character_covers_every_faction(character, era_id, session, era)


async def stamp_albescent_unlock(
    character: Character,
    era_id: int,
    session: AsyncSession,
    era: EraConfig = CURRENT_ERA,
) -> bool:
    """Sticky account unlock if ``character`` earned it (#2399); True if flipped.

    ``Character.account`` is ``lazy="raise"``, so the account is fetched by id.
    """
    slug = era.secret_faction_slug
    account = await session.get(Account, character.account_id)
    if account is None or slug is None or has_stamp(account, slug, "unlocked"):
        return False
    if not await character_earns_albescent(character, era_id, session, era):
        return False
    return set_stamp(account, slug, "unlocked")


async def stamp_albescent_glimpse(
    character: Character,
    level: int,
    session: AsyncSession,
    era: EraConfig = CURRENT_ERA,
) -> bool:
    """Sticky account flag once a life reaches the glimpse floor (#2770).

    Stamped, not derived, so an era reset to level 0 does not lose it;
    account-scoped so it does not blink with the character switcher. Returns
    True if this call flipped it.
    """
    slug = era.secret_faction_slug
    if slug is None or level < era.secret_faction_glimpse_level:
        return False
    account = await session.get(Account, character.account_id)
    if account is None:
        return False
    return set_stamp(account, slug, "glimpsed")


@dataclasses.dataclass(frozen=True)
class AccountEligibility:
    """The two account-collective unlock flags /auth/me dresses the site with.

    Defaults are the "era not seeded yet" answer: no unlocks.
    """

    can_create_additional_character: bool = False
    can_start_as_albescent: bool = False


async def load_account_eligibility(
    account_id: int,
    era_id: int,
    session: AsyncSession,
    era: EraConfig = CURRENT_ERA,
) -> AccountEligibility:
    """Second-life gate is a live level query; Albescent is the stamped column."""
    peak_level, mod_banned = await account_peak_level_and_ban(
        account_id, era_id, session
    )
    account = await session.get(Account, account_id)
    return AccountEligibility(
        can_create_additional_character=(
            peak_level >= era.second_character_level_required and not mod_banned
        ),
        can_start_as_albescent=has_stamp(account, era.secret_faction_slug, "unlocked"),
    )


async def has_mod_banned_life(account_id: int, session: AsyncSession) -> bool:
    return bool(
        await session.scalar(
            select(exists().where(Character.account_id == account_id, MOD_BANNED))
        )
    )


async def is_playable(character: Character, session: AsyncSession) -> bool:
    """The life and its account are both active."""
    if character.status != CharacterStatus.active:
        return False
    account = await session.get(Account, character.account_id)
    return account is not None and account.status == AccountStatus.active


async def can_create_additional_character(
    account_id: int,
    session: AsyncSession,
    era: EraConfig = CURRENT_ERA,
) -> bool:
    """Some active character is at ``era.second_character_level_required``+."""
    era_row = await get_current_era_row(session)
    eligibility = await load_account_eligibility(account_id, era_row.id, session, era)
    return eligibility.can_create_additional_character


async def can_start_as_albescent(
    account_id: int,
    session: AsyncSession,
    era: EraConfig = CURRENT_ERA,
) -> bool:
    """Has this account ever earned Albescent (#2399)? Stamped, survives resets.

    Account half only: the per-character level ceiling lives in
    :func:`services.faction_service.defect_to_faction`.
    """
    era_row = await get_current_era_row(session)
    eligibility = await load_account_eligibility(account_id, era_row.id, session, era)
    return eligibility.can_start_as_albescent


async def get_account_invited_faction_slugs(
    account_id: int,
    session: AsyncSession,
    era: EraConfig = CURRENT_ERA,
) -> list[str]:
    """Factions a new life on this account may be born into (ADR-0019, #2385).

    Pooled over the account's lives: a current-era letter, the current faction,
    or a defection row (letters are deleted on defection, #2218). Per-character
    rejoin is still refused in ``faction_service``. Sentinels excluded;
    Albescent added back if earned (#2399). ``[]`` when the era is unseeded.
    """
    era_row = await get_current_era_row_safe(session)
    if era_row is None:
        return []
    account_character_ids = select(Character.id).where(
        Character.account_id == account_id
    )
    result = await session.execute(
        union(
            select(InvitationLetter.faction_slug).where(
                InvitationLetter.character_id.in_(account_character_ids),
                InvitationLetter.era_id == era_row.id,
            ),
            select(Character.faction_slug).where(
                Character.account_id == account_id
            ),
            select(FactionDefectionHistory.faction_slug).where(
                FactionDefectionHistory.character_id.in_(account_character_ids),
                FactionDefectionHistory.era_id == era_row.id,
            ),
        )
    )
    slugs = {row[0] for row in result.all()} - _sentinel_slugs(era)
    if await can_start_as_albescent(account_id, session, era):
        slugs.add(era.secret_faction_slug)
    return sorted(slugs)


async def list_era_invitations_for_character(
    character_id: int,
    era_id: int,
    session: AsyncSession,
) -> list[str]:
    """This character's own letters in ``era_id``, sentinels excluded (#243).

    Feeds the /auth/me invitation watcher, which resolves the era once (#1381).
    """
    result = await session.execute(
        select(InvitationLetter.faction_slug)
        .distinct()
        .where(
            InvitationLetter.character_id == character_id,
            InvitationLetter.era_id == era_id,
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
    # ponytail: serial probe; UNIQUE constraint backstops concurrent creates.
    while await session.scalar(
        select(Character.id).where(func.lower(Character.username) == candidate)
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
    409 if the target life is banned (a banned life cannot be carried)."""
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
    """The account's own lives (not banned) with current-era stats,
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
        raise_coded(
            400, ErrorCode.character_name_required, "A chosen name is required."
        )

    requested_faction_slug = (data.faction_slug or "").strip().lower() or None

    result = await session.execute(
        select(func.count()).select_from(Character).where(
            Character.account_id == account_id,
            Character.status == CharacterStatus.active,
        )
    )
    existing_count = result.scalar_one()

    if await has_mod_banned_life(account_id, session):
        raise_coded(
            403,
            ErrorCode.character_creation_banned,
            "A moderator banned one of your characters, so you can't create another.",
        )

    if existing_count > 0:
        if not await can_create_additional_character(account_id, session, era):
            raise_coded(
                403,
                ErrorCode.second_character_level_too_low,
                (
                    f"Must reach level {era.second_character_level_required} "
                    "before creating additional characters."
                ),
                {"level": era.second_character_level_required},
            )

    # ADR-0019/0042 default faction. Un-earned Albescent gets the ordinary
    # refusal, which keeps ADR-0027 secrecy.
    if requested_faction_slug is None:
        starting_faction_slug = era.starting_faction_slug
    else:
        invited = await get_account_invited_faction_slugs(account_id, session, era)
        if requested_faction_slug not in invited:
            raise_coded(
                400,
                ErrorCode.faction_invitation_required,
                "You don't hold an invitation for that faction.",
            )
        starting_faction_slug = requested_faction_slug

    explicit_username = (data.username or "").strip() or None
    if explicit_username and await session.scalar(
        select(Character.id).where(
            func.lower(Character.username) == explicit_username.lower()
        )
    ):
        raise_coded(409, ErrorCode.username_taken, "That username is already taken.")
    username = explicit_username or await _derive_unique_username(display_name, session)

    character = Character(
        account_id=account_id,
        username=username,
        display_name=display_name,
        bio=data.bio or "",
        tagline=data.tagline or "",
        avatar_url=data.avatar_url or "",
        location=data.location or "",
        faction_slug=starting_faction_slug,
    )
    try:
        session.add(character)
        await session.flush()
    except IntegrityError as exc:
        if "uq_character_username_lower" not in str(exc.orig):
            raise
        await session.rollback()
        raise_coded(409, ErrorCode.username_taken, "That username is already taken.")

    stats = await get_or_create_stats(
        session,
        character_id=character.id,
        era_id=era_row.id,
    )

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
    """Self-deletion: status banned, ``departed_at`` set, avatar erased (#1568).

    A moderator ban (``admin_service.apply_ban``) must not call this: it is
    reversible and must keep evidence. Both share the ADR-0011 forfeit (#1577).
    Praxis media survives both. The unlink is last and non-transactional (the
    router commits), so a failed commit leaves at worst a dead ``avatar_url``.
    """
    # Not get_character_by_id: an account's banned lives are deleted too.
    character = await session.get(Character, character_id)
    if character is None:
        raise HTTPException(status_code=404, detail="Character not found.")
    character.status = CharacterStatus.banned
    # Distinguishes self-deletion from a ban (#1577); never cleared.
    character.departed_at = character.departed_at or datetime.now(timezone.utc)
    erased_avatar_url = character.avatar_url
    character.avatar_url = ""

    # Deferred: services.duel -> character_stats -> this module.
    from services.duel import forfeit_settled_duels_for_character

    await forfeit_settled_duels_for_character(character_id, session, era)

    # No-op for remote URLs or another character's file (player-written column).
    delete_stored_avatar(erased_avatar_url, character.id)


def _character_stats_era_join(era_id: int | None) -> Select:
    """Outer join on the era; ``None`` (unseeded) joins nothing, so zero stats."""
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
        .join(Account, Account.id == Character.account_id)
        .where(
            Character.status == CharacterStatus.active,
            Account.status == AccountStatus.active,
        )
    )


async def list_characters_for_viewer(
    session: AsyncSession,
    *,
    search: Optional[str] = None,
    faction_slug: Optional[str] = None,
    exclude_active_task_id: Optional[int] = None,
    exclude_account_id: Optional[int] = None,
    viewer_account: Optional[Account] = None,
    # Resolved by the route; an admin is treated as revealed (#2400).
    viewer_is_admin: bool = False,
    limit: int = 50,
    offset: int = 0,
    era: EraConfig = CURRENT_ERA,
) -> list[tuple[Character, CharacterStats | None]]:
    """List active characters with current-era stats.

    ``exclude_active_task_id`` drops players the invite would 409 on (#320),
    except multi-membership factions. ``exclude_account_id`` is the ADR-0041
    same-account rule for the duel picker (#1385). ``viewer_account`` decides
    whether ``?faction=albescent`` is answered (#2422); None is anti-oracle.
    """
    from services.signup_eligibility import multi_membership_faction_slugs

    era_row = await get_current_era_row_safe(session)
    era_id = era_row.id if era_row else None

    query = _character_stats_era_join(era_id)
    # A leading '@' is a sigil; names cannot contain it (#624).
    term = search.lstrip("@") if search else None
    match_priority = None
    if term:
        query = query.where(
            or_(
                Character.username.ilike(f"%{term}%"),
                Character.display_name.ilike(f"%{term}%"),
            )
        )
        # Exact, then prefix, then substring, before score (#989). Bound params;
        # ``%``/``_`` are deliberately left unescaped as wildcards.
        term_lower = term.lower()
        match_priority = case(
            (
                or_(
                    func.lower(Character.username) == term_lower,
                    func.lower(Character.display_name) == term_lower,
                ),
                0,
            ),
            (
                or_(
                    Character.username.ilike(f"{term}%"),
                    Character.display_name.ilike(f"{term}%"),
                ),
                1,
            ),
            else_=2,
        )
    # Unaffiliated also matches Albescent (#1975), unless revealed (#2422).
    roster_faction_slugs = faction_filter_slugs(
        [faction_slug],
        reveal_albescent=is_albescent_revealed(
            viewer_account, is_admin=viewer_is_admin
        ),
    )
    if roster_faction_slugs:
        query = query.where(Character.faction_slug.in_(roster_faction_slugs))
    if exclude_account_id is not None:
        query = query.where(Character.account_id != exclude_account_id)
    if exclude_active_task_id is not None:
        active_member_ids = (
            select(PraxisMember.character_id)
            .join(Praxis, PraxisMember.praxis_id == Praxis.id)
            .where(
                Praxis.task_id == exclude_active_task_id,
                Praxis.status.in_(
                    [PraxisStatus.in_progress, PraxisStatus.pending, PraxisStatus.submitted]
                ),
            )
        )
        query = query.where(
            or_(
                Character.faction_slug.in_(multi_membership_faction_slugs(era)),
                Character.id.notin_(active_member_ids),
            )
        )
    # id tiebreak keeps equal-score order stable for paging (#655).
    order_columns = []
    if match_priority is not None:
        order_columns.append(match_priority.asc())
    order_columns.extend(
        [CharacterStats.score.desc().nulls_last(), Character.id.asc()]
    )
    query = query.order_by(*order_columns).limit(limit).offset(offset)

    result = await session.execute(query)
    return list(result.all())


async def build_character_outs(
    rows: list[tuple[Character, CharacterStats | None]],
    session: AsyncSession,
) -> list[CharacterOut]:
    """Serialize a list page, badges in one extra ``GROUP BY`` query (#655)."""
    from services.badge import build_badge_contexts, evaluate_badges

    contexts = await build_badge_contexts([character for character, _ in rows], session)
    return [
        build_character_out(character, stats, badges=evaluate_badges(contexts[character.id]))
        for character, stats in rows
    ]
