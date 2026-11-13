"""Can this Character sign up for this Task — the type-agnostic gate (ADR-0008).

Level gate, sign-up predicate and its page-wide facts, the wire reason string,
Double Dipper membership SQL, and the mode gate.
"""

from dataclasses import dataclass
from enum import Enum
from typing import Collection, Mapping, Optional

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from game_config import CURRENT_ERA, EraConfig
from models.character import Character
from models.character_stats import CharacterStats
from models.praxis import Praxis, PraxisMember, PraxisStatus, PraxisType
from models.task import Task, TaskStatus, TaskType
from services.era import get_current_era_row, get_or_create_stats
from services.era_gates import may_create_collab_praxis
from services.faction_service import faction_permits
from services.level_jump import available_level_reach


async def count_in_progress_praxes(character_id: int, session: AsyncSession) -> int:
    """Count in-progress praxis memberships for bank capacity enforcement."""
    result = await session.execute(
        select(func.count())
        .select_from(PraxisMember)
        .join(Praxis, PraxisMember.praxis_id == Praxis.id)
        .where(
            PraxisMember.character_id == character_id,
            # pending (collab mid-consensus) still uses a bank slot (#590).
            Praxis.status.in_([PraxisStatus.in_progress, PraxisStatus.pending]),
        )
    )
    return result.scalar_one()


def meets_task_level(
    character_level: int, task: Task, level_reach: int = 0
) -> bool:
    """Whether ``character_level`` clears the task's own level bar (#292).

    ``level_reach`` is the level-jump allowance (#811), computed only by
    ``available_level_reach``; applied here so solo, collab and duel initiation
    agree. Duel *acceptance* deliberately skips this gate (ADR-0051).
    """
    return character_level + level_reach >= task.level_required


#: Sign-up is open although the viewer is already on the task (Double Dipper).
#: Derived in :func:`signup_reason`, never from a slug (#1497).
SIGNUP_REASON_MULTI_MEMBERSHIP = "multi_membership"


class SignupDenialReason(str, Enum):
    """Why the type-agnostic sign-up gates reject a claim (ADR-0008)."""

    below_level = "below_level"
    task_status_closed = "task_status_closed"
    already_active_member = "already_active_member"
    bank_full = "bank_full"
    is_metatask = "is_metatask"


@dataclass(frozen=True)
class SignupEligibility:
    """Result of :func:`evaluate_signup`. ``reason`` is set iff ``allowed`` is False."""

    allowed: bool
    reason: Optional[SignupDenialReason] = None


@dataclass(frozen=True)
class SignupFacts:
    """Character-scoped facts :func:`evaluate_signup` needs, read once per page (#1377).

    Membership sets are only meaningful for ``task_ids``. ``active_member_task_ids``
    blocks a claim; ``held_membership_task_ids`` is raw membership. They differ by
    Double Dipper (#1497).
    """

    stats: CharacterStats
    in_progress_praxis_count: int
    task_ids: frozenset[int]
    active_member_task_ids: frozenset[int]
    held_membership_task_ids: frozenset[int]
    #: Task id → viewer's open draft (#2359).
    in_progress_praxis_ids: Mapping[int, int]
    #: Task id → viewer's filed praxis (#2643).
    submitted_praxis_ids: Mapping[int, int]


async def gather_signup_facts(
    character: Character,
    task_ids: Collection[int],
    session: AsyncSession,
    era: EraConfig = CURRENT_ERA,
) -> SignupFacts:
    """Read one page's :class:`SignupFacts` in a constant seven queries (#1377).

    ``era`` must match the predicate's. The raw membership set is its own query
    so the Double Dipper carve-out stays only in SQL (#1359).
    """
    era_row = await get_current_era_row(session)
    return SignupFacts(
        stats=await get_or_create_stats(session, character.id, era_row.id),
        in_progress_praxis_count=await count_in_progress_praxes(character.id, session),
        task_ids=frozenset(task_ids),
        active_member_task_ids=await active_member_task_ids(
            character, task_ids, session, era
        ),
        held_membership_task_ids=await held_membership_task_ids(
            character, task_ids, session
        ),
        in_progress_praxis_ids=await in_progress_praxis_ids(
            character, task_ids, session
        ),
        submitted_praxis_ids=await submitted_praxis_ids(character, task_ids, session),
    )


