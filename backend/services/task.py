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
from seed import ONBOARDING_TASK_SEED_KEY
from services.albescent_reveal import is_albescent_revealed
from services.era import (
    get_current_era_row,
    get_current_era_row_safe,
    get_or_create_stats,
)
from services.era_gates import (
    may_propose_metatask,
    may_propose_task,
    may_see_pending_tasks,
    may_see_retired_tasks,
)
from services.faction_service import hidden_faction_slugs
from services.level_jump import available_level_reach
from services.meta_task import character_sees_metatasks
from services.scoring import compute_faction_multiplier
from services.signup_eligibility import (
    SignupFacts,
    active_member_task_ids_subquery,
    allowed_praxis_modes,
    count_in_progress_praxes,
    evaluate_signup,
    gather_signup_facts,
    in_progress_praxis_ids,
    is_task_eligible_for_character,
    signup_reason,
    submitted_praxis_ids,
)


async def propose_task(
    character: Character,
    data: TaskCreate,
    session: AsyncSession,
    skip_level_check: bool = False,
    era: EraConfig = CURRENT_ERA,
) -> Task:
    """Propose a pending task; ``task_type`` picks the level gate. Metatasks need
    ``metatask_faction_slug``."""
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

    # ``skip_level_check`` is what ``era_gates`` calls ``is_admin`` (#2868); the
    # predicate owns the bypass so it can't drift from ``/auth/me``.
    if task_type == TaskType.metatask:
        if not may_propose_metatask(
            stats.level, character.faction_slug, skip_level_check, era
        ):
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
        if not may_propose_task(
            stats.level, character.faction_slug, skip_level_check, era
        ):
            raise_coded(
                403,
                ErrorCode.task_proposal_level_too_low,
                f"Must be level {era.level_to_propose_task} or above to propose tasks.",
                {"level": era.level_to_propose_task},
            )

    hidden = set(await hidden_faction_slugs(session))
    for slug in (data.primary_faction_slug, data.metatask_faction_slug):
        if slug in hidden:
            raise_coded(
                422,
                ErrorCode.task_faction_hidden,
                f"Tasks can't be created for faction: {slug}.",
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
    """Proposer behind ``TaskOut.created_by_*``. ``level`` is current-era (ADR-0042), 0
    if no stats row."""

    display_name: str
    avatar_url: str
    faction_slug: Optional[str]
    level: int


#: Unreachable given the FK; keeps the builder total.
UNKNOWN_TASK_AUTHOR = TaskAuthor(
    display_name="", avatar_url="", faction_slug=None, level=0
)


async def authors_for_tasks(
    tasks: Collection[Task],
    session: AsyncSession,
) -> dict[int, TaskAuthor]:
    """Authors for a page of tasks in ONE join, keyed by character id (avoids N+1,
    #1029).

    Not a ``selectinload``: ``level`` needs current-era ``CharacterStats``. With
    no era row, levels fall back to 0 rather than raising.
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
    """Task -> TaskOut with no viewer-relative flags (see
    :func:`build_task_out_for_viewer`).

    List routes precompute ``in_progress_count`` and ``author`` once per page
    (N+1, #1021); single-task routes leave them ``None`` to self-compute.
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
    """The *start here* mark (#1861, SPEC-onboarding § The hand-off).

    True iff ``task`` is the onboarding task and ``viewer`` has never submitted
    a praxis on it. The one rule behind the mark, ``CreateCharacter``'s hand-off
    and the ``/start`` stop condition, all via ``TaskOut.start_here``.

    NOT era-scoped (don't filter on ``Praxis.era_id``): a reset would relight it
    for everyone. Keyed on ``seed_key``, not title (#3064). The seed_key check
    short-circuits, so at most one query per page (#1377).
    """
    if task.seed_key != ONBOARDING_TASK_SEED_KEY:
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
    """:class:`TaskOut` plus viewer-relative flags; anonymous viewers get the defaults.

    ``in_progress_count``, ``author`` and ``signup_facts`` are per-page
    precomputes (#1377); single-task routes leave them ``None``.
    """
    base = await build_task_out(
        task, session, in_progress_count=in_progress_count, author=author
    )

    if viewer is None:
        return base

    if signup_facts is None:
        signup_facts = await gather_signup_facts(viewer, [task.id], session, era)
    stats = signup_facts.stats

    # One evaluation, both answers (#1497): the client labels its CTA off
    # `signup_reason` instead of mirroring the rule. test_signup_eligibility.py
    # pins the bank cap at this assignment (#2696).
    eligibility = await evaluate_signup(viewer, task, session, era, facts=signup_facts)
    base.can_sign_up = eligibility.allowed
    base.signup_reason = await signup_reason(
        viewer, task, eligibility, session, era, facts=signup_facts
    )
    # Viewer's own draft (#2359) / filed praxis (#2643). A task outside the
    # gathered page means "not asked about", not "no praxis", so re-query.
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
    base.viewer_faction_multiplier = compute_faction_multiplier(
        viewer.faction_slug or "",
        task.primary_faction_slug,
        era,
    )
    return base


async def list_signups_for_task(
    task_id: int,
    session: AsyncSession,
) -> list[tuple[PraxisMember, Character, Praxis, int]]:
    """Active praxis members on a task as ``(member, character, praxis, level)``; 404 if
    no task.

    ``level`` is current-era (0 if no stats row), outer-joined so the roster is one
    query.
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
    """One roster row from a :func:`list_signups_for_task` tuple.

    Picks columns explicitly: ``Character.account_id`` must never reach a public
    response.
    """
    return TaskSignupOut(
        character_id=character.id,
        display_name=character.display_name,
        avatar_url=character.avatar_url,
        faction_slug=character.faction_slug,
        level=level,
        praxis_type=praxis.type,
        joined_at=member.joined_at,
    )


async def in_progress_counts_for_tasks(
    task_ids: Collection[int],
    session: AsyncSession,
) -> dict[int, int]:
    """Active-signup count per task in ONE query (#1021); same population as
    :func:`list_signups_for_task`. Missing entry means 0."""
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
    """``GET /tasks`` orderings, a closed set: unknown values 422, absent means
    ``level`` (#1443).

    ``level`` = easiest first, richest within a level (no descending twin).
    """

    newest = "newest"
    oldest = "oldest"
    level = "level"


def pending_visibility_clause(
    viewer_level: int,
    is_admin: bool,
    era: EraConfig = CURRENT_ERA,
    viewer_id: Optional[int] = None,
):
    """The whole pending rule as one WHERE clause: level AND review window.

    Used by both :func:`list_tasks` and :func:`get_task_for_viewer` (#1725:
    sequential ids make an unguarded detail read an enumeration door).

    ``era.pending_task_admin_review_hours`` (#1695) gives admins first look; it
    is per-row, hence a clause. Clock is ``created_at``, never ``updated_at``,
    so edits don't restart it. ``viewer_id`` exempts the viewer's own rows
    (#2126); pass it at every door.

    ponytail: if a NON-admin path ever moves a task back to ``pending``,
    ``created_at`` stops being the clock; add a ``pending_since`` column.
    """
    if is_admin:
        return true()
    # The window withholds from *other* players; the author is exempt (#2126).
    own = false() if viewer_id is None else Task.created_by == viewer_id
    # Same predicate as the ``/auth/me`` flag (#2868). It reads no faction
    # (#2863); anonymous is level ``-1``.
    if may_see_pending_tasks(viewer_level, None, is_admin, era):
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
    """One task by id, or ``None`` when withheld (#1725); route maps to 404, never 403
    (existence oracle).

    Only ``pending`` (and ``deleted`` for non-admins) is withheld: the retired
    level gate covers the archive browse, not links to a retired task.
    """
    task = await session.get(Task, task_id)
    if task is not None and task.status is TaskStatus.deleted and not is_admin:
        return None
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
    # Reveal flag is account-scoped (ADR-0041); a caller may have no character (#2422).
    viewer_account: Optional[Account] = None,
    skip_level_check: bool = False,
    # Not `skip_level_check`: this one is moderation-queue + Albescent reveal (#2400).
    is_admin: bool = False,
    era: EraConfig = CURRENT_ERA,
) -> list[Task]:
    """Query tasks with optional filters, excluding hidden-faction tasks.

    ``task_type`` None = standard only (#1001); 'all' or a single type otherwise.
    Metatask, retired and pending rows are level-gated via ``era_gates``, the same
    predicates as the ``/auth/me`` tab flags; pending also has the review window
    (:func:`pending_visibility_clause`).

    ``q`` ilikes title, description and the proposer's handle/display name (a
    leading ``@`` dropped on the player axis only), like
    :func:`services.praxis.list_praxes`.

    ``can_sign_up`` (#1130) is the SQL half of
    :func:`services.signup_eligibility.evaluate_signup` (ADR-0008); anonymous gets
    ``[]``.
    ``faction`` is a union of slugs; empty = no filter. ``sort`` None =
    ``TaskSort.level``.
    """
    hidden_slugs = await hidden_faction_slugs(session)

    query = select(Task)

    if created_by is not None:
        query = query.where(Task.created_by == created_by)

    # Stats read once for every gate below; anonymous = level -1.
    viewer_stats: Optional[CharacterStats] = None
    if viewer is not None and (can_sign_up or not skip_level_check):
        era_row = await get_current_era_row(session)
        viewer_stats = await get_or_create_stats(session, viewer.id, era_row.id)
    viewer_level = viewer_stats.level if viewer_stats is not None else -1

    # Both status gates apply at BOTH doors (`?status=X` and `?status=all`), or
    # the pending queue leaks. Retired is a level gate (`skip_level_check`
    # bypasses); pending is the moderation queue (`is_admin` bypasses). Asked of
    # `era_gates` so tabs and queries agree (#2868, #1672); the Ephemerist
    # archive perk lives in that predicate.
    viewer_sees_retired = may_see_retired_tasks(
        viewer_level,
        viewer.faction_slug if viewer is not None else None,
        skip_level_check,
        era,
    )
    viewer_sees_pending = may_see_pending_tasks(viewer_level, None, is_admin, era)

    # Unconditional: every status branch below is downstream of it.
    query = query.where(
        pending_visibility_clause(
            viewer_level, is_admin, era, viewer_id=viewer.id if viewer else None
        )
    )

    # Deleted tasks are admin-only on every door (#3305).
    if not is_admin:
        query = query.where(Task.status != TaskStatus.deleted)

    if status and status != "all":
        try:
            requested_status = TaskStatus[status]
        except KeyError:
            raise HTTPException(status_code=422, detail=f"Invalid status: {status}")
        gate_closed = (
            requested_status == TaskStatus.pending and not viewer_sees_pending
        ) or (requested_status == TaskStatus.retired and not viewer_sees_retired)
        if gate_closed:
            # Empty page, not 403: reveals nothing behind the gate.
            query = query.where(false())
        else:
            query = query.where(Task.status == requested_status)
    elif not status:
        if created_by is not None:
            # Proposer's profile: active + retired, deliberately NOT gated on
            # `viewer_sees_retired` (that gate is the archive browse). Pending is
            # hidden except from the author (#2126).
            if viewer is None or viewer.id != created_by:
                query = query.where(Task.status != TaskStatus.pending)
        else:
            query = query.where(Task.status == TaskStatus.active)
    else:
        # status == "all": pending is handled by the clause above, retired here.
        if not viewer_sees_retired:
            query = query.where(Task.status != TaskStatus.retired)

    if task_type == "all":
        pass
    elif task_type is not None:
        try:
            query = query.where(Task.task_type == TaskType(task_type))
        except ValueError:
            raise HTTPException(
                status_code=422, detail=f"Invalid task_type: {task_type}"
            )
    else:
        query = query.where(Task.task_type == TaskType.standard)

    if not skip_level_check:
        if not character_sees_metatasks(viewer_level, era):
            query = query.where(Task.task_type != TaskType.metatask)

    # evaluate_signup's gates restated as SQL (per-row call = N+1).
    # test_task_can_sign_up_filter.py keeps the two in parity.
    if can_sign_up:
        # Gate 0: anonymous.
        if viewer is None or viewer_stats is None:
            return []
        # Gate 6: bank cap is per-character, so it empties the whole list.
        in_progress_count = await count_in_progress_praxes(viewer.id, session)
        if in_progress_count >= era.max_task_signups:
            return []
        # Gate 1: metatasks are applied, never signed up for.
        query = query.where(Task.task_type != TaskType.metatask)
        # Gate 2: level + faction jump; only available_level_reach computes it (#811).
        level_reach = available_level_reach(
            viewer.faction_slug,
            viewer_stats.level,
            viewer_stats.level_jump_used_at_level,
            era,
        )
        query = query.where(Task.level_required <= viewer_stats.level + level_reach)
        # Gates 3-4: exclusions, so a new enum status isn't silently opted in.
        query = query.where(Task.status != TaskStatus.deleted)
        if viewer.faction_slug not in era.allow_praxis_on_retired_task_factions:
            query = query.where(Task.status != TaskStatus.retired)
        if viewer.faction_slug not in era.allow_praxis_on_pending_task_factions:
            query = query.where(Task.status != TaskStatus.pending)
        # Gate 5 = the exclude_character_id clause below. Default it ONLY here
        # (#2264), or a faction's task count would depend on the reader.
        if exclude_character_id is None:
            exclude_character_id = viewer.id

    # Empty/blank list = no filter. faction_filter_slugs is the one place
    # Albescent folds under Unaffiliated (#1975, #2422).
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
            # ponytail: leading-wildcard ILIKE = seq scan, fine at tens of tasks;
            # upgrade to Postgres full-text + GIN index if it bites.
            conditions = [
                Task.title.ilike(f"%{term}%"),
                Task.description.ilike(f"%{term}%"),
            ]
            # Author axis (#681): IN-subquery, not a join, so rows can't multiply.
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

    if hidden_slugs:
        query = query.where(Task.primary_faction_slug.notin_(hidden_slugs))

    # Pass `era` through: the subquery reads its Double Dipper set (#1359).
    if exclude_character_id is not None:
        query = query.where(
            Task.id.notin_(active_member_task_ids_subquery(exclude_character_id, era))
        )

    if sort == TaskSort.newest:
        query = query.order_by(Task.created_at.desc(), Task.id.desc())
    elif sort == TaskSort.oldest:
        query = query.order_by(Task.created_at.asc(), Task.id.asc())
    else:
        # TaskSort.level or absent; unknown values 422 in the router (#1443).
        query = query.order_by(Task.level_required.asc(), Task.point_value.desc())
    query = query.limit(limit).offset(offset)
    result = await session.execute(query)
    return list(result.scalars().all())
