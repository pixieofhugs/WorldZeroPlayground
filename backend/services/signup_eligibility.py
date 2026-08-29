"""Can this Character sign up for this Task — the type-agnostic gate (ADR-0008).

Owns the level gate (:func:`meets_task_level`), the sign-up predicate itself
(:func:`evaluate_signup`) and the DB facts it reads (:func:`gather_signup_facts`,
:class:`SignupFacts`), the wire-facing reason string (:func:`signup_reason`), the
Double Dipper membership machinery (:func:`multi_membership_faction_slugs` and
everything built on :func:`active_member_task_ids_subquery`), the mode gate
(:func:`allowed_praxis_modes`), and the eligibility flag used outside sign-up
proper (:func:`is_task_eligible_for_character`).

Split out of ``services/praxis.py`` (#1391 cut 3, #2870) — a pure move, no
behaviour change. ``services.task`` wanted exactly this concept and nothing else
from ``praxis.py``; importing it from a module named for the concept (rather than
nine symbols and one private one from the praxis module) is the whole point.
``services.praxis`` is a caller too, for the pieces its own create/invite flow
still needs (:func:`evaluate_signup`, :func:`allowed_praxis_modes`,
:func:`meets_task_level`, :func:`is_active_member_of_task`,
:func:`count_in_progress_praxes`) — it imports them from here rather than
keeping a second definition.

``in_progress_praxis_ids`` and ``submitted_praxis_ids`` live here rather than in
the SQL-visibility module #2871 carves out next: both are read directly by
:func:`gather_signup_facts` in this file, so keeping them here avoids a call
back across that module boundary. #2871 inherits this as settled.
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
            # pending = a collab mid-consensus; still an open, slot-consuming
            # membership for bank-cap purposes (#590).
            Praxis.status.in_([PraxisStatus.in_progress, PraxisStatus.pending]),
        )
    )
    return result.scalar_one()


def meets_task_level(
    character_level: int, task: Task, level_reach: int = 0
) -> bool:
    """Whether ``character_level`` clears the task's own level bar (#292).

    The single home for the **task-level** gate — the "level half", stated once
    here rather than ANDed inline into both
    :func:`is_task_eligible_for_character` and the sign-up predicate. A distinct
    axis from :func:`~services.faction_service.faction_permits`
    (the faction half, #171) and from the era-config thresholds
    (collab/flag/comment/metatask-apply), which each already sit in their own
    purpose-named predicate and share a single ``era.*`` source for their value.

    ``level_reach`` is the faction level-jump allowance (#811): levels above the
    character's own that they may currently reach. It is 0 for everyone without
    the ability and for anyone who has already spent it at this level — see
    :func:`services.level_jump.available_level_reach`, which is the only thing
    that should compute it. Extending the gate here (rather than per mode) is
    what gives the ability identical behaviour across solo signup, collab
    signup, and duel *initiation* (the challenger's own praxis, gated via
    :func:`services.praxis.create_praxis` → :func:`evaluate_signup`).

    Duel *acceptance* (the opponent, via
    :func:`services.duel.respond_to_duel_challenge`) is a deliberate exception:
    it never calls this predicate. The opponent's only level check is the flat
    ``era.duel_level_required`` floor — reaching above your own level is the
    point of a duel. See ADR-0051.
    """
    return character_level + level_reach >= task.level_required


#: The one reason sign-up can be *open* that "you have not started this" does not
#: explain: the viewer is already on the task and their faction may hold more than
#: one membership on it (Double Dipper — ``can_hold_multiple_memberships``). It is
#: never inferred from a slug; see :func:`signup_reason`, which derives it from the
#: raw membership fact and the predicate's own verdict (#1497).
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
    """The character-scoped DB facts :func:`evaluate_signup` needs, read once.

    Every gate in that predicate except the task's own columns comes from three
    reads that are identical for every task a single request asks about: the
    viewer's current-era stats, their in-progress praxis count (the bank cap),
    and which of the tasks in hand they already hold a membership on. Gathered
    per page by :func:`gather_signup_facts`, a 50-row browse pays for them once
    instead of 50 times (#1377).

    ``task_ids`` is the page these facts were gathered for. Both membership sets
    are only meaningful within it, so :func:`evaluate_signup` and
    :func:`signup_reason` fall back to their own query for a task outside the set
    rather than reading absence as "not a member".

    The two membership sets answer different questions and differ by exactly the
    Double Dipper ability: ``active_member_task_ids`` is what *blocks* a fresh
    claim, ``held_membership_task_ids`` is what the viewer is on at all. The wire
    needs both to say "begin again" rather than "you are already on this" (#1497).
    """

    stats: CharacterStats
    in_progress_praxis_count: int
    task_ids: frozenset[int]
    active_member_task_ids: frozenset[int]
    held_membership_task_ids: frozenset[int]
    #: Task id → the viewer's OPEN DRAFT on it, for ``TaskOut.in_progress_praxis_id``
    #: (#2359). A third population, and neither of the two above: see
    #: :func:`in_progress_praxis_ids` for why it can be folded into neither.
    in_progress_praxis_ids: Mapping[int, int]
    #: Task id → the viewer's FILED praxis on it, for ``TaskOut.submitted_praxis_id``
    #: (#2643). A fourth, for :func:`submitted_praxis_ids`'s reason — the same
    #: denial, the other side of it.
    submitted_praxis_ids: Mapping[int, int]


async def gather_signup_facts(
    character: Character,
    task_ids: Collection[int],
    session: AsyncSession,
    era: EraConfig = CURRENT_ERA,
) -> SignupFacts:
    """Read one page's worth of :class:`SignupFacts` in seven queries, not per row.

    ``era`` is threaded into the membership read so a caller evaluating against a
    non-current ruleset gets facts from that same ruleset — precomputed facts
    that disagree with the predicate would be the #1377 bug wearing a new hat.

    The fifth read is the raw membership set (#1497). It is a second page-wide
    query rather than a Python derivation of the first because deriving it would
    mean restating the Double Dipper carve-out outside the SQL that owns it — the
    #1359 defect exactly.

    The sixth is the open-draft map (#2359) and the seventh its filed twin
    (#2643). Both are *page-wide* queries like the other five, so the browse
    still costs a constant number of reads however many rows are on it — the
    only property this file's #1377 work defends. Seven constant reads is that
    property held, not spent: what it forbids is a read that scales with the
    page, and neither of these does.
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


async def evaluate_signup(
    character: Optional[Character],
    task: Task,
    session: AsyncSession,
    era: EraConfig = CURRENT_ERA,
    *,
    facts: Optional[SignupFacts] = None,
) -> SignupEligibility:
    """The single sign-up predicate — true iff ``create_praxis``'s **type-agnostic**
    gates would accept (ADR-0008). Owns the gates every claim shares: the task is
    not a metatask, level, retired/pending faction carve-out, active-member, and
    the task-bank cap. The
    mode-specific gates (duel-via-challenge, collab level) stay in
    :func:`allowed_praxis_modes` and are applied by
    :func:`services.praxis._check_create_preconditions`.

    Anonymous viewers are never eligible (``allowed=False``, no ``reason``).

    ``facts`` is the page-wide precompute (:func:`gather_signup_facts`) a list
    route passes in so this predicate is not an N+1 (#1377). It must have been
    gathered for ``character``; omitting it makes every read here instead. It
    changes no answer — only how many queries the answer costs.
    """
    if character is None:
        return SignupEligibility(allowed=False)

    # Metatasks are stickers applied to a praxis (edit-praxis seal stack), never
    # signup targets — reject before any level/status work (#1001).
    if task.task_type == TaskType.metatask:
        return SignupEligibility(False, SignupDenialReason.is_metatask)

    if facts is not None:
        stats = facts.stats
    else:
        era_row = await get_current_era_row(session)
        stats = await get_or_create_stats(session, character.id, era_row.id)

    level_reach = available_level_reach(
        character.faction_slug, stats.level, stats.level_jump_used_at_level, era
    )
    if not meets_task_level(stats.level, task, level_reach):
        return SignupEligibility(False, SignupDenialReason.below_level)

    if task.status == TaskStatus.retired and character.faction_slug not in era.allow_praxis_on_retired_task_factions:
        return SignupEligibility(False, SignupDenialReason.task_status_closed)
    if task.status == TaskStatus.pending and character.faction_slug not in era.allow_praxis_on_pending_task_factions:
        return SignupEligibility(False, SignupDenialReason.task_status_closed)

    if facts is not None and task.id in facts.task_ids:
        already_member = task.id in facts.active_member_task_ids
    else:
        already_member = await is_active_member_of_task(character, task, session, era)
    if already_member:
        return SignupEligibility(False, SignupDenialReason.already_active_member)

    in_progress_count = (
        facts.in_progress_praxis_count
        if facts is not None
        else await count_in_progress_praxes(character.id, session)
    )
    if in_progress_count >= era.max_task_signups:
        return SignupEligibility(False, SignupDenialReason.bank_full)

    return SignupEligibility(allowed=True)


async def signup_reason(
    character: Optional[Character],
    task: Task,
    eligibility: SignupEligibility,
    session: AsyncSession,
    *,
    facts: Optional[SignupFacts] = None,
) -> Optional[str]:
    """The ``TaskOut.signup_reason`` the wire carries — *why* this viewer may or may
    not claim this task (#1497).

    ``None`` means "nothing to explain": an ordinary first claim, or an anonymous
    viewer who has no standing to be given a reason. Otherwise it is either a
    :class:`SignupDenialReason` value (the blocked state, so the client can say
    which gate closed) or :data:`SIGNUP_REASON_MULTI_MEMBERSHIP`.

    The allowed-but-notable case is derived, never branched on a slug: if
    :func:`evaluate_signup` says yes *and* the viewer already holds a membership,
    the only rule that can have let both be true is the multi-membership ability.
    That is why this reads the raw membership set rather than
    ``active_member_task_ids``, which the ability empties by construction.

    ``facts`` is the page-wide precompute and carries #1377's property: an id
    outside ``facts.task_ids`` falls back to its own read instead of taking the
    absence as "not a member".
    """
    if eligibility.reason is not None:
        return eligibility.reason.value
    if not eligibility.allowed or character is None:
        return None

    if facts is not None and task.id in facts.task_ids:
        holds_membership = task.id in facts.held_membership_task_ids
    else:
        holds_membership = task.id in await held_membership_task_ids(
            character, [task.id], session
        )
    return SIGNUP_REASON_MULTI_MEMBERSHIP if holds_membership else None


def multi_membership_faction_slugs(era: EraConfig = CURRENT_ERA) -> tuple[str, ...]:
    """Slugs whose members may hold more than one active membership on a task.

    The "Double Dipper" ability (Everymen in Era 1) read off ``era`` rather than
    branched on a slug — it is a ``FactionConfig.can_hold_multiple_memberships``
    field, the same shape as WOW's level jump (#1359).

    This is the *only* statement of the rule. :func:`active_member_task_ids_subquery`
    applies it in SQL and every Python caller reaches that subquery, so the
    browse list and the sign-up predicate cannot answer differently.
    """
    return tuple(
        sorted(
            slug
            for slug, faction in era.factions.items()
            if faction.can_hold_multiple_memberships
        )
    )


def _held_membership_task_ids_subquery(character_id: int):
    """Task IDs where ``character_id`` holds an active praxis membership — **the raw
    fact, with no ability applied**.

    "Active" means the praxis status is ``in_progress``, ``pending`` or ``submitted``.

    "Am I on this task" is not the same question as "does being on this task stop me
    claiming it again". Double Dipper is precisely the gap between the two, and
    ``TaskOut.signup_reason`` needs both sides of it to tell "begin again" from
    "you have never started this" (#1497).
    :func:`active_member_task_ids_subquery` is this select plus the carve-out, so
    the carve-out is still written exactly once.
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
    """SQL subquery returning task IDs whose membership **blocks** a fresh claim.

    Used by the task-list query to exclude tasks the character is already working on,
    and by :func:`active_member_task_ids` for the Python answer.

    The Double Dipper carve-out lives *here*, in the SQL, and not in a Python
    branch above it: the browse exclusion (``services.task.list_tasks``) reaches
    this function without going through the predicate, so a carve-out stated
    anywhere else is one the browse silently ignores — which is exactly how a
    task an Everymen character could legitimately claim again went missing from
    their own list (#1359). The join is on the membership's character, whose id
    is a primary key, so it adds a row lookup and no fan-out.
    """
    return _held_membership_task_ids_subquery(character_id).where(
        Character.faction_slug.notin_(multi_membership_faction_slugs(era))
    )


async def held_membership_task_ids(
    character: Character,
    task_ids: Collection[int],
    session: AsyncSession,
) -> frozenset[int]:
    """Which of ``task_ids`` ``character`` is on **at all** — ONE query, no carve-out.

    The batch sibling of :func:`active_member_task_ids`, reading
    :func:`_held_membership_task_ids_subquery` instead. Takes no ``era`` because no
    ruleset changes the raw fact; only what the fact *means* is era-dependent, and
    that lives in :func:`multi_membership_faction_slugs`.
    """
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
    """Which of ``task_ids`` ``character`` already holds an active membership on — ONE query.

    "Active" is the same population as :func:`active_member_task_ids_subquery`,
    which is also where the Double Dipper carve-out is applied: a member of a
    faction that may hold multiple memberships matches no row, so the gate never
    closes for them.

    The batch form of :func:`is_active_member_of_task`, which delegates here
    — one implementation, so the page-wide answer and the single-task answer
    cannot drift (#1377).
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
    """Which of ``task_ids`` ``character`` holds an OPEN DRAFT on, and which praxis
    — ONE query. The source of ``TaskOut.in_progress_praxis_id`` (#2359).

    A THIRD population, and it can be folded into neither of its two siblings
    above, which is why it is its own read rather than a column added to one of
    them:

    * :func:`held_membership_task_ids` is wider — it counts ``pending`` and
      ``submitted`` too. A submitted praxis shuts sign-up but leaves nothing to
      edit, so borrowing its rows would hand out ids to editors that will refuse
      them. ``in_progress`` is what the task detail page means by "your draft"
      (``useTaskDetail.ts`` fetches exactly ``status=in_progress``), and the two
      surfaces must not disagree about which praxis is yours.
    * :func:`active_member_task_ids` is narrower — the Double Dipper carve-out
      empties it for factions that may hold several memberships. "Do I have a
      draft here" is a raw fact no ability changes.

    No ``era``, for :func:`held_membership_task_ids`'s reason: no ruleset changes
    the raw fact.

    A character may hold more than one open draft on one task (Double Dipper);
    the ordering makes the newest one the answer rather than an arbitrary one.
    """
    return await _own_praxis_ids(character, task_ids, PraxisStatus.in_progress, session)


async def submitted_praxis_ids(
    character: Character,
    task_ids: Collection[int],
    session: AsyncSession,
) -> dict[int, int]:
    """Which of ``task_ids`` ``character`` has FILED a praxis on, and which praxis
    — ONE query. The source of ``TaskOut.submitted_praxis_id`` (#2643).

    The twin of :func:`in_progress_praxis_ids` one status further on, and it
    exists for the same reason: ``already_active_member`` is the denial a card
    spends its only slot on, and for a *submitted* praxis the useful thing —
    reading it — is one hop away with no id to reach it by. Same viewer scoping,
    same page-wide shape, same absence of ``era``.

    ``submitted`` ONLY, deliberately narrower than the denial's own population
    (``in_progress``, ``pending``, ``submitted``). ``pending`` is a praxis
    awaiting moderation and is nobody's "read your praxis"; it keeps falling
    through to the plain label, exactly as it did before this field existed.

    A character may have submitted MORE THAN ONCE to one task — re-signing up
    after a first praxis is filed is a live path (``ctaAgain``, Double Dipper) —
    so this holds the MOST RECENT one. That is the ordering below and not the
    query's default: ascending ``Praxis.id`` with a last-write-wins dict leaves
    the highest id, and ids are monotonic. A stale first attempt would be the
    wrong door to offer someone who has already filed a second.
    """
    return await _own_praxis_ids(character, task_ids, PraxisStatus.submitted, session)


async def _own_praxis_ids(
    character: Character,
    task_ids: Collection[int],
    status: PraxisStatus,
    session: AsyncSession,
) -> dict[int, int]:
    """Task id → ``character``'s own praxis in ``status`` on it, newest wins.

    The one query behind both readers above, so the two cannot drift on the part
    that matters most: **the membership join is what scopes this to the viewer**.
    Written once, it cannot be dropped from one of them and leak a stranger's
    praxis id onto a task with many submissions.

    Private because the two named readers are the vocabulary — a caller wanting
    "the viewer's praxis in status X" for some third X is a population that
    should arrive with its own docstring saying what it means, as those two do.
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
    """Return True if ``character`` holds an active praxis membership for ``task``.

    False for a faction the era grants Double Dipper to — see
    :func:`multi_membership_faction_slugs`.
    """
    return task.id in await active_member_task_ids(character, [task.id], session, era)


def allowed_praxis_modes(
    character: Optional[Character],
    character_level: int,
    era: EraConfig = CURRENT_ERA,
) -> list[PraxisType]:
    """Return the praxis modes a character may create directly.

    Single source for the mode-by-level gates — enforcement in
    :func:`services.praxis._check_create_preconditions` and the UI flag on
    :class:`~schemas.task.TaskOut` both derive from this list.

    - Solo: always allowed once a viewer is authenticated.
    - Collab: requires ``character_level >= era.collaboration_level_required``.
    - Duel: issued via the challenge endpoint (ADR-0011), not direct creation.

    Anonymous viewers (``character is None``) receive an empty list so the
    UI can hide the mode picker entirely.
    """
    if character is None:
        return []
    modes: list[PraxisType] = [PraxisType.solo]
    if character_level >= era.collaboration_level_required:
        modes.append(PraxisType.collab)
    return modes


def is_task_eligible_for_character(
    character: Optional[Character],
    task: Task,
    character_level: int,
    level_reach: int = 0,
) -> bool:
    """Return True if ``character`` is eligible to act on ``task``.

    The gate is ``task.level_required`` plus whatever
    :func:`services.faction_service.faction_permits` enforces — presently
    nothing, as metatasks are faction-open. Anonymous viewers are
    never eligible.

    Note this mirrors the metatask scoring gate in
    :func:`services.meta_task.get_meta_task_points_bulk`
    (``character_level >= task.level_required``)
    rather than the stricter :func:`apply_metatask` service gate. The flag is
    intended for UI affordances such as "metatasks this character could use
    if they had one" — apply time still runs the full guard.
    """
    if character is None:
        return False
    # Two named single-purpose gates, no bundled inline checks (#171, #292).
    # ``level_reach`` (#811) is threaded through so the "eligible" affordance
    # matches what evaluate_signup would actually allow.
    if not meets_task_level(character_level, task, level_reach):
        return False
    if not faction_permits(character, task):
        return False
    return True