async def _facts_for_task(
    character: Character,
    task: Task,
    session: AsyncSession,
    era: EraConfig,
    facts: Optional[SignupFacts],
) -> SignupFacts:
    """``facts`` if they can answer for ``task``, else a fresh set for it alone (#2873).

    Absence from facts gathered for another page means "not asked", never "not a
    member" — reading it so would open the gate.
    """
    if facts is not None and task.id in facts.task_ids:
        return facts
    return await gather_signup_facts(character, [task.id], session, era)


async def evaluate_signup(
    character: Optional[Character],
    task: Task,
    session: AsyncSession,
    era: EraConfig = CURRENT_ERA,
    *,
    facts: Optional[SignupFacts] = None,
) -> SignupEligibility:
    """The sign-up predicate: true iff ``create_praxis``'s type-agnostic gates
    accept (ADR-0008). Mode gates live in :func:`allowed_praxis_modes`.

    Anonymous: ``allowed=False``, no reason. ``facts`` (gathered for this
    character) only saves queries (#1377); it never changes the answer.
    """
    if character is None:
        return SignupEligibility(allowed=False)

    # Metatasks are never signup targets (#1001); checked before any query.
    if task.task_type == TaskType.metatask:
        return SignupEligibility(False, SignupDenialReason.is_metatask)

    facts = await _facts_for_task(character, task, session, era, facts)

    stats = facts.stats
    level_reach = available_level_reach(
        character.faction_slug, stats.level, stats.level_jump_used_at_level, era
    )
    if not meets_task_level(stats.level, task, level_reach):
        return SignupEligibility(False, SignupDenialReason.below_level)

    # No faction allowance can reopen a deleted task (#3305).
    if task.status == TaskStatus.deleted:
        return SignupEligibility(False, SignupDenialReason.task_status_closed)
    if task.status == TaskStatus.retired and character.faction_slug not in era.allow_praxis_on_retired_task_factions:
        return SignupEligibility(False, SignupDenialReason.task_status_closed)
    if task.status == TaskStatus.pending and character.faction_slug not in era.allow_praxis_on_pending_task_factions:
        return SignupEligibility(False, SignupDenialReason.task_status_closed)

    if task.id in facts.active_member_task_ids:
        return SignupEligibility(False, SignupDenialReason.already_active_member)

    if facts.in_progress_praxis_count >= era.max_task_signups:
        return SignupEligibility(False, SignupDenialReason.bank_full)

    return SignupEligibility(allowed=True)


async def signup_reason(
    character: Optional[Character],
    task: Task,
    eligibility: SignupEligibility,
    session: AsyncSession,
    era: EraConfig = CURRENT_ERA,
    *,
    facts: Optional[SignupFacts] = None,
) -> Optional[str]:
    """``TaskOut.signup_reason``: why this viewer may or may not claim (#1497).

    ``None`` = nothing to explain; else a :class:`SignupDenialReason` value or
    :data:`SIGNUP_REASON_MULTI_MEMBERSHIP`. Allowed *and* already a member can
    only mean multi-membership, hence the raw (held) membership set.
    """
    if eligibility.reason is not None:
        return eligibility.reason.value
    if not eligibility.allowed or character is None:
        return None

    facts = await _facts_for_task(character, task, session, era, facts)
    holds_membership = task.id in facts.held_membership_task_ids
    return SIGNUP_REASON_MULTI_MEMBERSHIP if holds_membership else None


def multi_membership_faction_slugs(era: EraConfig = CURRENT_ERA) -> tuple[str, ...]:
    """Slugs that may hold several active memberships on a task (Double Dipper, #1359).

    The only statement of the rule; applied in SQL by
    :func:`active_member_task_ids_subquery`.
    """
    return tuple(
        sorted(
            slug
            for slug, faction in era.factions.items()
            if faction.can_hold_multiple_memberships
        )
    )


def _held_membership_task_ids_subquery(character_id: int):
    """Task IDs where ``character_id`` has an in_progress/pending/submitted praxis
    membership — the raw fact, no Double Dipper carve-out (#1497).
    """
    return (
        select(Praxis.task_id)
        .join(PraxisMember, PraxisMember.praxis_id == Praxis.id)
        .join(Character, Character.id == PraxisMember.character_id)
        .where(
            PraxisMember.character_id == character_id,
            Praxis.status.in_(
                [PraxisStatus.in_progress, PraxisStatus.pending, PraxisStatus.submitted]
            ),
        )
    )


