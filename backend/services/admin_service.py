"""Admin-only service functions for ad-hoc database management."""

from fastapi import HTTPException
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from errors import ErrorCode, raise_coded
from game_config import (
    CURRENT_ERA,
    EraConfig,
    era_config_for_key,
    registered_era_config_keys,
)
from models.account import Account, AccountStatus
from models.character import Character, CharacterStatus
from models.character_stats import CharacterStats
from models.era import Era
from models.roles import AccountRole, Role
from models.contact import ContactMessage
from models.flag import Flag, normalize_flag_reason
from models.praxis import ModerationStatus, Praxis
from models.task import Task, TaskStatus
from models.vote import Vote
from schemas.admin import (
    AccountDetail,
    AccountSummary,
    AdminTaskPatch,
    CharacterBrief,
    CharacterStatsPatch,
    CharacterSummary,
    EraOption,
    EraRollOut,
    FlagOut,
    OverviewStats,
)
# ``seed`` imports models, game_config and config, never a service, so the
# roster mirror is reachable from here without a cycle — the same reason
# ``services.era`` already imports it (for ``ONBOARDING_TASK_TITLE``). The
# mirror stays in ``seed`` because the seeder is what runs it on every deploy;
# the rollover is the second caller, not the owner.
from seed import upsert_era_factions
from services.duel import forfeit_settled_duels_for_character
from services.era import (
    apply_era_reset,
    commit_and_bind_live_era,
    get_current_era_row,
    get_current_era_row_safe,
    get_or_create_stats,
    lock_era_rollover,
)
from services.scoring import compute_vote_budget, compute_votes_available


# ---------------------------------------------------------------------------
# Read / Inspect
# ---------------------------------------------------------------------------


async def list_accounts(
    session: AsyncSession,
    email_filter: str | None = None,
) -> list[AccountSummary]:
    query = select(Account).order_by(Account.created_at.desc())
    if email_filter:
        query = query.where(Account.email.ilike(f"%{email_filter}%"))
    result = await session.execute(query)
    accounts = result.scalars().all()
    return [
        AccountSummary(
            id=account.id,
            email=account.email,
            status=account.status.value,
            created_at=account.created_at,
        )
        for account in accounts
    ]


async def get_account_detail(account_id: int, session: AsyncSession) -> AccountDetail:
    account = await session.get(Account, account_id)
    if account is None:
        raise HTTPException(status_code=404, detail="Account not found.")

    result = await session.execute(
        select(Character).where(Character.account_id == account_id).order_by(Character.created_at)
    )
    characters = result.scalars().all()

    return AccountDetail(
        id=account.id,
        email=account.email,
        status=account.status.value,
        created_at=account.created_at,
        characters=[
            CharacterBrief(
                id=character.id,
                username=character.username,
                display_name=character.display_name,
                faction_slug=character.faction_slug,
                status=character.status.value,
            )
            for character in characters
        ],
    )


async def list_characters(
    session: AsyncSession,
    faction: str | None = None,
    status: CharacterStatus | None = None,
    era: EraConfig = CURRENT_ERA,
) -> list[CharacterSummary]:
    era_row = await get_current_era_row(session)

    query = (
        select(Character, CharacterStats)
        .outerjoin(
            CharacterStats,
            (CharacterStats.character_id == Character.id)
            & (CharacterStats.era_id == era_row.id),
        )
        .order_by(Character.created_at.desc())
    )
    if faction:
        # Deliberately NOT `faction_slugs.faction_filter_slugs`: that helper
        # folds Albescent under Unaffiliated for the player-facing facet
        # (#1975), and moderation reads the roster as it is. `?faction=albescent`
        # here means Albescent, and `?faction=na` means only `na`.
        query = query.where(Character.faction_slug == faction)
    if status:
        query = query.where(Character.status == status)

    result = await session.execute(query)
    rows = result.all()

    return [
        CharacterSummary(
            id=character.id,
            account_id=character.account_id,
            username=character.username,
            display_name=character.display_name,
            faction_slug=character.faction_slug,
            status=character.status.value,
            score=stats.score if stats else 0,
            level=stats.level if stats else 0,
            votes_available=compute_votes_available(stats, era) if stats else era.vote_budget_base,
            created_at=character.created_at,
        )
        for character, stats in rows
    ]


