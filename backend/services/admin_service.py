"""Admin-only service functions for ad-hoc database management."""

import logging
from dataclasses import dataclass
from typing import Optional

from fastapi import HTTPException
from sqlalchemy import func, or_, select
from sqlalchemy.ext.asyncio import AsyncSession

import dependencies
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
from models.comment import Comment
from models.contact import ContactMessage
from models.duel import Duel, DuelStatus
from models.faction import Faction
from models.flag import Flag
from models.meta_task import PraxisMetaTask
from models.praxis import ModerationStatus, Praxis, PraxisMember
from models.task import Task, TaskStatus
from models.vote import Vote
from schemas.admin import (
    AdminRow,
    AdminTaskPatch,
    CharacterStatsPatch,
    CharacterSummary,
    EraOption,
    EraPreflightOut,
    EraRollOut,
    LeavingFaction,
    FlagOut,
    OverviewStats,
)
# ``seed`` imports no service, so no cycle; it owns the mirror (runs every deploy).
from seed import factions_leaving_roster, upsert_era_factions
from services.faction_service import refuse_hidden_faction
from services.character import MOD_BANNED, record_level_reached
from services.character_stats import (
    recalculate_character_stats,
    recalculate_for_account_votes,
)
from services.era_tasks import sync_era_tasks, tasks_to_reactivate
from services.duel import forfeit_settled_duels_for_character
from services.mod_log import log_mod_action
from services.praxis import moderate_praxis
from services.era import (
    apply_era_reset,
    commit_and_bind_live_era,
    get_current_era_row,
    get_current_era_row_safe,
    get_or_create_stats,
    DUELS_FROZEN_AT_ERA_CLOSE,
    lock_era_rollover,
    tasks_retired_at_era_close,
)
from services.scoring import compute_vote_budget, compute_votes_available

logger = logging.getLogger(__name__)

async def list_characters(
    session: AsyncSession,
    faction: str | None = None,
    status: CharacterStatus | None = None,
    era: EraConfig = CURRENT_ERA,
    search: str | None = None,
) -> list[CharacterSummary]:
    """Live lives (not player-deleted); ``search``: name, username or account email.

    ponytail: the whole roster, unpaged; page it when it outgrows a screen (#3545).
    """
    era_row = await get_current_era_row(session)
    votes_cast = (
        select(func.count(Vote.id))
        .where(
            Vote.voter_account_id == Character.account_id,
            Vote.created_at >= era_row.started_at,
        )
        .correlate(Character)
        .scalar_subquery()
    )

    query = (
        select(Character, CharacterStats, Account.status, votes_cast)
        .join(Account, Account.id == Character.account_id)
        .where(Character.departed_at.is_(None))
        .outerjoin(
            CharacterStats,
            (CharacterStats.character_id == Character.id)
            & (CharacterStats.era_id == era_row.id),
        )
        .order_by(Character.created_at.desc())
    )
    if faction:
        # Not `faction_filter_slugs` (folds Albescent into Unaffiliated, #1975):
        # moderation reads the roster as it is.
        query = query.where(Character.faction_slug == faction)
    if status:
        query = query.where(Character.status == status)
    if search:
        pattern = f"%{search}%"
        query = query.where(
            or_(
                Character.username.ilike(pattern),
                Character.display_name.ilike(pattern),
                Account.email.ilike(pattern),
            )
        )

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
            account_status=account_status.value,
            votes_cast=cast,
        )
        for character, stats, account_status, cast in rows
    ]


async def list_characters_to_reset(session: AsyncSession) -> list[Character]:
    """Lives an era roll resets: active plus mod-banned, so an unban is clean."""
    result = await session.execute(
        select(Character).where(
            or_(Character.status != CharacterStatus.banned, MOD_BANNED)
        )
    )
    return list(result.scalars().all())


