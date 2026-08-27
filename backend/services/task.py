from dataclasses import dataclass
from datetime import datetime, timedelta, timezone
from enum import Enum
from typing import Collection, Optional

from fastapi import HTTPException
from sqlalchemy import and_, exists, false, func, or_, select, true
from sqlalchemy.ext.asyncio import AsyncSession

from errors import ErrorCode, raise_coded
from faction_slugs import CROSS_FACTION_SLUG, faction_filter_slugs
from game_config import CURRENT_ERA, EraConfig
from models.account import Account
from models.character import Character
from models.character_stats import CharacterStats
from models.praxis import Praxis, PraxisMember, PraxisStatus
from models.task import Task, TaskStatus, TaskType
from schemas.task import TaskCreate, TaskOut, TaskSignupOut
from seed import ONBOARDING_TASK_TITLE
from services.era import (
    get_current_era_row,
    get_current_era_row_safe,
    get_or_create_stats,
)
from services.albescent_reveal import is_albescent_revealed
from services.faction_service import hidden_faction_slugs
from services.meta_task import character_sees_metatasks
from services.praxis import (
    # Private, but the bank-cap count has exactly one correct implementation and
    # services.duel already imports it the same way. A second COUNT here is how
    # the filter and the sign-up predicate would start disagreeing.
    _count_in_progress_praxes,
    active_member_task_ids_subquery,
    allowed_praxis_modes,
    evaluate_signup,
    in_progress_praxis_ids,
    gather_signup_facts,
    is_task_eligible_for_character,
    signup_reason,
    submitted_praxis_ids,
    SignupFacts,
)
from services.level_jump import available_level_reach


async def propose_task(
    character: Character,
    data: TaskCreate,
    session: AsyncSession,
    skip_level_check: bool = False,
    era: EraConfig = CURRENT_ERA,
) -> Task:
    """Propose a new task. Returns the pending Task.

    ``task_type`` on the incoming payload selects the gate:
    - ``standard`` (default): ``era.level_to_propose_task`` unless ``skip_level_check`` (admin).
    - ``metatask``: ``era.level_to_propose_metatask`` unless ``skip_level_check`` (admin).
      Additionally requires ``metatask_faction_slug`` to be set.
    """
    era_row = await get_current_era_row(session)
    stats = await get_or_create_stats(session, character.id, era_row.id)

    task_type = TaskType.standard
    if data.task_type:
        try:
            task_type = TaskType(data.task_type)
        except ValueError:
            raise HTTPException(
                status_code=422,
                detail=f"Invalid task_type: {data.task_type}",
            )

    if task_type == TaskType.metatask:
        if not skip_level_check and stats.level < era.level_to_propose_metatask:
            raise_coded(
                403,
                ErrorCode.metatask_proposal_level_too_low,
                f"Must be level {era.level_to_propose_metatask} or above to propose metatasks.",
                {"level": era.level_to_propose_metatask},
            )
        if not data.metatask_faction_slug:
            raise HTTPException(
                status_code=422,
                detail="metatask_faction_slug is required for metatask proposals.",
            )
    else:
        if not skip_level_check and stats.level < era.level_to_propose_task:
            raise_coded(
                403,
                ErrorCode.task_proposal_level_too_low,
                f"Must be level {era.level_to_propose_task} or above to propose tasks.",
                {"level": era.level_to_propose_task},
            )

    task = Task(
        title=data.title,
        description=data.description or "",
        notes=data.notes or "",
        point_value=data.point_value,
        level_required=data.level_required,
        primary_faction_slug=data.primary_faction_slug or CROSS_FACTION_SLUG,
        metatask_faction_slug=(
            data.metatask_faction_slug if task_type == TaskType.metatask else None
        ),
        task_type=task_type,
        created_by=character.id,
        status=TaskStatus.pending,
    )
    session.add(task)
    await session.flush()
    await session.refresh(task)
    return task


@dataclass(frozen=True)
class TaskAuthor:
    """The denormalised proposing character behind ``TaskOut.created_by_*``.

    Assembled by :func:`authors_for_tasks` from the author's ``Character`` row
    plus their ``CharacterStats`` row for the current era. ``level`` is
    era-scoped (ADR-0042) and is 0 when no stats row exists for this era.
    """

    display_name: str
    avatar_url: str
    faction_slug: Optional[str]
    level: int


#: Author fields for a task whose proposer could not be resolved (the FK makes
#: this unreachable in practice; it keeps the builder total).
UNKNOWN_TASK_AUTHOR = TaskAuthor(
    display_name="", avatar_url="", faction_slug=None, level=0
)