async def list_active_characters(session: AsyncSession) -> list[Character]:
    """Return every non-banned character — shared by era-reset and stats-backfill."""
    result = await session.execute(
        select(Character).where(Character.status != CharacterStatus.banned)
    )
    return list(result.scalars().all())


async def find_admin_accounts(session: AsyncSession) -> list[Account]:
    """Return accounts holding the ``admin`` role, ordered by account id."""
    result = await session.execute(
        select(Account)
        .join(AccountRole, AccountRole.account_id == Account.id)
        .join(Role, Role.id == AccountRole.role_id)
        # Active only. `/admin/cli-token` mints its JWT for `admins[0]`, so
        # without this a SUSPENDED admin still yields a token. Nothing is
        # exploitable today — `get_current_account` rejects a non-active account
        # at token USE — but that means this fails closed only because a check
        # in another module happens to catch it, and suspending a compromised
        # admin would still hand out tokens bearing their `sub`. The CLI helper
        # `import_tasks_csv._first_admin_account` already filters; these two
        # disagreed.
        .where(Role.name == "admin", Account.status == AccountStatus.active)
        .order_by(Account.id.asc())
    )
    return list(result.scalars().all())


async def list_contact_messages(
    session: AsyncSession,
    *,
    archived: bool = False,
) -> list[ContactMessage]:
    """Return contact messages filtered by archived flag, newest first."""
    result = await session.execute(
        select(ContactMessage)
        .where(ContactMessage.is_archived == archived)
        .order_by(ContactMessage.created_at.desc())
    )
    return list(result.scalars().all())


async def game_overview(session: AsyncSession) -> OverviewStats:
    account_count_result = await session.execute(select(func.count()).select_from(Account))
    character_count_result = await session.execute(select(func.count()).select_from(Character))
    active_task_count_result = await session.execute(
        select(func.count()).select_from(Task).where(Task.status == TaskStatus.active)
    )
    praxis_count_result = await session.execute(select(func.count()).select_from(Praxis))
    vote_count_result = await session.execute(select(func.count()).select_from(Vote))
    flagged_count_result = await session.execute(
        select(func.count()).select_from(Praxis).where(
            Praxis.moderation_status == ModerationStatus.flagged
        )
    )
    suspended_count_result = await session.execute(
        select(func.count()).select_from(Account).where(
            Account.status == AccountStatus.suspended
        )
    )

    return OverviewStats(
        accounts=account_count_result.scalar_one(),
        characters=character_count_result.scalar_one(),
        active_tasks=active_task_count_result.scalar_one(),
        praxis=praxis_count_result.scalar_one(),
        votes=vote_count_result.scalar_one(),
        flagged_praxis=flagged_count_result.scalar_one(),
        suspended_accounts=suspended_count_result.scalar_one(),
    )


def _build_flag_out(flag: Flag, flagged_by_name: str) -> FlagOut:
    """Normalize a stored Flag row onto the shared vocabulary (ADR-0037)."""
    reason, reason_detail = normalize_flag_reason(flag.reason)
    return FlagOut(
        reason=reason.value,
        reason_detail=reason_detail,
        flagged_by_id=flag.flagged_by,
        flagged_by_name=flagged_by_name,
        created_at=flag.created_at,
    )


async def flags_for_praxes(
    praxis_ids: set[int], session: AsyncSession
) -> dict[int, list[FlagOut]]:
    """Flag rows (newest first) per praxis id, for the moderator queue (#237)."""
    if not praxis_ids:
        return {}
    result = await session.execute(
        select(Flag, Character.display_name)
        .join(Character, Character.id == Flag.flagged_by)
        .where(Flag.praxis_id.in_(praxis_ids))
        .order_by(Flag.created_at.desc())
    )
    flags_by_praxis: dict[int, list[FlagOut]] = {}
    for flag, flagged_by_name in result.all():
        flags_by_praxis.setdefault(flag.praxis_id, []).append(
            _build_flag_out(flag, flagged_by_name)
        )
    return flags_by_praxis