def active_member_task_ids_subquery(
    character_id: int, era: EraConfig = CURRENT_ERA
):
    """SQL subquery of task IDs whose membership **blocks** a fresh claim.

    The Double Dipper carve-out must live here in SQL: ``list_tasks`` uses this
    without the predicate (#1359). The Character join is on a PK, no fan-out.
    """
    return _held_membership_task_ids_subquery(character_id).where(
        Character.faction_slug.notin_(multi_membership_faction_slugs(era))
    )


async def held_membership_task_ids(
    character: Character,
    task_ids: Collection[int],
    session: AsyncSession,
) -> frozenset[int]:
    """Which of ``task_ids`` ``character`` is on at all, in one query; era-invariant."""
    if not task_ids:
        return frozenset()
    result = await session.execute(
        _held_membership_task_ids_subquery(character.id).where(
            Praxis.task_id.in_(task_ids)
        )
    )
    return frozenset(result.scalars().all())


async def active_member_task_ids(
    character: Character,
    task_ids: Collection[int],
    session: AsyncSession,
    era: EraConfig = CURRENT_ERA,
) -> frozenset[int]:
    """Which of ``task_ids`` have a claim-blocking membership, in one query.

    Double Dipper factions match no row. :func:`is_active_member_of_task`
    delegates here so page and single answers can't drift (#1377).
    """
    if not task_ids:
        return frozenset()
    result = await session.execute(
        active_member_task_ids_subquery(character.id, era).where(
            Praxis.task_id.in_(task_ids)
        )
    )
    return frozenset(result.scalars().all())


async def in_progress_praxis_ids(
    character: Character,
    task_ids: Collection[int],
    session: AsyncSession,
) -> dict[int, int]:
    """Task id → viewer's newest ``in_progress`` praxis (#2359).

    ``in_progress`` only, matching ``useTaskDetail.ts``'s "your draft"; neither
    membership set fits (held is wider, active is carved out).
    """
    return await _own_praxis_ids(character, task_ids, PraxisStatus.in_progress, session)


async def submitted_praxis_ids(
    character: Character,
    task_ids: Collection[int],
    session: AsyncSession,
) -> dict[int, int]:
    """Task id → viewer's newest ``submitted`` praxis (#2643).

    ``submitted`` only: ``pending`` (awaiting moderation) isn't "read your praxis".
    Newest because re-signing after filing is a live path.
    """
    return await _own_praxis_ids(character, task_ids, PraxisStatus.submitted, session)


async def _own_praxis_ids(
    character: Character,
    task_ids: Collection[int],
    status: PraxisStatus,
    session: AsyncSession,
) -> dict[int, int]:
    """Task id → ``character``'s own praxis in ``status``, newest wins.

    The membership join scopes it to the viewer; dropping it leaks strangers' ids.
    Ascending id + last-write-wins dict = newest.
    """
    if not task_ids:
        return {}
    result = await session.execute(
        select(Praxis.task_id, Praxis.id)
        .join(PraxisMember, PraxisMember.praxis_id == Praxis.id)
        .where(
            PraxisMember.character_id == character.id,
            Praxis.status == status,
            Praxis.task_id.in_(task_ids),
        )
        .order_by(Praxis.id)
    )
    return {task_id: praxis_id for task_id, praxis_id in result.all()}


async def is_active_member_of_task(
    character: Character,
    task: Task,
    session: AsyncSession,
    era: EraConfig = CURRENT_ERA,
) -> bool:
    """True if ``character`` holds a claim-blocking membership on ``task``, which a
    Double Dipper never does."""
    return task.id in await active_member_task_ids(character, [task.id], session, era)


def allowed_praxis_modes(
    character: Optional[Character],
    character_level: int,
    era: EraConfig = CURRENT_ERA,
) -> list[PraxisType]:
    """Praxis modes a character may create directly; one source for enforcement and UI.

    Duels come via the challenge endpoint (ADR-0011), never here. Anonymous gets
    ``[]``. Collab gate has no admin bypass, hence ``False`` (#2868).
    """
    if character is None:
        return []
    modes: list[PraxisType] = [PraxisType.solo]
    if may_create_collab_praxis(character_level, character.faction_slug, False, era):
        modes.append(PraxisType.collab)
    return modes


def is_task_eligible_for_character(
    character: Optional[Character],
    task: Task,
    character_level: int,
    level_reach: int = 0,
) -> bool:
    """True if ``character`` passes the level and faction gates for ``task``.

    A UI affordance mirroring the metatask scoring gate, not the stricter
    ``apply_metatask`` check, which still runs at apply time.
    """
    if character is None:
        return False
    if not meets_task_level(character_level, task, level_reach):
        return False
    if not faction_permits(character, task):
        return False
    return True