async def authors_for_tasks(
    tasks: Collection[Task],
    session: AsyncSession,
) -> dict[int, TaskAuthor]:
    """Author rows for a page of tasks, in ONE join — keyed by CHARACTER id.

    ``TaskOut`` carries the proposer's name, portrait, faction and level for
    the task-detail author row (#1029), and ``TaskOut`` is what the browse
    LIST returns, so resolving the author per task would make a 50-task page
    fire 50 author queries. This is the same precompute shape as
    :func:`in_progress_counts_for_tasks` (#1021): the route calls it once for
    the whole page and passes each task's entry into :func:`build_task_out`.

    Keyed by ``Task.created_by`` rather than by task id because authors repeat
    — ``seed.py`` proposes every era task as one character, so a whole page of
    seeded tasks collapses to a single map entry.

    ``level`` needs ``CharacterStats`` for the current era, which is why this
    is a helper and not a ``selectinload`` of a ``Task.author`` relationship:
    an ORM eager-load of ``Character`` alone still could not supply it. On an
    unseeded database (no era row) every level falls back to 0 rather than
    raising, so task reads never depend on era seeding.
    """
    creator_ids = {task.created_by for task in tasks}
    if not creator_ids:
        return {}

    era_row = await get_current_era_row_safe(session)
    era_id = era_row.id if era_row is not None else None

    stats_join = CharacterStats.character_id == Character.id
    if era_id is not None:
        stats_join = and_(stats_join, CharacterStats.era_id == era_id)

    result = await session.execute(
        select(
            Character.id,
            Character.display_name,
            Character.avatar_url,
            Character.faction_slug,
            CharacterStats.level,
        )
        .outerjoin(CharacterStats, stats_join)
        .where(Character.id.in_(creator_ids))
    )
    return {
        character_id: TaskAuthor(
            display_name=display_name or "",
            avatar_url=avatar_url or "",
            faction_slug=faction_slug,
            level=int(level or 0),
        )
        for character_id, display_name, avatar_url, faction_slug, level in result.all()
    }


async def build_task_out(
    task: Task,
    session: AsyncSession,
    *,
    in_progress_count: Optional[int] = None,
    author: Optional[TaskAuthor] = None,
) -> TaskOut:
    """Convert a Task ORM instance to a TaskOut schema.

    This builder does not compute any viewer-relative fields; flags such as
    ``can_sign_up``, ``allowed_modes``, and ``eligible_for_current_user``
    are left at their safe defaults. Use :func:`build_task_out_for_viewer`
    from a route that has an authenticated viewer available.

    ``in_progress_count`` is the task's active-signup count (#1021); list
    routes precompute it once via :func:`in_progress_counts_for_tasks` for
    every task on the page and pass the per-task value here to avoid an N+1.
    Single-task routes may leave the default, which self-computes via the
    same helper scoped to just this one task.

    ``author`` is the proposing character (#1029) behind the ``created_by_*``
    fields, and follows the same rule: list routes precompute the page's
    authors once via :func:`authors_for_tasks`, single-task routes may leave
    the default and let this builder resolve the one author itself.
    """
    if in_progress_count is None:
        counts = await in_progress_counts_for_tasks([task.id], session)
        in_progress_count = counts.get(task.id, 0)

    if author is None:
        authors = await authors_for_tasks([task], session)
        author = authors.get(task.created_by, UNKNOWN_TASK_AUTHOR)

    return TaskOut(
        id=task.id,
        title=task.title,
        description=task.description,
        point_value=task.point_value,
        level_required=task.level_required,
        status=task.status,
        task_type=task.task_type,
        created_by=task.created_by,
        primary_faction_slug=task.primary_faction_slug,
        metatask_faction_slug=task.metatask_faction_slug,
        created_at=task.created_at,
        in_progress_count=in_progress_count,
        created_by_display_name=author.display_name,
        created_by_avatar_url=author.avatar_url,
        created_by_faction_slug=author.faction_slug,
        created_by_level=author.level,
    )


async def start_here_for_viewer(
    task: Task,
    viewer: Character,
    session: AsyncSession,
) -> bool:
    """The *start here* mark, derived (#1861, SPEC-onboarding § The hand-off).

    True iff ``task`` is the one game-wide onboarding task and ``viewer`` has
    **never completed it, ever**. Never hand-set: there is no column, no flag
    and no era filter behind this, only the character's own praxis history.

    THE SAME RULE THAT STOPS THE FLOW. It has three consumers — the mark drawn
    wherever the task appears, ``CreateCharacter``'s hand-off destination, and
    the ``/start`` flow's stop condition — and they stay consistent by all
    reading the one field this fills (``TaskOut.start_here``). A second signal
    would let the flow refuse to start someone whose task is simultaneously
    marked *start here*.

    NOT ERA-SCOPED. An era reset drops every character to level 0, so "has not
    completed it *this era*" would relight the mark for the whole playerbase at
    every rollover. This read carries no era filter — notably not
    ``Praxis.era_id``, which every praxis sealed since #1398 does carry and
    which is exactly the wrong thing to join on here. Praxis history outlives
    resets already, so the honest rule costs no new storage.

    COMPLETED means published — ``status == submitted``, the seal that awards
    the points. A claim is not a completion, or the flow would stop applying to
    someone who has done nothing yet.

    Keyed on the title, because that is already the onboarding task's identity
    everywhere else: :func:`seed.ensure_onboarding_task` upserts on it, the
    ``0004`` data migration matched on it, and
    :func:`services.era.apply_era_reset` spares the task by it. A second key
    would be a second thing to keep true.

    ONE EXTRA QUERY PER PAGE AT MOST, not per row (#1377): the title test
    short-circuits, and at most one row on any page is the onboarding task.
    """
    if task.title != ONBOARDING_TASK_TITLE:
        return False

    completed = await session.scalar(
        select(
            exists()
            .where(Praxis.task_id == task.id)
            .where(Praxis.status == PraxisStatus.submitted)
            .where(PraxisMember.praxis_id == Praxis.id)
            .where(PraxisMember.character_id == viewer.id)
        )
    )
    return not completed