async def flags_for_comments(
    comment_ids: set[int], session: AsyncSession
) -> dict[int, list[FlagOut]]:
    """Flag rows (newest first) per comment id, for the moderator queue (#237)."""
    if not comment_ids:
        return {}
    result = await session.execute(
        select(Flag, Character.display_name)
        .join(Character, Character.id == Flag.flagged_by)
        .where(Flag.comment_id.in_(comment_ids))
        .order_by(Flag.created_at.desc())
    )
    flags_by_comment: dict[int, list[FlagOut]] = {}
    for flag, flagged_by_name in result.all():
        flags_by_comment.setdefault(flag.comment_id, []).append(
            _build_flag_out(flag, flagged_by_name)
        )
    return flags_by_comment


# ---------------------------------------------------------------------------
# Seed / Insert
# ---------------------------------------------------------------------------


async def apply_ban(
    character: Character,
    banned: bool,
    session: AsyncSession,
    era: EraConfig = CURRENT_ERA,
) -> None:
    """Ban or un-ban a character on behalf of a moderator (#1577).

    Takes the row rather than an id because the route already resolved it and
    owns the 404 for a missing one.

    **Banning forfeits.** ADR-0011 §Forfeit's trigger is "the ban / soft-delete of
    a side's character"; for a year only the soft-delete half did it, so a banned
    duellist's opponent kept waiting on a tally that would never be decided. Same
    function the self-delete path calls, so the two cannot drift.

    **Un-banning does not un-forfeit.** ADR-0011 makes the forfeit sticky —
    recorded on the first forfeit and never overwritten — so a ban is destructive
    on first use even though the toggle reads as reversible. That is the ADR's
    ruling, not this function's; #1577 explicitly left it standing.

    **Un-banning refuses a departed life.** ``departed_at`` is written only by
    ``services.character.soft_delete_character``, i.e. by the player themselves.
    An admin reversing a *moderation* action must not resurrect someone who left:
    the two are indistinguishable by ``status`` alone, which is exactly why the
    column exists.
    """
    if not banned and character.departed_at is not None:
        raise_coded(
            409,
            ErrorCode.character_departed_not_restorable,
            "This character was deleted by its player and cannot be restored.",
        )

    if banned:
        character.status = CharacterStatus.banned
        await forfeit_settled_duels_for_character(character.id, session, era)
    else:
        character.status = CharacterStatus.active

    await session.flush()


async def set_character_stats(
    character_id: int,
    patch: CharacterStatsPatch,
    session: AsyncSession,
    era: EraConfig = CURRENT_ERA,
) -> CharacterStats:
    era_row = await get_current_era_row(session)

    stats = await get_or_create_stats(
        session,
        character_id=character_id,
        era_id=era_row.id,
    )

    if patch.level is not None:
        stats.level = patch.level
    if patch.score is not None:
        stats.score = patch.score
    if patch.all_time_score is not None:
        stats.all_time_score = patch.all_time_score
    if patch.votes_available is not None:
        # Translate a desired `votes_available` into `votes_spent_this_era`
        # so the on-read formula lands on the requested value.
        # votes_spent = cap - desired (clamped at 0).
        score_for_cap = patch.score if patch.score is not None else stats.score
        cap = compute_vote_budget(score_for_cap, era)
        stats.votes_spent_this_era = max(0, cap - patch.votes_available)

    await session.flush()
    await session.refresh(stats)
    return stats


async def assign_or_revoke_role(
    account_id: int,
    role_name: str,
    action: str,
    admin_account_id: int,
    session: AsyncSession,
) -> None:
    account = await session.get(Account, account_id)
    if account is None:
        raise HTTPException(status_code=404, detail="Account not found.")

    role_result = await session.execute(select(Role).where(Role.name == role_name))
    role = role_result.scalar_one_or_none()

    if role is None:
        if action == "revoke":
            raise HTTPException(status_code=404, detail=f"Role '{role_name}' does not exist.")
        role = Role(name=role_name, description="")
        session.add(role)
        await session.flush()

    existing_result = await session.execute(
        select(AccountRole).where(
            AccountRole.account_id == account_id,
            AccountRole.role_id == role.id,
        )
    )
    account_role = existing_result.scalar_one_or_none()

    if action == "grant":
        if account_role is not None:
            return  # Already has the role — idempotent
        session.add(AccountRole(
            account_id=account_id,
            role_id=role.id,
            granted_by=admin_account_id,
        ))
        await session.flush()

    elif action == "revoke":
        if account_role is None:
            return  # Doesn't have the role — idempotent
        await session.delete(account_role)
        await session.flush()


