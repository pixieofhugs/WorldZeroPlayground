import dataclasses
import re
from datetime import datetime, timezone
from typing import Optional

from fastapi import HTTPException
from sqlalchemy import case, func, or_, select, union
from sqlalchemy.sql import Select, false as sa_false
from sqlalchemy.ext.asyncio import AsyncSession

from errors import ErrorCode, raise_coded
from faction_slugs import (
    ALBESCENT_FACTION_SLUG,
    UNAFFILIATED_FACTION_SLUG,
    faction_filter_slugs,
)
from game_config import CURRENT_ERA, EraConfig
from models.account import Account
from models.character import Character, CharacterStatus
from models.character_stats import CharacterStats
from models.faction_defection_history import FactionDefectionHistory
from models.invitation_letter import InvitationLetter
from models.praxis import Praxis, PraxisMember, PraxisStatus
from schemas.character import BadgeOut, CharacterCreate, CharacterOut, CharacterUpdate
from services.albescent_reveal import is_albescent_revealed
from services.era import get_current_era_row, get_current_era_row_safe, get_or_create_stats
from services.media import delete_stored_avatar

# Status set for the account-scoped roster: a player's own lives, excluding
# banned. Kept as a set even though `active` is currently its only member — the
# rule is "not banned", and reads that mean it should not have to be rewritten
# if a future life state (e.g. a genuine pause) is ever added. `paused` was
# removed in the #1398 squash: nothing ever wrote it.
_ROSTER_STATUSES: frozenset[CharacterStatus] = frozenset({CharacterStatus.active})
_DEFAULT_HANDLE = "wanderer"
_HANDLE_MAX_LEN = 14


def build_character_out(
    character: Character,
    stats: CharacterStats | None,
    badges: list[BadgeOut] | None = None,
    invitations: list[str] | None = None,
) -> CharacterOut:
    """Flatten a Character row plus its (optional) CharacterStats into CharacterOut.

    badges (ADR-0033) is supplied by the caller and defaults to empty; list
    callers should go through :func:`build_character_outs` so every context is
    resolved in one batched query rather than one per character (#655).
    invitations (#243) is supplied only by the /auth/me active-character path so
    the frontend can detect newly-earned invitation letters; it defaults to empty
    everywhere else.
    """
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
        all_time_score=stats.all_time_score if stats else 0,
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


# ALBESCENT_FACTION_SLUG now lives in `faction_slugs` alongside the other
# sentinels — the leaf module `faction_filter_slugs` needed it from, and the one
# place a slug string may be declared (#1559). Re-exported from here so the
# existing importers (`character_stats`, `faction_service`, `routers/factions`)
# are unchanged; `__all__`-less module, so the name above is the export.

_ALBESCENT_SENTINEL_SLUGS: frozenset[str] = frozenset(
    {UNAFFILIATED_FACTION_SLUG, ALBESCENT_FACTION_SLUG}
)


async def account_peak_character_level(
    account_id: int,
    era_id: int,
    session: AsyncSession,
) -> int:
    """Highest level among the account's active characters in ``era_id`` (0 if none).

    One query answers every account-collective level gate at once: the two /auth/me
    flags below used to ask "is anyone at level N?" twice with different N (#1381).
    """
    peak = await session.scalar(
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
    )
    return peak or 0