async def build_task_out_for_viewer(
    task: Task,
    viewer: Optional[Character],
    session: AsyncSession,
    era: EraConfig = CURRENT_ERA,
    *,
    in_progress_count: Optional[int] = None,
    author: Optional[TaskAuthor] = None,
    signup_facts: Optional[SignupFacts] = None,
) -> TaskOut:
    """Build a :class:`TaskOut` with viewer-relative capability flags.

    Populates ``can_sign_up``, ``allowed_modes``, and
    ``eligible_for_current_user`` using the authenticated viewer's character
    (``None`` for anonymous callers). All three flags default to the same
    safe values as :func:`build_task_out` when ``viewer`` is ``None``.

    ``in_progress_count`` and ``author`` are passed straight through to
    :func:`build_task_out` — see its docstring. List routes should precompute
    both once per page (via :func:`in_progress_counts_for_tasks` and
    :func:`authors_for_tasks`); single-task routes may leave them to
    self-compute.

    ``signup_facts`` is the third precompute and follows the same rule (#1377):
    every viewer-relative flag below reads the era row, the viewer's stats,
    their bank count and their membership on this task, and all four are
    identical for every task on a page. List routes gather them once via
    :func:`services.praxis.gather_signup_facts` for the whole page — without
    that, a 50-row page paid six queries per row. Single-task routes may leave
    the default and let this builder gather facts for the one task.
    """
    base = await build_task_out(
        task, session, in_progress_count=in_progress_count, author=author
    )

    if viewer is None:
        return base

    if signup_facts is None:
        signup_facts = await gather_signup_facts(viewer, [task.id], session, era)
    stats = signup_facts.stats

    # One evaluation, both answers. `can_sign_up` is the verdict, with the reason
    # discarded; `signup_reason` is *why*, so the client can label its call to
    # action off the server's ruling instead of mirroring the rule locally and
    # drifting (#1497). This assignment IS the flag — there is no second helper
    # behind it, and tests/integration/test_signup_eligibility.py pins the bank
    # cap here rather than one level down (#2696).
    eligibility = await evaluate_signup(viewer, task, session, era, facts=signup_facts)
    base.can_sign_up = eligibility.allowed
    base.signup_reason = await signup_reason(
        viewer, task, eligibility, session, facts=signup_facts
    )
    # The viewer's own open draft on this task, so a card can OFFER it instead of
    # announcing it (#2359) — and its filed twin, so the same card can offer the
    # praxis to READ when there is nothing left to edit (#2643). Both carry
    # #1377's fallback property, exactly as `signup_reason` above does: an id
    # outside the page these facts were gathered for means "not asked about",
    # never "no praxis". Both are `viewer`-scoped by the query behind them, so
    # neither can name a praxis that is not this viewer's own.
    if task.id in signup_facts.task_ids:
        base.in_progress_praxis_id = signup_facts.in_progress_praxis_ids.get(task.id)
        base.submitted_praxis_id = signup_facts.submitted_praxis_ids.get(task.id)
    else:
        base.in_progress_praxis_id = (
            await in_progress_praxis_ids(viewer, [task.id], session)
        ).get(task.id)
        base.submitted_praxis_id = (
            await submitted_praxis_ids(viewer, [task.id], session)
        ).get(task.id)
    base.allowed_modes = [m.value for m in allowed_praxis_modes(viewer, stats.level, era)]
    base.eligible_for_current_user = is_task_eligible_for_character(
        viewer,
        task,
        stats.level,
        available_level_reach(
            viewer.faction_slug, stats.level, stats.level_jump_used_at_level, era
        ),
    )
    base.start_here = await start_here_for_viewer(task, viewer, session)
    return base