async def suspend_account(
    account_id: int,
    suspended: bool,
    session: AsyncSession,
) -> Account:
    account = await session.get(Account, account_id)
    if account is None:
        raise HTTPException(status_code=404, detail="Account not found.")
    account.status = AccountStatus.suspended if suspended else AccountStatus.active
    await session.flush()
    await session.refresh(account)
    return account


async def archive_message(
    message_id: int,
    session: AsyncSession,
) -> ContactMessage:
    """Toggle is_archived on a contact message."""
    message = await session.get(ContactMessage, message_id)
    if message is None:
        raise HTTPException(status_code=404, detail="Message not found.")
    message.is_archived = not message.is_archived
    await session.flush()
    await session.refresh(message)
    return message


async def list_pending_tasks_with_proposer(
    session: AsyncSession,
) -> list[tuple[Task, str | None]]:
    """Return pending tasks paired with their proposer's display name (or None)."""
    result = await session.execute(
        select(Task, Character.display_name)
        .outerjoin(Character, Character.id == Task.created_by)
        .where(Task.status == TaskStatus.pending)
        .order_by(Task.created_at)
    )
    return list(result.all())


async def update_task_status(
    task_id: int,
    new_status: TaskStatus,
    session: AsyncSession,
) -> Task:
    """Admin task status change.

    Admins can move a task freely between pending, active, and retired —
    e.g. dismiss a pending proposal directly to retired, send an active task
    back to pending for re-review, or reactivate a retired task. Same-state
    requests 422 as likely-confused intent.
    """
    task = await session.get(Task, task_id)
    if task is None:
        raise HTTPException(status_code=404, detail="Task not found.")

    if new_status == task.status:
        raise HTTPException(
            status_code=422,
            detail=f"Task is already {task.status.value}.",
        )

    task.status = new_status
    await session.flush()
    await session.refresh(task)
    return task


async def admin_edit_task(
    task_id: int,
    data: AdminTaskPatch,
    session: AsyncSession,
    era: EraConfig = CURRENT_ERA,
) -> Task:
    """Edit editable fields on a pending or retired task. Active tasks are locked."""
    task = await session.get(Task, task_id)
    if task is None:
        raise HTTPException(status_code=404, detail="Task not found.")
    if task.status == TaskStatus.active:
        raise HTTPException(
            status_code=400,
            detail="Active tasks cannot be edited. Retire the task first.",
        )
    if data.primary_faction_slug is not None:
        # Config owns which factions exist (ADR-0042), so membership of
        # ``era.factions`` is the question — including the cross-faction
        # sentinel, which is one of its keys. Without this the unknown slug
        # reaches the FK and surfaces as a 500.
        if data.primary_faction_slug not in era.factions:
            raise_coded(
                422,
                ErrorCode.task_faction_unknown,
                f"Unknown faction: {data.primary_faction_slug}.",
            )
        task.primary_faction_slug = data.primary_faction_slug
    if data.title is not None:
        task.title = data.title
    if data.description is not None:
        task.description = data.description
    if data.point_value is not None:
        task.point_value = data.point_value
    if data.level_required is not None:
        task.level_required = data.level_required
    await session.flush()
    await session.refresh(task)
    return task


# ---------------------------------------------------------------------------
# Era rollover — the control that ends an era (#827, ADR-0091)
# ---------------------------------------------------------------------------


