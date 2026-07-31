from dataclasses import dataclass
from typing import Collection, Optional

from fastapi import HTTPException
from sqlalchemy import and_, func, or_, select
from sqlalchemy.ext.asyncio import AsyncSession

from game_config import CURRENT_ERA, EraConfig
from models.character import Character
from models.character_stats import CharacterStats
from models.praxis import Praxis, PraxisMember, PraxisStatus
from models.task import Task, TaskStatus, TaskType
from schemas.task import TaskCreate, TaskOut, TaskSignupOut
from services.era import (
    get_current_era_row,
    get_current_era_row_safe,
    get_or_create_stats,
)
from services.faction_service import hidden_faction_slugs
from services.praxis import (
    # Private, but the bank-cap count has exactly one correct implementation and
    # services.duel already imports it the same way. A second COUNT here is how
    # the filter and the sign-up predicate would start disagreeing.
    _count_in_progress_praxes,
    active_member_task_ids_subquery,
    allowed_praxis_modes,
    can_submit_praxis_for_task,
    is_task_eligible_for_character,
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
            raise HTTPException(
                status_code=403,
                detail=f"Must be level {era.level_to_propose_metatask} or above to propose metatasks.",
            )
        if not data.metatask_faction_slug:
            raise HTTPException(
                status_code=422,
                detail="metatask_faction_slug is required for metatask proposals.",
            )
    else:
        if not skip_level_check and stats.level < era.level_to_propose_task:
            raise HTTPException(
                status_code=403,
                detail=f"Must be level {era.level_to_propose_task} or above to propose tasks.",
            )

    task = Task(
        title=data.title,
        description=data.description or "",
        point_value=data.point_value,
        level_required=data.level_required,
        primary_faction_slug=data.primary_faction_slug or "na",
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


async def update_task(
    task: Task,
    data: TaskCreate,
    character: Character,
    session: AsyncSession,
) -> Task:
    if task.created_by != character.id or task.status != TaskStatus.pending:
        raise HTTPException(
            status_code=403,
            detail="Only the proposer can edit a pending task.",
        )
    task.title = data.title
    task.description = data.description or ""
    task.point_value = data.point_value
    task.level_required = data.level_required
    task.primary_faction_slug = data.primary_faction_slug or "na"
    if task.task_type == TaskType.metatask and data.metatask_faction_slug is not None:
        task.metatask_faction_slug = data.metatask_faction_slug
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
    ``can_submit_praxis``, ``allowed_modes``, and ``eligible_for_current_user``
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
        is_task_vision_eligible=task.is_task_vision_eligible,
        created_at=task.created_at,
        in_progress_count=in_progress_count,
        created_by_display_name=author.display_name,
        created_by_avatar_url=author.avatar_url,
        created_by_faction_slug=author.faction_slug,
        created_by_level=author.level,
    )


async def build_task_out_for_viewer(
    task: Task,
    viewer: Optional[Character],
    session: AsyncSession,
    era: EraConfig = CURRENT_ERA,
    *,
    in_progress_count: Optional[int] = None,
    author: Optional[TaskAuthor] = None,
) -> TaskOut:
    """Build a :class:`TaskOut` with viewer-relative capability flags.

    Populates ``can_submit_praxis``, ``allowed_modes``, and
    ``eligible_for_current_user`` using the authenticated viewer's character
    (``None`` for anonymous callers). All three flags default to the same
    safe values as :func:`build_task_out` when ``viewer`` is ``None``.

    ``in_progress_count`` and ``author`` are passed straight through to
    :func:`build_task_out` — see its docstring. List routes should precompute
    both once per page (via :func:`in_progress_counts_for_tasks` and
    :func:`authors_for_tasks`); single-task routes may leave them to
    self-compute.
    """
    base = await build_task_out(
        task, session, in_progress_count=in_progress_count, author=author
    )

    if viewer is None:
        return base

    era_row = await get_current_era_row(session)
    stats = await get_or_create_stats(session, viewer.id, era_row.id)

    base.can_submit_praxis = await can_submit_praxis_for_task(viewer, task, session, era)
    base.allowed_modes = [m.value for m in allowed_praxis_modes(viewer, stats.level, era)]
    base.eligible_for_current_user = is_task_eligible_for_character(
        viewer,
        task,
        stats.level,
        available_level_reach(
            viewer.faction_slug, stats.level, stats.level_jump_used_at_level, era
        ),
    )
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


#: ``sort`` value that orders the task list by creation time, newest first.
SORT_NEWEST = "newest"
#: ``sort`` value that orders the task list by creation time, oldest first.
SORT_OLDEST = "oldest"
#: ``sort`` value naming the browse default — easiest first, richest within a
#: level. Ascending only: there is no level-descending option (#1364).
SORT_LEVEL = "level"


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
    sort: Optional[str] = None,
    limit: int = 50,
    offset: int = 0,
    viewer: Optional[Character] = None,
    skip_level_check: bool = False,
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
    single sign-up predicate (ADR-0008). It replaces the old ``level`` filter,
    which could not express either of the live faction abilities that bend the
    level bar (WOW's once-a-level jump, Ephemerists' retired-task access) and so
    made them invisible. Anonymous viewers get ``[]``: ``evaluate_signup``
    refuses them, so there is no honest list to return.

    ``faction`` is a list of slugs matched as a union (#1364), so the browse
    filter can hold several factions at once; an empty list is no filter.

    ``sort`` is one of :data:`SORT_NEWEST`, :data:`SORT_OLDEST` or
    :data:`SORT_LEVEL`, the latter being the default when ``sort`` is absent —
    easiest first, richest within a level. Level *ascending* is the only level
    ordering there is. The two chronological sorts tiebreak on ``id`` so a
    paged read stays stable when rows share a ``created_at``.
    """
    # Collect hidden faction slugs to exclude their tasks (faction-rules seam, #171)
    hidden_slugs = await hidden_faction_slugs(session)

    query = select(Task)

    if created_by is not None:
        query = query.where(Task.created_by == created_by)

    if status and status != "all":
        try:
            query = query.where(Task.status == TaskStatus[status])
        except KeyError:
            raise HTTPException(status_code=422, detail=f"Invalid status: {status}")
    elif not status:
        if created_by is not None:
            # Proposer's profile: show approved tasks (active + retired); pending
            # rows are admin-review submissions and stay hidden from all viewers.
            query = query.where(Task.status != TaskStatus.pending)
        else:
            query = query.where(Task.status == TaskStatus.active)
    # status == "all" -> no status filter, return tasks of every status

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

    # The viewer's current-era stats, read ONCE for the whole request: the
    # metatask visibility gate wants the level and the can_sign_up filter wants
    # the level plus the level-jump stamp. Two consumers, one query — the admin
    # browse with the filter off still reads nothing.
    viewer_stats: Optional[CharacterStats] = None
    if viewer is not None and (can_sign_up or not skip_level_check):
        era_row = await get_current_era_row(session)
        viewer_stats = await get_or_create_stats(session, viewer.id, era_row.id)

    # Metatask visibility gate (#453): the metatask list only opens at
    # era.level_to_see_metatasks. Anonymous viewers are always below the gate.
    if not skip_level_check:
        viewer_sees_metatasks = (
            viewer_stats is not None
            and viewer_stats.level >= era.level_to_see_metatasks
        )
        if not viewer_sees_metatasks:
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
        # The route already defaults it to the viewer (#1229); this only arms it
        # for a direct service caller that did not.
        if exclude_character_id is None:
            exclude_character_id = viewer.id

    # Multi-select faction (#1364): an empty list — or one holding only blanks,
    # which is what a cleared client-side filter sends — means "no faction
    # filter", never "match nothing".
    faction_slugs = [slug for slug in (faction or []) if slug]
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

    # Exclude tasks from hidden/deprecated factions
    if hidden_slugs:
        query = query.where(Task.primary_faction_slug.notin_(hidden_slugs))

    # Exclude tasks the character has already started or completed (via praxis membership)
    if exclude_character_id is not None:
        query = query.where(Task.id.notin_(active_member_task_ids_subquery(exclude_character_id)))

    if sort == SORT_NEWEST:
        query = query.order_by(Task.created_at.desc(), Task.id.desc())
    elif sort == SORT_OLDEST:
        query = query.order_by(Task.created_at.asc(), Task.id.asc())
    else:
        # SORT_LEVEL, and the fall-through for an absent or unrecognised sort:
        # the browse ordering Tasks.tsx gets by sending no ``sort`` at all.
        query = query.order_by(Task.level_required.asc(), Task.point_value.desc())
    query = query.limit(limit).offset(offset)
    result = await session.execute(query)
    return list(result.scalars().all())