async def _character_covers_every_faction(
    character: Character,
    era_id: int,
    session: AsyncSession,
    era: EraConfig,
) -> bool:
    """Coverage half of the earn gate — see :func:`character_earns_albescent`.

    "Invited to **or** has been a member of", for ONE life, in ONE era. Three
    sources, because no single one of them can ever reach seven:

    * **invitation letters** — but a character is never invited to the faction
      it currently holds (``_deliver_earned_invitations`` puts
      ``character.faction_slug`` in ``uninvitable``, #1425), and
      :func:`services.faction_service.defect_to_faction` *deletes* the letter
      when you walk out (#2218). A live-letter count is therefore capped below
      seven for anybody who has ever actually joined anything.
    * **the current faction** — the one the letters structurally cannot show.
    * **defection rows** — every faction this life has held and left this era.
      ``FactionDefectionHistory`` is append-only ("nothing is ever deleted
      here"), and the same transaction that deletes a letter writes the row for
      that identical slug, so the #2218 delete can never cost coverage.

    No new table: all three already exist. Era-scoped like the rows themselves —
    which is exactly why the *result* has to be stamped rather than re-derived
    (see :func:`stamp_albescent_unlock`).
    """
    required_faction_slugs = frozenset(
        slug for slug in era.factions if slug not in _ALBESCENT_SENTINEL_SLUGS
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
    # Current faction folded in here rather than as a third UNION arm: it is a
    # value already in hand on the row, not a query.
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
    """Does THIS life, by itself, earn Albescent for its account (#2399)?

    Both halves on the **same character** — at ``era.albescent_level_required``
    *and* covering every joinable faction. That is the binding ADR-0021
    explicitly rejected as "too punishing"; #2399 restores it, and the new ADR
    records why that rejection no longer holds (ADR-0022 made an invitation cost
    two completed tasks **plus** 50 points per faction, so this bar is strictly
    harder than the one-task-per-faction bar ADR-0021 set, not cheaper).

    Banned lives never earn: a banned life's work does not carry its account
    through the gate, the same rule :data:`_ROSTER_STATUSES` states everywhere
    else.

    This answers "was it earned *now*", which is not the question the site asks
    — see :func:`can_start_as_albescent` for the one it does.
    """
    if character.status not in _ROSTER_STATUSES:
        return False
    level = await session.scalar(
        select(CharacterStats.level).where(
            CharacterStats.character_id == character.id,
            CharacterStats.era_id == era_id,
        )
    )
    if (level or 0) < era.albescent_level_required:
        return False
    return await _character_covers_every_faction(character, era_id, session, era)


async def stamp_albescent_unlock(
    character: Character,
    era_id: int,
    session: AsyncSession,
    era: EraConfig = CURRENT_ERA,
) -> bool:
    """Record the unlock on the account if ``character`` has just earned it (#2399).

    Sticky and monotonic: set once, never unset, exactly like
    ``albescent_revealed``. Returns whether this call is the one that flipped it,
    so a caller can tell "newly earned" from "already had it" — nothing needs
    that yet, but it is the difference between an idempotent write and a silent
    one.

    Cheap on the hot path: an account that already holds the unlock short-circuits
    before any query, which is every recalc after the first.

    ``Character.account`` is ``lazy="raise"``, so the account is fetched by id.
    """
    account = await session.get(Account, character.account_id)
    if account is None or account.albescent_unlocked:
        return False
    if not await character_earns_albescent(character, era_id, session, era):
        return False
    account.albescent_unlocked = True
    return True


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
    """One level query for the second-life gate, one column read for Albescent.

    The two flags stopped sharing a query at #2399. The second-life gate is still
    a live account-collective level test. The Albescent gate is no longer
    computed at all: it is the stamped ``account.albescent_unlocked`` column,
    written by :func:`stamp_albescent_unlock` when a life earns it and never
    recomputed — which is what lets the unlock survive an era reset that wipes
    every row the earn predicate reads.

    ``session.get`` on an account /auth/me is already carrying is an identity-map
    hit, not a round trip.
    """
    peak_level = await account_peak_character_level(account_id, era_id, session)
    account = await session.get(Account, account_id)
    return AccountEligibility(
        can_create_additional_character=(
            peak_level >= era.second_character_level_required
        ),
        can_start_as_albescent=bool(account is not None and account.albescent_unlocked),
    )


async def can_create_additional_character(
    account_id: int,
    session: AsyncSession,
    era: EraConfig = CURRENT_ERA,
) -> bool:
    """True when this account may create another character.

    Requires at least one existing active character at level
    ``era.second_character_level_required`` or above in the current era.
    """
    era_row = await get_current_era_row(session)
    eligibility = await load_account_eligibility(account_id, era_row.id, session, era)
    return eligibility.can_create_additional_character


async def can_start_as_albescent(
    account_id: int,
    session: AsyncSession,
    era: EraConfig = CURRENT_ERA,
) -> bool:
    """Has this account ever earned the Albescent door (#2399)?

    Account-scoped and **historical**: the stamped ``albescent_unlocked``
    column, not a live computation. One life earned it once; the account keeps
    it for ever, across era resets included — "getting to level 8 is very hard.
    This is a thank you to players who have put in that effort."

    Supersedes ADR-0021, which made this two independent account-pooled queries.
    The earn rule is now :func:`character_earns_albescent` — both halves on one
    life — and it is asked at *stamp* time, never here.

    This is the account half only, and on its own it is not permission to join.
    A character at ``era.albescent_level_required`` may not take Albescent no
    matter how unlocked its account is ("Available only for New Game+"); that
    ceiling lives at the door, in
    :func:`services.faction_service.defect_to_faction`, because it is a fact
    about the *character* and this function has none in hand. A newly created
    life is level 0, so character creation needs no such test.
    """
    era_row = await get_current_era_row(session)
    eligibility = await load_account_eligibility(account_id, era_row.id, session, era)
    return eligibility.can_start_as_albescent


async def get_account_invited_faction_slugs(
    account_id: int,
    session: AsyncSession,
    era: EraConfig = CURRENT_ERA,
) -> list[str]:
    """Faction slugs a new life on this account may be born into (ADR-0019, #2385).

    Account-pooled over every one of the account's characters: a faction counts
    if any of them **holds** a current-era invitation letter for it, or **has
    ever held it** this era — its current faction, plus every
    :class:`FactionDefectionHistory` row it has left behind.

    The "has ever held" half is #2385. ``defect_to_faction`` deletes the letter
    when a character walks out — deliberately, per #2218: a live row re-arms
    that character's bell into offering a rejoin the guard refuses. But #2218's
    reason is per-character while this pool is account-wide, so one life's
    defection also removed the faction as a *birth* option for every future
    life. The account's earned history is not what that delete meant to take.

    This does **not** re-open the per-character door. The life that walked out
    still cannot go back; that is enforced separately, from *that character's*
    own defection history, by
    :func:`services.faction_service.can_join_faction` and
    :func:`services.faction_service.unjoinable_faction_slugs`.

    Current faction needs no era filter of its own: it is a character's live
    state, and an era reset is what clears it (``era.reset_faction``), so a slug
    still standing there is still held in the era in hand.

    The ``na`` sentinel is excluded — it is never chosen, it is the default.

    ``albescent`` is excluded too, and then added back for an account that has
    **earned** it (#2399). It is not invite-joinable and never will be; it rides
    this list because this list is the answer to "what may a new life be born
    into", and since #2399 Albescent is one of those answers. A new life is level
    0, so the "never the earner" ceiling cannot bite at creation — the only
    surface where it can is the standing letter, which re-dresses a life that
    already has a level.

    Returns ``[]`` when the era is unseeded.
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
    slugs = {row[0] for row in result.all()} - _ALBESCENT_SENTINEL_SLUGS
    if await can_start_as_albescent(account_id, session, era):
        slugs.add(ALBESCENT_FACTION_SLUG)
    return sorted(slugs)


async def list_era_invitations_for_character(
    character_id: int,
    era_id: int,
    session: AsyncSession,
) -> list[str]:
    """Faction slugs THIS character holds an invitation letter for in ``era_id`` (#243).

    Unlike :func:`get_account_invited_faction_slugs` (account-pooled, and since
    #2385 counting factions once held as well as currently lettered), this is
    strictly letters, strictly this character: it powers the /auth/me invitation
    watcher, which diffs the active life's own earned invites. ``Character.account``
    is ``lazy="raise"``, so the letter rows are queried explicitly by character_id
    (mirroring how #459 badges do sibling queries). The ``na`` sentinel and
    ``albescent`` are excluded — never invite-joinable.

    Takes the era id rather than resolving it: /auth/me — the only caller — needs
    the same era row for three other reads, so it resolves it once (#1381).
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
            raise_coded(
                403,
                ErrorCode.second_character_level_too_low,
                (
                    f"Must reach level {era.second_character_level_required} "
                    "before creating additional characters."
                ),
                {"level": era.second_character_level_required},
            )

    # ADR-0019: born unaffiliated by default. A non-None faction must be one the
    # account may be born into. The default is era-owned (ADR-0042) and defaults
    # to `na` on EraConfig, so this reads era.starting_faction_slug rather than
    # the slug itself.
    #
    # #2399 removed the special Albescent branch that used to sit here. Albescent
    # IS a creation option now — for an account that earned it — and
    # `get_account_invited_faction_slugs` is where that is decided, so this is
    # one check for all eight factions instead of a rule stated twice. An
    # un-earned account asking for it falls through to the ordinary
    # "you don't hold an invitation" refusal, which is also the one that keeps
    # ADR-0027's secrecy: the answer does not confirm the faction exists.
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
    """End a life at the player's own request, and erase its avatar (#1568).

    "Soft" is literal: there is no hard delete anywhere in the codebase, and
    this sets ``status = banned`` — the same *state* an admin ban lands in.
    The two paths are nevertheless split on media, and this is the erasing one:

    * **Self-deletion** (``DELETE /characters/{id}``, which 403s on anyone
      else's, so the caller is always ending their own life) unlinks the
      avatar file and clears the column.
    * **Moderator ban** (``POST /admin/characters/{id}/ban``) deletes nothing.
      Moderation must not shred the evidence it is acting on, and a ban is a
      reversible toggle — destroying files on it would restore a character
      with holes in it. That route sets ``status`` via
      ``services.admin_service.apply_ban`` and deliberately does not call this
      function; keep it that way.

    **What the two paths now share** (#1577): the ADR-0011 forfeit, through
    ``services.duel.forfeit_settled_duels_for_character``. The ADR's trigger list
    is "the ban / soft-delete of a side's character" and only this half of it was
    ever implemented. **What they do not share**: the avatar erasure above, and
    ``departed_at``, which is set here and nowhere else so that a life the player
    ended is never mistaken for one a moderator took.

    **Praxis media survives both.** It is the public artefact of work other
    players have voted on and built feeds around; removing it retroactively
    would leave praxis cards with missing images across other people's history.

    The column is cleared before the unlink so the row never points at a file
    that is gone. The unlink itself is the last thing this function does, and
    is deliberately *not* transactional — the router owns the commit (``db.get_db``),
    so a commit that failed after the unlink would leave a file deleted and a
    row rolled back. Doing it last makes that window as small as it can be
    without moving filesystem I/O into the route handler; the failure mode is a
    dead ``avatar_url``, which the next upload overwrites.
    """
    character = await get_character_by_id(character_id, session)
    if character is None:
        raise HTTPException(status_code=404, detail="Character not found.")
    character.status = CharacterStatus.banned
    # The one thing that distinguishes this path from a moderator ban afterwards
    # (#1577). Never set by ``services.admin_service.apply_ban``, and never cleared.
    character.departed_at = datetime.now(timezone.utc)
    erased_avatar_url = character.avatar_url
    character.avatar_url = ""

    # ADR-0011 §Forfeit (#307). Shared with the moderator-ban route, which reaches
    # the same state and owes the same forfeit (#1577) — imported here rather than
    # at module scope because ``services.duel`` pulls in ``character_stats``, which
    # imports this module.
    from services.duel import forfeit_settled_duels_for_character

    await forfeit_settled_duels_for_character(character_id, session, era)

    # Last, and only after the cleared column has been flushed: see the docstring.
    # A no-op when the column held a pasted remote URL rather than a path we wrote,
    # and — since the column is player-writable — also when it points at a file
    # belonging to some other character.
    delete_stored_avatar(erased_avatar_url, character.id)


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
    exclude_account_id: Optional[int] = None,
    viewer_account: Optional[Account] = None,
    # Resolved by the route, not here: it is an ``account_role`` row, and an
    # admin is treated as revealed (#2400). Defaults False, so a caller that
    # does not ask keeps the unprivileged answer.
    viewer_is_admin: bool = False,
    limit: int = 50,
    offset: int = 0,
    era: EraConfig = CURRENT_ERA,
) -> list[tuple[Character, CharacterStats | None]]:
    """List active characters with current-era stats. Optional name/faction filters.

    ``exclude_active_task_id`` drops characters who already hold an active
    (in_progress or submitted) praxis membership for that task — so the invite
    search doesn't surface players the backend would 409 (#320). Members of a
    faction the era grants Double Dipper to are never excluded: they may hold
    multiple memberships per task, so there is no 409 to pre-empt. The set of
    such factions comes from :func:`services.praxis.multi_membership_faction_slugs`,
    the one place that rule is stated (#1359) — no slug is named here.

    ``exclude_account_id`` drops every life on one account — the account-level
    identity rule of ADR-0041, and the same comparison
    :func:`services.duel._characters_share_account` makes. The duel-opponent
    picker asks for it so it does not have to re-derive the roster client-side
    (#1385); the duel service remains the enforcement.

    ``viewer_account`` (with ``viewer_is_admin``) is the optional caller behind
    ``GET /characters`` and ``GET /leaderboard``, and is consulted for one
    thing: whether an explicit ``?faction=albescent`` is the faction page's
    roster question or a prober's (#2422). ``None`` — anonymous, or a caller who
    passed none — keeps the anti-oracle answer.
    """
    from services.praxis import multi_membership_faction_slugs

    era_row = await get_current_era_row_safe(session)
    era_id = era_row.id if era_row else None

    query = _character_stats_era_join(era_id)
    # Callers pass the handle as the player typed it, sigil and all ("@mol") —
    # the invite search even prompts for "@handle". Neither a username nor a
    # display name can contain '@', so a leading one is a sigil to drop, not a
    # character to match (#624).
    term = search.lstrip("@") if search else None
    # match_priority ranks recall by relevance so a prefix ("@P" → Pixie) beats a
    # mere substring ("yum*P*") regardless of score; it is only meaningful when a
    # term is present, so we thread it into the ORDER BY below (#989).
    match_priority = None
    if term:
        # Match on handle OR display name so "@Mol" surfaces "Molly" (@mollusk).
        # The inserted mention is still @username; display_name only *matches*.
        query = query.where(
            or_(
                Character.username.ilike(f"%{term}%"),
                Character.display_name.ilike(f"%{term}%"),
            )
        )
        # Substring ILIKE gives recall, but ordering by score alone buries the
        # obvious prefix match below the row limit (#989). Rank exact matches
        # first, then prefix, then any-substring — before score decides ties.
        # The term is bound as a parameter throughout (no SQL injection); as with
        # the substring ILIKE above we do not escape ``%``/``_`` in the literal, so
        # they keep acting as wildcards, matching pre-existing behaviour.
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
    # One slug in, possibly several out: selecting Unaffiliated also matches
    # Albescent members (#1975), who are shown as Unaffiliated everywhere and
    # otherwise matched no filter at all. `.in_()` rather than `==` because the
    # fold is the shared helper's answer, not this route's — including whether
    # this viewer has been revealed and may ask for Albescent alone (#2422).
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
    # id ASC is the tiebreak, not decoration: most of the roster is tied at zero,
    # and score alone leaves Postgres free to reshuffle equal-score rows between
    # requests — which flickers the sky's top-N membership and its crown, and
    # makes limit/offset paging silently duplicate and drop rows (#655).
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
    """Serialize a list page, badges included, in one extra query total (#655).

    Both facts a badge condition consults are per-account aggregates, so the
    whole page resolves through a single ``GROUP BY account_id`` — the N+1 that
    kept badges off list paths (ADR-0033) is avoidable, not inherent. The query
    count does not scale with ``len(rows)``.
    """
    from services.badge import build_badge_contexts, evaluate_badges

    contexts = await build_badge_contexts([character for character, _ in rows], session)
    return [
        build_character_out(character, stats, badges=evaluate_badges(contexts[character.id]))
        for character, stats in rows
    ]