async def list_active_characters(session: AsyncSession) -> list[Character]:
    """Return every non-banned character, for the stats backfill."""
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
        # Active only: `/admin/cli-token` mints for `admins[0]`, and a suspended
        # (compromised) admin must not get a token. Matches
        # `import_tasks_csv._first_admin_account`.
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
    character_count_result = await session.execute(
        select(func.count()).select_from(Character).where(Character.departed_at.is_(None))
    )
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
    active_accounts_result = await session.execute(
        select(func.count()).select_from(Account).where(
            Account.status == AccountStatus.active,
            select(Character.id)
            .where(
                Character.account_id == Account.id,
                Character.status != CharacterStatus.banned,
            )
            .exists(),
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
        active_accounts=active_accounts_result.scalar_one(),
    )


def _build_flag_out(flag: Flag, flagged_by_name: str) -> FlagOut:
    return FlagOut(
        reason=flag.reason,
        reason_detail=flag.reason_detail,
        flagged_by_id=flag.flagged_by_id,
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
        .join(Character, Character.id == Flag.flagged_by_id)
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
        .join(Character, Character.id == Flag.flagged_by_id)
        .where(Flag.comment_id.in_(comment_ids))
        .order_by(Flag.created_at.desc())
    )
    flags_by_comment: dict[int, list[FlagOut]] = {}
    for flag, flagged_by_name in result.all():
        flags_by_comment.setdefault(flag.comment_id, []).append(
            _build_flag_out(flag, flagged_by_name)
        )
    return flags_by_comment


@dataclass(frozen=True)
class PraxisAuthorModeration:
    account_id: int
    username: str
    character_status: str
    account_status: str
    flagged_count: int


async def authors_for_moderation(
    character_ids: set[int], session: AsyncSession
) -> dict[int, PraxisAuthorModeration]:
    """Account and moderation state per author character, for the queue's cards."""
    if not character_ids:
        return {}
    result = await session.execute(
        select(
            Character.id,
            Character.account_id,
            Character.username,
            Character.status,
            Account.status,
        )
        .join(Account, Account.id == Character.account_id)
        .where(Character.id.in_(character_ids))
    )
    flagged_counts = dict(
        (
            await session.execute(
                select(Praxis.created_by_id, func.count())
                .where(
                    Praxis.created_by_id.in_(character_ids),
                    Praxis.moderation_status == ModerationStatus.flagged,
                )
                .group_by(Praxis.created_by_id)
            )
        ).all()
    )
    return {
        character_id: PraxisAuthorModeration(
            account_id=account_id,
            username=username,
            character_status=character_status.value,
            account_status=account_status.value,
            flagged_count=flagged_counts.get(character_id, 0),
        )
        for (
            character_id,
            account_id,
            username,
            character_status,
            account_status,
        ) in result.all()
    }


async def remove_flagged_praxes_by_author(
    character_id: int, session: AsyncSession, actor_id: int, note: Optional[str] = None
) -> int:
    """Hide every open-flagged praxis by one author (the single remove, in bulk).

    ``note`` is the reason the author reads; None keeps whatever note is there.
    """
    result = await session.execute(
        select(Praxis.id).where(
            Praxis.created_by_id == character_id,
            Praxis.moderation_status == ModerationStatus.flagged,
        )
    )
    praxis_ids = list(result.scalars())
    for praxis_id in praxis_ids:
        kept = note or await session.scalar(
            select(Praxis.admin_note).where(Praxis.id == praxis_id)
        )
        await moderate_praxis(
            praxis_id, ModerationStatus.hidden.value, kept, session,
            actor_id=actor_id, log=False,
        )
    await log_mod_action(
        session, actor_id, "remove_flagged", "character", character_id,
        str(len(praxis_ids)),
    )
    return len(praxis_ids)


async def apply_ban(
    character: Character,
    banned: bool,
    session: AsyncSession,
    era: EraConfig = CURRENT_ERA,
    *,
    actor_id: int,
) -> None:
    """Ban or un-ban a character on behalf of a moderator (#1577).

    Banning forfeits settled duels (ADR-0011 §Forfeit), via the same function
    as self-delete. Un-banning does not un-forfeit: the forfeit is sticky.

    Un-banning refuses a departed life: ``departed_at`` is written only by the
    player's own ``soft_delete_character``; ``status`` alone can't tell them apart.
    A mod-banned life of a deleted account stays unstamped, so that is checked too.
    """
    account = await session.get(Account, character.account_id)
    deleted = account is not None and account.status == AccountStatus.deleted
    if not banned and (character.departed_at is not None or deleted):
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
    await log_mod_action(
        session, actor_id, "ban" if banned else "unban", "character", character.id
    )
    await recalculate_for_account_votes(character.account_id, session, era)


async def set_character_stats(
    character_id: int,
    patch: CharacterStatsPatch,
    session: AsyncSession,
    era: EraConfig = CURRENT_ERA,
    *,
    actor_id: int,
) -> CharacterStats:
    era_row = await get_current_era_row(session)

    stats = await get_or_create_stats(
        session,
        character_id=character_id,
        era_id=era_row.id,
    )

    if patch.level is not None:
        stats.level = patch.level
        character = await session.get(Character, character_id)
        if character is not None:
            record_level_reached(character, patch.level)
    if patch.score is not None:
        stats.score = patch.score
    if patch.all_time_score is not None:
        character = await session.get(Character, character_id)
        if character is not None:
            character.all_time_score = patch.all_time_score
    if patch.votes_available is not None:
        # Back out votes_spent so the on-read formula yields the requested value.
        score_for_cap = patch.score if patch.score is not None else stats.score
        cap = compute_vote_budget(score_for_cap, era)
        stats.votes_spent_this_era = max(0, cap - patch.votes_available)

    await session.flush()
    await log_mod_action(
        session, actor_id, "stats_edit", "character", character_id,
        ", ".join(f"{k}={v}" for k, v in patch.model_dump(exclude_none=True).items()),
    )
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
            granted_by_id=admin_account_id,
        ))
        await session.flush()

    elif action == "revoke":
        if account_role is None:
            return  # Doesn't have the role — idempotent
        await session.delete(account_role)
        await session.flush()

    await log_mod_action(
        session, admin_account_id, f"role_{action}", "account", account_id, role_name
    )


