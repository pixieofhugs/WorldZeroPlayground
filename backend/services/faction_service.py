"""Faction lifecycle: defection and invitation letters."""

from dataclasses import dataclass

from fastapi import HTTPException
from sqlalchemy import delete, select
from sqlalchemy.ext.asyncio import AsyncSession

from errors import ErrorCode, coded_error, raise_coded
from faction_slugs import UNAFFILIATED_FACTION_SLUG
from game_config import CURRENT_ERA, EraConfig
from models.account import Account
from models.character import Character
from models.faction import Faction, FactionStatus
from models.faction_defection_history import FactionDefectionHistory
from models.invitation_letter import InvitationLetter
from models.task import Task
from services.character import ALBESCENT_FACTION_SLUG, can_start_as_albescent
from services.era import get_current_era_row, load_era_stats
from services.era_gates import meets_albescent_level


def faction_permits(
    character: Character,
    task: Task,
    era: EraConfig = CURRENT_ERA,
) -> bool:
    """The one home for every faction gate on acting on a task (ADR-0029, #171).

    No faction gate is active (metatasks are faction-open too); the seam stays
    so a new rule is a one-function edit. Never re-check factions at call sites.
    """
    return True


async def hidden_faction_slugs(session: AsyncSession) -> list[str]:
    """Slugs of ``hidden`` factions — the system rows, and nothing else.

    ``hidden`` only, never "not visible" (ADR-0087): ``retired`` factions' tasks
    stay in the archive. ``na`` is seeded hidden but excluded here so
    unaffiliated (e.g. proposed) tasks stay listable.
    """
    result = await session.execute(
        select(Faction.slug).where(Faction.status == FactionStatus.hidden)
    )
    return [row[0] for row in result.all() if row[0] != UNAFFILIATED_FACTION_SLUG]


async def refuse_hidden_faction(session: AsyncSession, *slugs: str | None) -> None:
    """422 ``TASK_FACTION_HIDDEN`` if any slug is a hidden faction (#3379)."""
    hidden = set(await hidden_faction_slugs(session))
    for slug in slugs:
        if slug in hidden:
            raise_coded(
                422,
                ErrorCode.task_faction_hidden,
                f"Tasks can't be created for faction: {slug}.",
            )


def _is_rejoinable(faction_slug: str, era: EraConfig) -> bool:
    """Whether leaving ``faction_slug`` leaves the door open (#2218); unknown: no."""
    faction_config = era.factions.get(faction_slug)
    return faction_config is not None and faction_config.can_always_rejoin


async def unjoinable_faction_slugs(
    character_id: int,
    era_id: int,
    session: AsyncSession,
    era: EraConfig = CURRENT_ERA,
) -> set[str]:
    """Factions this character left this era and can't rejoin (#2218)."""
    return {
        defection.faction_slug
        for defection in await get_defection_history(character_id, era_id, session)
        if not _is_rejoinable(defection.faction_slug, era)
    }


@dataclass(frozen=True)
class MoveFacts:
    """Everything the door reads about one character, loaded once (#3168)."""

    current_slug: str
    defected: frozenset[str]
    letters: frozenset[str]
    albescent_unlocked: bool
    level: int | None


async def load_move_facts(
    character: Character,
    era_id: int,
    session: AsyncSession,
    era: EraConfig = CURRENT_ERA,
    *,
    defections: list[FactionDefectionHistory] | None = None,
    letters: list[InvitationLetter] | None = None,
) -> MoveFacts:
    """The four reads behind :func:`move_refusal`: history, letters, unlock, level.

    Constant query count across factions. No stats row → level ``None`` (below
    the ceiling). Pass ``defections``/``letters`` to skip re-reading them.
    """
    if defections is None:
        defections = await get_defection_history(character.id, era_id, session)
    if letters is None:
        letters = list(
            (
                await session.scalars(
                    select(InvitationLetter).where(
                        InvitationLetter.character_id == character.id,
                        InvitationLetter.era_id == era_id,
                    )
                )
            ).all()
        )
    stats = await load_era_stats(character.id, era_id, session)
    return MoveFacts(
        current_slug=character.faction_slug,
        defected=frozenset(d.faction_slug for d in defections),
        letters=frozenset(letter.faction_slug for letter in letters),
        albescent_unlocked=await can_start_as_albescent(
            character.account_id, session, era
        ),
        level=stats.level if stats is not None else None,
    )