async def list_signups_for_task(
    task_id: int,
    session: AsyncSession,
) -> list[tuple[PraxisMember, Character, Praxis, int]]:
    """List in-progress praxis members for a task (characters currently working on it).

    Each row is ``(member, character, praxis, level)`` where ``level`` is the
    character's CURRENT-era level (``CharacterStats.level``, ADR-0042) for the
    roster row's "lvl N" (#1029), 0 when they have no stats row for this era.
    It comes from an outer join in this same query, so the roster stays one
    query however many characters are on it.

    Raises 404 if the task does not exist.
    """
    task = await session.get(Task, task_id)
    if task is None:
        raise HTTPException(status_code=404, detail="Task not found.")

    era_row = await get_current_era_row_safe(session)
    stats_join = CharacterStats.character_id == Character.id
    if era_row is not None:
        stats_join = and_(stats_join, CharacterStats.era_id == era_row.id)

    result = await session.execute(
        select(PraxisMember, Character, Praxis, CharacterStats.level)
        .join(Praxis, PraxisMember.praxis_id == Praxis.id)
        .join(Character, PraxisMember.character_id == Character.id)
        .outerjoin(CharacterStats, stats_join)
        .where(
            Praxis.task_id == task_id,
            Praxis.status.in_([PraxisStatus.in_progress, PraxisStatus.pending]),
        )
        .order_by(PraxisMember.joined_at.asc())
    )
    return [
        (member, character, praxis, int(level or 0))
        for member, character, praxis, level in result.all()
    ]


def build_task_signup_out(
    member: PraxisMember,
    character: Character,
    praxis: Praxis,
    level: int,
) -> TaskSignupOut:
    """Assemble one roster row from a :func:`list_signups_for_task` tuple.

    Mirrors :func:`build_task_out` — the row is composed here in the service, not
    in the route, and the route simply maps this over the query result (#1051).

    Deliberately projects a *chosen* set of columns off ``character`` rather than
    validating the ORM object wholesale: ``Character`` carries ``account_id``,
    which must never reach a public response.
    """
    return TaskSignupOut(
        character_id=character.id,
        display_name=character.display_name,
        avatar_url=character.avatar_url,
        faction_slug=character.faction_slug,
        # Current-era level for the roster row's "lvl N" (#1029); joined in
        # list_signups_for_task, so the roster is still one query.
        level=level,
        praxis_type=praxis.type,
        joined_at=member.joined_at,
    )


async def in_progress_counts_for_tasks(
    task_ids: Collection[int],
    session: AsyncSession,
) -> dict[int, int]:
    """Grouped count of active signups per task, in ONE query.

    An "active signup" is a ``PraxisMember`` row on a ``Praxis`` whose status
    is ``in_progress`` or ``pending`` — the exact population
    :func:`list_signups_for_task` lists for a single task, reduced to a count
    here and grouped across every requested task id (#1021), so populating
    ``TaskOut.in_progress_count`` for a page of tasks never becomes a
    per-task query.

    Task ids with no active signups are simply absent from the returned map;
    callers should treat a missing entry as 0 (see :func:`build_task_out`).
    """
    if not task_ids:
        return {}

    agg_result = await session.execute(
        select(Praxis.task_id, func.count(PraxisMember.id))
        .join(PraxisMember, PraxisMember.praxis_id == Praxis.id)
        .where(
            Praxis.task_id.in_(task_ids),
            Praxis.status.in_([PraxisStatus.in_progress, PraxisStatus.pending]),
        )
        .group_by(Praxis.task_id)
    )
    return {task_id: int(count or 0) for task_id, count in agg_result.all()}


class TaskSort(str, Enum):
    """The orderings ``GET /tasks`` accepts (#1364) — a closed set (#1443).

    ``newest``/``oldest`` order on ``Task.created_at``, tiebroken on ``id`` so a
    paged read stays stable when rows share a timestamp. ``level`` names the
    browse default — easiest first, richest within a level — and is ascending
    only: there is no level-descending twin.

    Closed is the point (#1443): an unrecognised ``sort`` must not fall through
    to ``level`` and answer 200, or a typo'd value silently buys a different
    ordering than the one asked for with nothing to surface the mistake.
    Mirrors :class:`services.praxis.PraxisSort`, whose router raises 422 on the
    same input. An *absent* sort is still legal and still means ``level``.
    """

    newest = "newest"
    oldest = "oldest"
    level = "level"


def viewer_sees_pending_tasks(
    viewer_level: int, is_admin: bool, era: EraConfig = CURRENT_ERA
) -> bool:
    """WHO may watch the review queue — the level-3 unlock, admins exempt.

    ``viewer_level`` is ``-1`` for an anonymous caller, who sits below every
    gate by construction: this is an ability a *character* earns, so there is no
    level to read. ``is_admin`` bypasses it because the pending queue is the
    moderation queue (`is_admin` and `skip_level_check` answer different
    questions — see :func:`list_tasks`).
    """
    return is_admin or viewer_level >= era.level_to_see_pending_tasks