async def _admin_row(account_id: int, session: AsyncSession) -> Optional[AdminRow]:
    """The account's lowest-id character as an :class:`AdminRow`, or None."""
    character = (
        await session.execute(
            select(Character)
            .where(Character.account_id == account_id)
            .order_by(Character.id.asc())
            .limit(1)
        )
    ).scalar_one_or_none()
    if character is None:
        return None
    return AdminRow(
        username=character.username,
        display_name=character.display_name,
        is_owner=account_id == dependencies.OWNER_ACCOUNT_ID,
    )


async def list_admins(session: AsyncSession) -> list[AdminRow]:
    """One row per account holding admin (accounts with no character are skipped)."""
    ids = (
        await session.execute(
            select(AccountRole.account_id)
            .join(Role, Role.id == AccountRole.role_id)
            .where(Role.name == "admin")
            .order_by(AccountRole.account_id.asc())
        )
    ).scalars().all()
    rows = [await _admin_row(i, session) for i in ids]
    return [r for r in rows if r is not None]


async def _account_id_for_username(username: str, session: AsyncSession) -> int:
    account_id = await session.scalar(
        select(Character.account_id).where(Character.username == username)
    )
    if account_id is None:
        raise_coded(
            404, ErrorCode.admin_unknown_username, "No character has that username."
        )
    return account_id


async def grant_admin(username: str, owner_id: int, session: AsyncSession) -> AdminRow:
    """Owner grants admin to a character's account. Refuses an existing admin."""
    account_id = await _account_id_for_username(username, session)
    if await dependencies.account_has_admin_role(account_id, session):
        raise_coded(
            409, ErrorCode.admin_already_admin, "That account is already an admin."
        )
    await assign_or_revoke_role(account_id, "admin", "grant", owner_id, session)
    row = await _admin_row(account_id, session)
    assert row is not None  # the username resolved through a character
    return row