def move_refusal(
    target_slug: str, facts: MoveFacts, era: EraConfig = CURRENT_ERA
) -> HTTPException | None:
    """Why a move into ``target_slug`` would be refused, or None if accepted.

    THE door (#3168): ``defect_to_faction`` raises it and status ``joinable`` is
    ``is None``. Check order is the contract.
    """
    if facts.current_slug == target_slug:
        return coded_error(
            422, ErrorCode.faction_already_member, "Already a member of this faction."
        )

    # `na` is the unaffiliated sentinel, not a joinable destination (ADR-0019/0030).
    if target_slug == UNAFFILIATED_FACTION_SLUG:
        return coded_error(
            422,
            ErrorCode.faction_not_selectable,
            "This faction cannot be chosen directly.",
        )

    faction_config = era.factions.get(target_slug)
    if faction_config is None:
        return coded_error(404, ErrorCode.faction_not_found, "Faction not found.")

    if target_slug in facts.defected and not faction_config.can_always_rejoin:
        return coded_error(
            403,
            ErrorCode.faction_rejoin_forbidden,
            "Cannot rejoin a faction you have left.",
        )

    # #454: needs this era's letter (ADR-0019), no grandfathering.
    # can_always_rejoin factions are gated by the Albescent bar below instead.
    if not faction_config.can_always_rejoin and target_slug not in facts.letters:
        return coded_error(
            403,
            ErrorCode.faction_invitation_required,
            "You don't hold an invitation for that faction.",
        )

    # #2399: Albescent is joined via defection; two locks.
    if target_slug == ALBESCENT_FACTION_SLUG:
        # (1) The account earned it (sticky column).
        if not facts.albescent_unlocked:
            return coded_error(
                403,
                ErrorCode.faction_albescent_not_eligible,
                "The order has not extended its hand to you.",
            )
        # (2) This life must NOT meet the level: the game's only *ceiling* gate.
        # Albescent is New Game+, never the earner. Same predicate as the earn
        # floor, deliberately not negated (#2868).
        if meets_albescent_level(facts.level, facts.current_slug, False, era):
            return coded_error(
                403,
                ErrorCode.faction_albescent_new_game_plus_only,
                "Available only for New Game+.",
            )
    return None


async def defect_to_faction(
    character: Character,
    target_slug: str,
    session: AsyncSession,
    era: EraConfig = CURRENT_ERA,
) -> Character:
    """Move a character to a new faction (also the initial join), recording the
    defection.

    Raises what :func:`move_refusal` returns.
    """
    era_row = await get_current_era_row(session)
    facts = await load_move_facts(character, era_row.id, session, era)
    refusal = move_refusal(target_slug, facts, era)
    if refusal is not None:
        raise refusal

    old_slug = character.faction_slug
    if old_slug and old_slug != UNAFFILIATED_FACTION_SLUG:
        defection = FactionDefectionHistory(
            character_id=character.id,
            faction_slug=old_slug,
            era_id=era_row.id,
        )
        session.add(defection)

        # #2218: leaving deletes that faction's letter, else it re-arms as an
        # unanswered invite (ADR-0070) the door refuses. Rejoinable ones keep theirs.
        if not _is_rejoinable(old_slug, era):
            await session.execute(
                delete(InvitationLetter).where(
                    InvitationLetter.character_id == character.id,
                    InvitationLetter.faction_slug == old_slug,
                    InvitationLetter.era_id == era_row.id,
                )
            )

    character.faction_slug = target_slug

    # ADR-0027 / #390: sticky reveal; never derive from live membership.
    if target_slug == ALBESCENT_FACTION_SLUG:
        account = await session.get(Account, character.account_id)
        if account is not None:
            account.albescent_revealed = True

    await session.flush()
    await session.refresh(character)
    return character


async def get_defection_history(
    character_id: int,
    era_id: int,
    session: AsyncSession,
) -> list[FactionDefectionHistory]:
    """Return all defection records for a character in the given era."""
    result = await session.execute(
        select(FactionDefectionHistory).where(
            FactionDefectionHistory.character_id == character_id,
            FactionDefectionHistory.era_id == era_id,
        )
    )
    return list(result.scalars().all())


async def get_invitation_status(
    character_id: int,
    era_id: int,
    session: AsyncSession,
    era: EraConfig = CURRENT_ERA,
) -> tuple[dict[str, str], list[InvitationLetter], list[FactionDefectionHistory]]:
    """Per-faction status ("member", "invited", "not_invited", "defected",
    "can_return") plus the letter and defection rows behind it, so the status
    route reads each table once (#1384).
    """
    character = await session.get(Character, character_id)
    if character is None:
        return {}, [], []

    current_faction = character.faction_slug

    defections = await get_defection_history(character_id, era_id, session)
    defected_slugs = {defection.faction_slug for defection in defections}

    invitation_result = await session.execute(
        select(InvitationLetter).where(
            InvitationLetter.character_id == character_id,
            InvitationLetter.era_id == era_id,
        )
    )
    letters = list(invitation_result.scalars().all())
    invited_slugs = {letter.faction_slug for letter in letters}

    status_map: dict[str, str] = {}
    for slug, faction_config in era.factions.items():
        if slug == current_faction:
            status_map[slug] = "member"
        elif slug in defected_slugs and faction_config.can_always_rejoin:
            status_map[slug] = "can_return"
        elif slug in defected_slugs:
            status_map[slug] = "defected"
        elif slug in invited_slugs:
            status_map[slug] = "invited"
        else:
            status_map[slug] = "not_invited"

    return status_map, letters, defections