def pending_visibility_clause(
    viewer_level: int,
    is_admin: bool,
    era: EraConfig = CURRENT_ERA,
    viewer_id: Optional[int] = None,
):
    """The whole pending rule as one WHERE clause: the level AND the window.

    Stated once and applied at every door that can return a task — the browse
    (:func:`list_tasks`) and the detail read (:func:`get_task_for_viewer`).
    Both have to ask (#1725): task ids are sequential, so a detail read that
    does not is an id-guessing door onto a proposal nobody was cleared for.
    A second copy of a rule with an era-configured level *and* an age window is
    how the two drift; hence a clause both callers pass to their query rather
    than a predicate each restates.

    ``era.pending_task_admin_review_hours`` (#1695) is the second half: the
    level unlock only reaches a proposal once it is that old, so an admin gets
    the first look and can edit or reject it before other players read it. It is
    a per-ROW fact — the same level-3 player sees the ripe rows and not the
    fresh ones — so it is a clause, not a third boolean.

    The clock is ``created_at``, never ``updated_at`` (owner ruling on #1695):
    the window is "time for an admin to look", not "time since last touched", so
    an edit at hour 47 must not restart it and make the go-live time
    unpredictable. ``Task`` has no other timestamp and does not need one — a task
    can re-enter ``pending`` from ``active``, but only an admin can move it
    (:func:`services.admin_service.update_task_status`), so on that path the "no
    admin has looked yet" premise this window protects is already false.

    ``viewer_id`` is the reading character's id, or ``None`` for an anonymous
    caller, and exempts the rows that character *wrote* (#2126). Pass it at every
    door: a carve-out one caller states and another forgets is how the profile
    and the browse end up disagreeing about the same row.

    ponytail: if a NON-admin path ever sends a task back to ``pending``,
    ``created_at`` stops being the proposal clock and this wants a dedicated
    ``pending_since`` column stamped on every transition into the status.
    """
    if is_admin:
        # Exempt, not merely early: the window exists to give admins the first
        # look, so holding it against them defeats the feature.
        return true()
    # The author is exempt for the same reason (#2126): the window withholds a
    # proposal from *other players* — which is what the propose-success screen
    # promises in so many words — and its author is not one of them. They wrote
    # the row and were just told it is under review, so there is nothing left to
    # withhold, and hiding it would make "Proposed tasks" answer "none" to the
    # one person who knows better. This is a per-ROW carve-out, not a level, so it
    # rides in the clause with the window rather than becoming another boolean.
    own = false() if viewer_id is None else Task.created_by == viewer_id
    if viewer_sees_pending_tasks(viewer_level, is_admin, era):
        return or_(
            Task.status != TaskStatus.pending,
            Task.created_at
            <= datetime.now(timezone.utc)
            - timedelta(hours=era.pending_task_admin_review_hours),
            own,
        )
    return or_(Task.status != TaskStatus.pending, own)


async def get_task_for_viewer(
    session: AsyncSession,
    task_id: int,
    viewer: Optional[Character],
    *,
    is_admin: bool = False,
    era: EraConfig = CURRENT_ERA,
) -> Optional[Task]:
    """One task by id, or ``None`` when the pending gate withholds it (#1725).

    The route turns ``None`` into 404 — never 403, which would confirm the id
    exists and hand an enumerating caller the existence oracle the review window
    is there to close.

    Only ``pending`` is ever withheld here. ``active`` and ``retired`` are
    returned to anyone: praxis link back to retired tasks, and
    ``era.level_to_see_retired_tasks`` gates *the archive* — the browse — not
    every mention of a retired task, the same distinction
    :func:`list_tasks` already draws for a proposer's profile.

    That is also why the status is read before the viewer's level: a detail read
    of an approved task must not start costing two extra queries to enforce a
    gate that cannot apply to it.
    """
    task = await session.get(Task, task_id)
    if task is None or task.status is not TaskStatus.pending:
        return task
    viewer_level = -1
    if viewer is not None:
        era_row = await get_current_era_row(session)
        stats = await get_or_create_stats(session, viewer.id, era_row.id)
        viewer_level = stats.level
    visible = await session.scalar(
        select(Task.id).where(
            Task.id == task_id,
            pending_visibility_clause(
                viewer_level, is_admin, era, viewer_id=viewer.id if viewer else None
            ),
        )
    )
    return task if visible is not None else None