async def revoke_admin(username: str, owner_id: int, session: AsyncSession) -> None:
    """Owner revokes admin. Refuses the owner's own account and a non-admin."""
    account_id = await _account_id_for_username(username, session)
    if account_id == dependencies.OWNER_ACCOUNT_ID:
        raise_coded(
            409,
            ErrorCode.admin_cannot_revoke_owner,
            "The owner's admin role cannot be revoked.",
        )
    if not await dependencies.account_has_admin_role(account_id, session):
        raise_coded(404, ErrorCode.admin_not_an_admin, "That account is not an admin.")
    await assign_or_revoke_role(account_id, "admin", "revoke", owner_id, session)


async def suspend_account(
    account_id: int,
    suspended: bool,
    session: AsyncSession,
    era: EraConfig = CURRENT_ERA,
    *,
    actor_id: int,
) -> Account:
    account = await session.get(Account, account_id)
    if account is None:
        raise HTTPException(status_code=404, detail="Account not found.")
    if account.status == AccountStatus.deleted:
        raise_coded(409, ErrorCode.account_deleted, "Account was deleted.")
    account.status = AccountStatus.suspended if suspended else AccountStatus.active
    await session.flush()
    await log_mod_action(
        session,
        actor_id,
        "suspend" if suspended else "unsuspend",
        "account",
        account_id,
    )
    await recalculate_for_account_votes(account_id, session, era)
    await session.refresh(account)
    return account


async def archive_message(
    message_id: int,
    session: AsyncSession,
    *,
    actor_id: int,
) -> ContactMessage:
    """Toggle is_archived on a contact message."""
    message = await session.get(ContactMessage, message_id)
    if message is None:
        raise HTTPException(status_code=404, detail="Message not found.")
    message.is_archived = not message.is_archived
    await session.flush()
    await log_mod_action(
        session, actor_id, "message_archive" if message.is_archived else "message_unarchive",
        "message", message_id,
    )
    await session.refresh(message)
    return message


async def list_pending_tasks_with_proposer(
    session: AsyncSession,
) -> list[tuple[Task, str | None]]:
    """Return pending tasks paired with their proposer's display name (or None)."""
    result = await session.execute(
        select(Task, Character.display_name)
        .outerjoin(Character, Character.id == Task.created_by_id)
        .where(Task.status == TaskStatus.pending)
        .order_by(Task.created_at)
    )
    return list(result.all())


async def update_task_status(
    task_id: int,
    new_status: TaskStatus,
    session: AsyncSession,
    *,
    actor_id: int,
) -> Task:
    """Admin task status change.

    Any transition is allowed; same-state 422s. Leaving ``deleted`` is the undo
    for Delete (#3305); entering it runs Delete's eligibility check.
    """
    task = await session.get(Task, task_id)
    if task is None:
        raise HTTPException(status_code=404, detail="Task not found.")

    if new_status == task.status:
        raise HTTPException(
            status_code=422,
            detail=f"Task is already {task.status.value}.",
        )

    if new_status == TaskStatus.deleted:
        await _refuse_if_undeletable(task, session)

    task.status = new_status
    await session.flush()
    await log_mod_action(
        session, actor_id, "task_status", "task", task_id, new_status.value
    )
    await session.refresh(task)
    return task