async def list_registered_eras(
    session: AsyncSession, era: EraConfig = CURRENT_ERA
) -> list[EraOption]:
    """Every era a mod may roll into, in era order.

    *Which eras exist* is read off the registry, never off ``Era`` rows: an era
    that has never run has no row, and it is precisely the ones that have never
    run that a mod wants to pick.

    *Which one is live* is read off the latest ``Era`` row — the same source
    :func:`roll_into_era`'s refusal reads, and that agreement is the point. The
    selector used to answer from the process binding instead, which is the same
    fact only while the two agree. They can come apart: a row naming a
    ``config_key`` no era file registers leaves the process on the compile-time
    fallback (``rebind_live_era`` logs it loudly), and in that state the selector
    would have offered an era the ``PUT`` then refused with
    ``ERA_ALREADY_LIVE``. A list whose disabled row disagrees with the server is
    worse than no list.

    ``era`` — the process binding — is the fallback for the one case the row
    cannot answer: a fresh database with no ``Era`` row at all, where nothing has
    run and the compile-time era is genuinely what the game is playing by.
    """
    live_row = await get_current_era_row_safe(session)
    live_key = era.config_key if live_row is None else live_row.config_key
    return [
        EraOption(
            config_key=config_key,
            name=era_config_for_key(config_key).name,
            is_live=config_key == live_key,
        )
        for config_key in registered_era_config_keys()
    ]


async def roll_into_era(
    config_key: str, operator: Account, session: AsyncSession
) -> EraRollOut:
    """End the live era and open ``config_key``. The most destructive operation
    in the system, and there is no undo.

    Everything it does, it does through the pieces that already own it: the
    ``Era`` row is the append-only record of which ruleset governs from now
    (ADR-0042), ``seed.upsert_era_factions`` re-mirrors the roster,
    ``apply_era_reset`` performs the resets the **incoming** era's flags declare,
    freezes every unresolved duel into a permanent result (#824) and retires the
    board, and ``commit_and_bind_live_era`` makes the write durable and *then*
    points the process at the new rules.

    ``operator`` lands in ``Era.started_by``, the not-null audit trail recording
    who opened the era. The route's ``require_admin`` is what fills it, which is
    the guarantee ``scripts/era_reset.py`` has to re-derive by hand.

    **Two refusals, and both matter more here than a validation usually does.**
    An unregistered key would write a row whose rules nothing can resolve. The
    era that is *already* live would be a second full destructive reset for no
    change of ruleset — every score, level, budget and faction wiped, every duel
    frozen, the board retired, to arrive where the game already was. Until now
    the only thing stopping it was a ``disabled`` option in the admin page's
    select, which is not a control.
    """
    era_config = era_config_for_key(config_key)
    if era_config is None:
        raise_coded(
            422,
            ErrorCode.era_config_unknown,
            f"Unknown era: {config_key}.",
        )

    # Before the read below, so the read, the refusal it feeds and the insert
    # that follows are one indivisible decision — against a second mod and
    # against `scripts/era_reset.py`, which takes the same lock.
    await lock_era_rollover(session)

    live_row = await get_current_era_row_safe(session)
    if live_row is not None and live_row.config_key == era_config.config_key:
        raise_coded(
            409,
            ErrorCode.era_already_live,
            f"{era_config.name} is already the live era.",
        )

    characters = await list_active_characters(session)
    new_era_row = Era(
        # Written, not read on the happy path — the historical fallback for a
        # row whose config file is later deleted. See models/era.py.
        name=era_config.name,
        config_key=era_config.config_key,
        started_by=operator.id,
    )
    session.add(new_era_row)
    await session.flush()

    # The roster is half the rollover, and it used to wait for the next deploy.
    # `Faction` is a two-way display mirror of the live era (ADR-0087): the
    # incoming era's slugs go `visible`, everything else `retired`. Skipping it
    # left join tiles offering factions the new era does not carry, and — for an
    # era that adds a slug — no `Faction` row for the FK a join would write.
    # Before the reset, because `apply_era_reset` seats every character in
    # `era.reset_faction_slug`, which is an FK onto this table.
    await upsert_era_factions(session, era_config)

    await apply_era_reset(characters, new_era_row, session, era=era_config)

    # Durable first, live second. See `commit_and_bind_live_era` for why that
    # order is the whole point.
    await commit_and_bind_live_era(session, era_config)

    return EraRollOut(
        era_id=new_era_row.id,
        config_key=era_config.config_key,
        name=era_config.name,
        characters_reset=len(characters),
    )