async def list_tasks(
    session: AsyncSession,
    *,
    status: Optional[str] = None,
    can_sign_up: bool = False,
    faction: Optional[list[str]] = None,
    min_points: Optional[int] = None,
    max_points: Optional[int] = None,
    exclude_character_id: Optional[int] = None,
    created_by: Optional[int] = None,
    task_type: Optional[str] = None,
    q: Optional[str] = None,
    sort: Optional[TaskSort] = None,
    limit: int = 50,
    offset: int = 0,
    viewer: Optional[Character] = None,
    # The viewer's *account*, not a second spelling of `viewer`: the reveal flag
    # is account-scoped and sticky across lives (ADR-0041), and an authenticated
    # caller with no character still has one (#2422).
    viewer_account: Optional[Account] = None,
    skip_level_check: bool = False,
    # Deliberately not folded into `skip_level_check`: that one answers "may this
    # viewer see tasks above their level", this one answers "may they see the
    # moderation queue" — and, since #2400, "is this viewer treated as revealed
    # to Albescent". They happen to be true together today.
    is_admin: bool = False,
    era: EraConfig = CURRENT_ERA,
) -> list[Task]:
    """Query tasks with optional filters, excluding hidden-faction tasks.

    If ``task_type`` is None (the default) only standard rows are returned, so
    metatasks never leak into the ordinary browse (#1001). Pass 'all' for both
    types, or 'standard'/'metatask' for a single-type filter.

    Metatask rows are additionally gated by ``era.level_to_see_metatasks``
    (#453): ``viewer`` (the authenticated character, ``None`` for anonymous
    callers) must be at or above the gate to receive them, mirroring the
    spec's "below level 6 cannot see the metatask list". ``skip_level_check``
    is the admin escape hatch, mirroring :func:`propose_task`.

    ``retired`` and ``pending`` rows are gated the same way, by
    ``era.level_to_see_retired_tasks`` and ``era.level_to_see_pending_tasks``.
    Both are advertised level unlocks, so both are enforced at every door here,
    and :func:`services.character_capabilities.compute_capabilities` states the same
    two thresholds for the ``/auth/me`` flags the UI gates its filter tabs on, so
    a tab is offered exactly when the query behind it will answer.

    ``pending`` carries one further rule (#1695): the level unlock only reaches a
    proposal once it is ``era.pending_task_admin_review_hours`` old, so an admin
    has a window to edit or reject it first. Admins are exempt, ``is_admin``
    being the same bypass the level gate takes; anonymous callers are below both
    and stay there.

    ``q`` is a free-text ``ilike`` over the task title, its description (#661),
    AND the proposing character's handle / display name (#681), mirroring the
    praxis-feed search in :func:`services.praxis.list_praxes`. A leading ``@``
    is treated as a sigil and dropped for the player axis only (``@mol`` finds
    ``@mollusk``), matching :func:`services.character.list_characters`.
    Metatasks are deliberately NOT excluded: whatever the type filter and the
    ``level_to_see_metatasks`` gate already let this viewer see stays
    searchable. It composes with every other filter as one more AND clause —
    no special interaction with ``exclude_character_id``, faction, or status.

    ``can_sign_up`` (#1130) narrows the list to the tasks ``viewer`` could claim
    right now — the SQL half of :func:`services.praxis.evaluate_signup`, the
    single sign-up predicate (ADR-0008). A plain level filter cannot express
    either of the faction abilities that bend the level bar (WOW's once-a-level
    jump, Ephemerists' retired-task access), which is why the whole predicate is
    restated rather than the level alone. Anonymous viewers get ``[]``:
    ``evaluate_signup`` refuses them, so there is no honest list to return.

    ``faction`` is a list of slugs matched as a union (#1364), so the browse
    filter can hold several factions at once; an empty list is no filter.

    ``sort`` is a :class:`TaskSort` or ``None``; ``None`` means
    :attr:`TaskSort.level`, the browse ordering ``Tasks.tsx`` gets by sending no
    ``sort`` at all. Rejecting an unknown *string* is the router's job (#1443) —
    by the time it reaches here the value is already a member of the enum.
    """
    # Collect hidden faction slugs to exclude their tasks (faction-rules seam, #171)
    hidden_slugs = await hidden_faction_slugs(session)

    query = select(Task)

    if created_by is not None:
        query = query.where(Task.created_by == created_by)

    # The viewer's current-era stats, read ONCE for the whole request: the two
    # status gates below want the level, the metatask visibility gate wants the
    # level, and the can_sign_up filter wants the level plus the level-jump
    # stamp. Several consumers, one query — the admin browse with the filter off
    # still reads nothing.
    viewer_stats: Optional[CharacterStats] = None
    if viewer is not None and (can_sign_up or not skip_level_check):
        era_row = await get_current_era_row(session)
        viewer_stats = await get_or_create_stats(session, viewer.id, era_row.id)
    # Anonymous viewers sit below every gate, which is the point: both abilities
    # below are things a *character* earns, so there is no level to read.
    viewer_level = viewer_stats.level if viewer_stats is not None else -1

    # The two status gates, stated once and applied at BOTH doors — an explicit
    # `?status=X` and the `?status=all` catch-all reach the same rows, and a gate
    # written at only one of them is not a gate: a promise living on a branch an
    # explicit status routes around is how the pending queue leaks.
    #
    # `retired` is the "the archive opens" level unlock (`era_1.py`,
    # `progression.json`), which `services.era.retire_all_tasks` describes as
    # "the board un-hides itself as players climb". It is a level gate, so
    # `skip_level_check` is what bypasses it.
    #
    # `pending` is the "watch proposals move through review" level unlock, and
    # is the moderation queue, so `is_admin` bypasses it rather than
    # `skip_level_check` (the two answer different questions — see the parameter
    # docs). The trade it makes is deliberate: reaching that level takes an
    # account and real investment, so pre-moderation proposals stay withheld
    # from the anonymous web while established players see them before an admin
    # has ruled on them.
    # The faction clause is not an exception to the archive gate, it is the only
    # way the perk means anything: a faction the era lets work retired tasks
    # cannot be forbidden from finding them. Without it an Ephemerist below level
    # 2 lost their faction's entire reason for existing, and the ``can_sign_up``
    # parity suite catches it. ``services.era.retire_all_tasks`` already names
    # this interaction — "an era listing a faction in
    # allow_praxis_on_retired_task_factions leaks a second way, for that faction
    # only" — so it is stated here rather than left to be rediscovered.
    viewer_sees_retired = (
        skip_level_check
        or viewer_level >= era.level_to_see_retired_tasks
        or (viewer is not None
            and viewer.faction_slug in era.allow_praxis_on_retired_task_factions)
    )
    viewer_sees_pending = viewer_sees_pending_tasks(viewer_level, is_admin, era)

    # Applied unconditionally here, which is the whole reason the pending rule is
    # a clause: every branch of the status logic below is downstream of this
    # `where`, so there is no door it can be forgotten at. That is the failure
    # this file already carries a comment about — a gate written at only one door
    # is not a gate — and it is why no branch below restates the level rule for
    # itself. `get_task_for_viewer` passes the same clause for the same reason
    # (#1725).
    query = query.where(
        pending_visibility_clause(
            viewer_level, is_admin, era, viewer_id=viewer.id if viewer else None
        )
    )

    if status and status != "all":
        try:
            requested_status = TaskStatus[status]
        except KeyError:
            raise HTTPException(status_code=422, detail=f"Invalid status: {status}")
        gate_closed = (
            requested_status == TaskStatus.pending and not viewer_sees_pending
        ) or (requested_status == TaskStatus.retired and not viewer_sees_retired)
        if gate_closed:
            # An empty page rather than a 403: no new error code for a filter no
            # legitimate client sends, and it says nothing about what is behind
            # the gate.
            query = query.where(false())
        else:
            query = query.where(Task.status == requested_status)
    elif not status:
        if created_by is not None:
            # Proposer's profile: show approved tasks (active + retired); pending
            # rows are admin-review submissions and stay hidden from all viewers.
            #
            # Deliberately NOT gated on `viewer_sees_retired`. The level-2 unlock
            # opens *the archive* — the browse — not every mention of a retired
            # task anywhere on the site. This surface is one character's own
            # proposals, reached by knowing their id, and hiding a proposer's
            # accepted work from newcomers reads as a bug rather than a reward.
            #
            # "All viewers" is one viewer too many (#2126): applied to your OWN
            # profile this clause hides the proposal you have just written, so
            # the section headed "Proposed tasks" answers "No proposed tasks
            # yet" and no amount of waiting fixes it — unlike the review window,
            # this one never expires. Skipping it for the owner does not widen
            # what anyone ELSE sees here; the shared pending clause above is
            # still the only thing that decides whether a pending row is
            # reachable at all, and it exempts the same author for the same
            # reason.
            if viewer is None or viewer.id != created_by:
                query = query.where(Task.status != TaskStatus.pending)
        else:
            query = query.where(Task.status == TaskStatus.active)
    else:
        # status == "all" is the other door onto the same rows. Whatever a gate
        # withholds from an explicit status it must withhold here too — pending
        # by the `pending_visibility` clause above, which every branch here is
        # downstream of, retired by the one line below.
        if not viewer_sees_retired:
            query = query.where(Task.status != TaskStatus.retired)

    # Task type filter — default (None) means STANDARD-ONLY so metatasks never
    # leak into the ordinary browse (#1001); pass "all" to get every type, or
    # "standard"/"metatask" for a single-type filter (422 on any other value).
    if task_type == "all":
        pass  # every type
    elif task_type is not None:
        try:
            query = query.where(Task.task_type == TaskType(task_type))
        except ValueError:
            raise HTTPException(
                status_code=422, detail=f"Invalid task_type: {task_type}"
            )
    else:
        query = query.where(Task.task_type == TaskType.standard)

    # Metatask visibility gate (#453): the metatask list only opens at
    # era.level_to_see_metatasks. Anonymous viewers are always below the gate.
    if not skip_level_check:
        if not character_sees_metatasks(viewer_level, era):
            query = query.where(Task.task_type != TaskType.metatask)

    # "Tasks I can sign up for" (#1130) — evaluate_signup's six gates, re-stated
    # as SQL. The predicate itself is async and hits the DB, so calling it per
    # row would be an N+1 on the page #1218 exists to speed up; instead the
    # per-character facts are hoisted above and only the per-task ones become
    # WHERE clauses. tests/integration/test_task_can_sign_up_filter.py is the
    # standing check that the two never disagree — that drift is the whole risk.
    if can_sign_up:
        # Gate 0 — evaluate_signup returns allowed=False for anonymous viewers.
        if viewer is None or viewer_stats is None:
            return []
        # Gate 6 — the bank cap is a gate on the character, not on any task, so
        # it cannot be a predicate. When it is what emptied the list, EVERY row
        # is ineligible and the honest answer is nothing at all.
        in_progress_count = await _count_in_progress_praxes(viewer.id, session)
        if in_progress_count >= era.max_task_signups:
            return []
        # Gate 1 — metatasks are applied to a praxis, never signed up for.
        query = query.where(Task.task_type != TaskType.metatask)
        # Gate 2 — the task-level bar plus whatever the faction's once-a-level
        # jump currently reaches. available_level_reach is the only thing that
        # may compute that number (#811), which is what makes WOW's level-4 rows
        # show up for a level-3 member here without a slug branch.
        level_reach = available_level_reach(
            viewer.faction_slug,
            viewer_stats.level,
            viewer_stats.level_jump_used_at_level,
            era,
        )
        query = query.where(Task.level_required <= viewer_stats.level + level_reach)
        # Gates 3 and 4 — written as exclusions rather than an allow-list of
        # statuses so a status added to the enum later is not silently opted in.
        if viewer.faction_slug not in era.allow_praxis_on_retired_task_factions:
            query = query.where(Task.status != TaskStatus.retired)
        if viewer.faction_slug not in era.allow_praxis_on_pending_task_factions:
            query = query.where(Task.status != TaskStatus.pending)
        # Gate 5 is the exclude_character_id clause below — reused, not rewritten.
        # This is the ONLY place the viewer becomes that default (#2264).
        # Defaulting it in the route instead, for every caller and regardless of
        # `can_sign_up`, would make a faction's task count depend on who was
        # reading it. Armed here it is scoped to the question that actually asks
        # it: "which tasks could I claim right now" — and a task you are already
        # working is not one of them, which is #1229's browse behaviour intact.
        if exclude_character_id is None:
            exclude_character_id = viewer.id

    # Multi-select faction (#1364): an empty list — or one holding only blanks,
    # which is what a cleared client-side filter sends — means "no faction
    # filter", never "match nothing". faction_filter_slugs also folds Albescent
    # under Unaffiliated (#1975); it is the ONE place that fold happens, shared
    # with the praxis feed and the character roster — including the one direction
    # a revealed viewer may un-fold (#2422).
    faction_slugs = faction_filter_slugs(
        faction,
        reveal_albescent=is_albescent_revealed(viewer_account, is_admin=is_admin),
    )
    if faction_slugs:
        query = query.where(Task.primary_faction_slug.in_(faction_slugs))
    if min_points is not None:
        query = query.where(Task.point_value >= min_points)
    if max_points is not None:
        query = query.where(Task.point_value <= max_points)

    if q:
        term = q.strip()
        if term:
            # ponytail: `ILIKE '%term%'` is a leading-wildcard match, so it is a
            # sequential scan no index can serve. Free at this row count (tens
            # of tasks) and it keeps the query one AND clause. If the task table
            # ever grows to where this bites, the upgrade path is Postgres
            # full-text (`to_tsvector`/`plainto_tsquery` + a GIN index) — noted,
            # not built.
            conditions = [
                Task.title.ilike(f"%{term}%"),
                Task.description.ilike(f"%{term}%"),
            ]
            # Author axis (#681): the same box also matches the proposer's
            # handle or display name. `IN (subquery)` rather than a join so a
            # matching author can never multiply the task's feed row.
            author_term = term.lstrip("@")
            if author_term:
                conditions.append(
                    Task.created_by.in_(
                        select(Character.id).where(
                            or_(
                                Character.username.ilike(f"%{author_term}%"),
                                Character.display_name.ilike(f"%{author_term}%"),
                            )
                        )
                    )
                )
            query = query.where(or_(*conditions))

    # Exclude tasks from hidden factions
    if hidden_slugs:
        query = query.where(Task.primary_faction_slug.notin_(hidden_slugs))

    # Exclude tasks the character has already started or completed (via praxis membership).
    # `era` is threaded rather than defaulted: this subquery reads the era's
    # Double Dipper set (#1359), so letting it fall back to CURRENT_ERA would answer with the LIVE
    # era's abilities for a caller that passed a different one — the drift the `era`
    # parameter exists to prevent.
    if exclude_character_id is not None:
        query = query.where(
            Task.id.notin_(active_member_task_ids_subquery(exclude_character_id, era))
        )

    if sort == TaskSort.newest:
        query = query.order_by(Task.created_at.desc(), Task.id.desc())
    elif sort == TaskSort.oldest:
        query = query.order_by(Task.created_at.asc(), Task.id.asc())
    else:
        # TaskSort.level, and the fall-through for an ABSENT sort only — an
        # unrecognised one never gets here, the router 422s it (#1443).
        query = query.order_by(Task.level_required.asc(), Task.point_value.desc())
    query = query.limit(limit).offset(offset)
    result = await session.execute(query)
    return list(result.scalars().all())