async def admin_edit_task(
    task_id: int,
    data: AdminTaskPatch,
    session: AsyncSession,
    actor_id: int,
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
    before = (task.point_value, task.primary_faction_slug, task.level_required)
    if data.primary_faction_slug is not None:
        # Config owns factions (ADR-0042; cross-faction sentinel is a key). Else FK 500.
        if data.primary_faction_slug not in era.factions:
            raise_coded(
                422,
                ErrorCode.task_faction_unknown,
                f"Unknown faction: {data.primary_faction_slug}.",
            )
        await refuse_hidden_faction(session, data.primary_faction_slug)
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
    if before != (task.point_value, task.primary_faction_slug, task.level_required):
        # Scoring reads these live; stored stats would split from them.
        doers = select(Praxis.id).where(Praxis.task_id == task_id).union(
            select(PraxisMetaTask.praxis_id).where(PraxisMetaTask.task_id == task_id)
        )
        member_ids = await session.scalars(
            select(PraxisMember.character_id)
            .where(PraxisMember.praxis_id.in_(doers))
            .distinct()
        )
        for character_id in member_ids.all():
            await recalculate_character_stats(character_id, session, era)
        await session.flush()
    await log_mod_action(session, actor_id, "task_edit", "task", task_id)
    await session.refresh(task)
    return task


#: Every FK to ``task.id`` — the only delete guard (#3305). Add any new one here.
_TASK_REFERENCES = (
    Praxis.task_id,
    Duel.task_id,
    PraxisMetaTask.task_id,
    Comment.task_id,
)


def _has_history(task_id):
    """SQL predicate: something in ``_TASK_REFERENCES`` points at ``task_id``."""
    return or_(
        *(select(c).where(c == task_id).exists() for c in _TASK_REFERENCES)
    )


async def task_ids_with_history(session: AsyncSession) -> list[int]:
    """Ids of tasks Delete would refuse for history — one query, for the admin list."""
    return list(await session.scalars(select(Task.id).where(_has_history(Task.id))))


def _refuse_task_with_history() -> None:
    raise_coded(
        409,
        ErrorCode.task_has_history,
        "This task has history and cannot be deleted. Retire it instead.",
    )


async def _refuse_if_undeletable(task: Task, session: AsyncSession) -> None:
    """The one eligibility check for entering ``deleted`` (#3062, #3305).

    Shared by Delete and the status endpoint so the latter is no back door.
    """
    if task.seed_key is not None:
        raise_coded(
            409,
            ErrorCode.task_seed_owned,
            "This task is owned by the seeder and cannot be deleted.",
        )
    referenced = await session.scalar(select(_has_history(task.id)))
    if referenced:
        _refuse_task_with_history()


async def delete_unreferenced_task(
    task_id: int, admin_account_id: int, session: AsyncSession
) -> None:
    """Soft-delete a task nothing references (#3062, #3305): status -> deleted.

    For junk (bad CSV rows); a task with history is retired instead. Undo is
    :func:`update_task_status`.
    """
    task = await session.get(Task, task_id)
    if task is None:
        raise_coded(404, ErrorCode.task_not_found, "Task not found.")
    await _refuse_if_undeletable(task, session)
    task.status = TaskStatus.deleted
    await session.flush()
    await log_mod_action(session, admin_account_id, "task_delete", "task", task_id)
    logger.info(
        "Admin account %s soft-deleted task %s (%r).",
        admin_account_id,
        task_id,
        task.title,
    )


# Era rollover (#827, ADR-0091)


async def list_registered_eras(
    session: AsyncSession, era: EraConfig = CURRENT_ERA
) -> list[EraOption]:
    """Every era a mod may roll into, in era order.

    Existence comes from the registry (never-run eras have no row). Liveness
    comes from the latest ``Era`` row — the same source :func:`roll_into_era`'s
    refusal reads, not the process binding, which can diverge on an unregistered
    ``config_key``. ``era`` is only the fallback for a DB with no ``Era`` row.
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


async def preflight_era_roll(config_key: str, session: AsyncSession) -> EraPreflightOut:
    """Read-only: what :func:`roll_into_era` would do to the live game, counted
    with the same predicates and helpers the roll runs. Writes nothing."""
    era_config = era_config_for_key(config_key)
    if era_config is None:
        raise_coded(422, ErrorCode.era_config_unknown, f"Unknown era: {config_key}.")

    async def count(model, *where) -> int:
        stmt = select(func.count()).select_from(model).where(*where)
        return await session.scalar(stmt)

    characters = await list_characters_to_reset(session)
    factions = (await session.execute(select(Faction))).scalars()
    in_faction: dict[str, int] = {}
    for character in characters:
        slug = character.faction_slug
        in_faction[slug] = in_faction.get(slug, 0) + 1
    leaving = factions_leaving_roster({row.slug: row for row in factions}, era_config)

    board_titles = set((await session.execute(select(Task.title))).scalars())
    flagged = ModerationStatus.flagged
    return EraPreflightOut(
        name=era_config.name,
        characters_reset=len(characters),
        duels_frozen=await count(Duel, Duel.status.in_(DUELS_FROZEN_AT_ERA_CLOSE)),
        tasks_retired=await count(Task, *tasks_retired_at_era_close()),
        tasks_arriving=len(await tasks_to_reactivate(session, era_config))
        + sum(task.title not in board_titles for task in era_config.tasks),
        leaving_factions=[
            LeavingFaction(slug=slug, characters=in_faction.get(slug, 0))
            for slug in leaving
        ],
        duels_awaiting_answer=await count(Duel, Duel.status == DuelStatus.pending),
        open_reports=await count(Praxis, Praxis.moderation_status == flagged)
        + await count(Comment, Comment.moderation_status == flagged),
    )


async def roll_into_era(
    config_key: str, operator: Account, session: AsyncSession
) -> EraRollOut:
    """End the live era and open ``config_key``. The most destructive operation
    in the system, and there is no undo.

    Delegates to the owners: new ``Era`` row (ADR-0042), roster mirror,
    ``apply_era_reset`` (incoming era's flags; freezes duels #824), the incoming
    era's ``reactivate_tasks`` (named retired ones return) and ``tasks`` (new ones
    are created); the onboarding task is spared by the retirement, not relisted), then
    ``commit_and_bind_live_era``. ``operator`` is the ``Era.started_by_id`` audit.

    Refuses an unregistered key and the already-live era (a full destructive
    reset for nothing; a disabled <option> is not a control).
    """
    era_config = era_config_for_key(config_key)
    if era_config is None:
        raise_coded(
            422,
            ErrorCode.era_config_unknown,
            f"Unknown era: {config_key}.",
        )

    # Before the read: read, refusal and insert are one decision (same lock as
    # `scripts/era_reset.py`).
    await lock_era_rollover(session)

    live_row = await get_current_era_row_safe(session)
    if live_row is not None and live_row.config_key == era_config.config_key:
        raise_coded(
            409,
            ErrorCode.era_already_live,
            f"{era_config.name} is already the live era.",
        )

    # Before any write: a bad title refuses the whole roll.
    to_reactivate = await tasks_to_reactivate(session, era_config)

    creator_id = (
        await session.execute(
            select(Character.id)
            .where(Character.account_id == operator.id)
            .order_by(Character.id)
            .limit(1)
        )
    ).scalar_one_or_none()
    if creator_id is None:
        board_titles = set((await session.execute(select(Task.title))).scalars())
        if any(task.title not in board_titles for task in era_config.tasks):
            raise_coded(
                409,
                ErrorCode.era_roll_needs_character,
                "This era lists new tasks and the operator has no character "
                "to author them.",
            )

    characters = await list_characters_to_reset(session)
    new_era_row = Era(
        # Fallback if the config file is later deleted; see models/era.py.
        name=era_config.name,
        config_key=era_config.config_key,
        started_by_id=operator.id,
    )
    session.add(new_era_row)
    await session.flush()

    # Mirror the roster (ADR-0087) before the reset: `apply_era_reset` seats
    # characters in `era.reset_faction_slug`, an FK onto `Faction`.
    await upsert_era_factions(session, era_config)

    await apply_era_reset(characters, new_era_row, session, era=era_config)
    await log_mod_action(
        session, operator.id, "era_roll", "era", new_era_row.id, era_config.name
    )

    for task in to_reactivate:
        task.status = TaskStatus.active
    tasks_created = await sync_era_tasks(session, era_config, creator_id)

    # Durable first, live second; see `commit_and_bind_live_era`.
    await commit_and_bind_live_era(session, era_config)

    return EraRollOut(
        era_id=new_era_row.id,
        config_key=era_config.config_key,
        name=era_config.name,
        characters_reset=len(characters),
        tasks_reactivated=len(to_reactivate),
        tasks_created=tasks_created,
    )
