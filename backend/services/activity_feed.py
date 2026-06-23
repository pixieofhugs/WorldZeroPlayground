"""Service layer for the unified activity feed.

Aggregates multiple activity sources into a single reverse-chronological
timeline with cursor-based pagination.

Per SPEC-backend-architecture.md, this service returns dataclasses. The
router owns the Pydantic schema conversion.
"""
from dataclasses import dataclass
from datetime import datetime
from typing import Any, Optional

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from game_config import CURRENT_ERA
from models.character import Character
from models.era import Era
from models.faction_defection_history import FactionDefectionHistory
from models.invitation_letter import InvitationLetter
from models.relationship import Relationship, RelationshipStatus, RelationshipType
from models.praxis import Praxis, PraxisInvite, PraxisInviteStatus, PraxisMember, PraxisStatus, PraxisType
from models.task import Task, TaskStatus
from models.taunt_message import TauntMessage
from models.vote import Vote
from services.era import get_current_era_row


@dataclass(frozen=True)
class ActivityFeedItemDC:
    """Frozen dataclass mirror of schemas.activity_feed.ActivityFeedItem."""
    type: str
    timestamp: datetime
    payload: dict[str, Any]
    actor_display_name: Optional[str] = None
    actor_faction_slug: Optional[str] = None
    actor_avatar_url: Optional[str] = None


@dataclass(frozen=True)
class FeedCountsDC:
    """Frozen dataclass mirror of schemas.activity_feed.FeedCounts."""
    all: int = 0
    friends: int = 0
    foes: int = 0
    your_stuff: int = 0
    global_count: int = 0
    requests: int = 0


@dataclass(frozen=True)
class ActivityFeedResponseDC:
    """Frozen dataclass mirror of schemas.activity_feed.ActivityFeedResponse."""
    items: list[ActivityFeedItemDC]
    counts: FeedCountsDC
    next_cursor: Optional[str] = None


FEED_ITEM_TYPE_VOTE_ON_MINE = "vote_on_mine"
FEED_ITEM_TYPE_FRIEND_COMPLETION = "friend_completion"
FEED_ITEM_TYPE_FOE_TAUNT = "foe_taunt"
FEED_ITEM_TYPE_GLOBAL_TASK = "global_task"
FEED_ITEM_TYPE_ERA_ANNOUNCEMENT = "era_announcement"
FEED_ITEM_TYPE_COLLAB_INVITE = "collab_invite"
FEED_ITEM_TYPE_DUEL_CHALLENGE = "duel_challenge"
FEED_ITEM_TYPE_FRIEND_SIGNUP = "friend_signup"
FEED_ITEM_TYPE_INVITATION_LETTER = "invitation_letter"
FEED_ITEM_TYPE_FRIEND_DEFECTION = "friend_defection"
FEED_ITEM_TYPE_FOE_COMPLETION = "foe_completion"

# Which sub-queries each filter includes
FILTER_QUERIES: dict[str, set[str]] = {
    "all": {
        FEED_ITEM_TYPE_VOTE_ON_MINE,
        FEED_ITEM_TYPE_FRIEND_COMPLETION,
        FEED_ITEM_TYPE_FOE_TAUNT,
        FEED_ITEM_TYPE_GLOBAL_TASK,
        FEED_ITEM_TYPE_ERA_ANNOUNCEMENT,
        FEED_ITEM_TYPE_COLLAB_INVITE,
        FEED_ITEM_TYPE_DUEL_CHALLENGE,
        FEED_ITEM_TYPE_FRIEND_SIGNUP,
        FEED_ITEM_TYPE_INVITATION_LETTER,
        FEED_ITEM_TYPE_FRIEND_DEFECTION,
        FEED_ITEM_TYPE_FOE_COMPLETION,
    },
    "friends": {
        FEED_ITEM_TYPE_FRIEND_COMPLETION,
        FEED_ITEM_TYPE_FRIEND_SIGNUP,
        FEED_ITEM_TYPE_FRIEND_DEFECTION,
    },
    "foes": {FEED_ITEM_TYPE_FOE_TAUNT, FEED_ITEM_TYPE_FOE_COMPLETION},
    "your_stuff": {
        FEED_ITEM_TYPE_VOTE_ON_MINE,
        FEED_ITEM_TYPE_COLLAB_INVITE,
        FEED_ITEM_TYPE_DUEL_CHALLENGE,
        FEED_ITEM_TYPE_INVITATION_LETTER,
    },
    "global": {FEED_ITEM_TYPE_GLOBAL_TASK, FEED_ITEM_TYPE_ERA_ANNOUNCEMENT},
    "requests": {FEED_ITEM_TYPE_COLLAB_INVITE, FEED_ITEM_TYPE_DUEL_CHALLENGE},
}

SUB_QUERY_LIMIT = 50


async def _get_related_ids(
    character_id: int,
    rel_type: RelationshipType,
    session: AsyncSession,
) -> list[int]:
    """Get IDs of characters the current character has declared with this relationship type."""
    result = await session.execute(
        select(Relationship.to_character_id).where(
            Relationship.from_character_id == character_id,
            Relationship.type == rel_type,
            Relationship.status == RelationshipStatus.active,
        )
    )
    return list(result.scalars().all())


async def _get_my_task_ids(
    character_id: int,
    session: AsyncSession,
) -> list[int]:
    """Get task IDs that the character is currently working on via praxis membership."""
    result = await session.execute(
        select(Praxis.task_id)
        .join(PraxisMember, PraxisMember.praxis_id == Praxis.id)
        .where(
            PraxisMember.character_id == character_id,
            Praxis.status == PraxisStatus.in_progress,
            Praxis.is_withdrawn == False,  # noqa: E712
        )
    )
    return list(result.scalars().all())


async def _fetch_votes_on_mine(
    character_id: int,
    session: AsyncSession,
    before: Optional[datetime],
) -> list[ActivityFeedItemDC]:
    """Votes cast on the current character's praxis."""
    voter_char = Character.__table__.alias("voter_char")

    query = (
        select(
            Vote.id,
            Vote.stars,
            Vote.created_at,
            Vote.praxis_id,
            Praxis.title.label("praxis_title"),
            Task.point_value.label("task_point_value"),
            voter_char.c.display_name.label("voter_display_name"),
            voter_char.c.faction_slug.label("voter_faction_slug"),
            voter_char.c.avatar_url.label("voter_avatar_url"),
        )
        .join(Praxis, Vote.praxis_id == Praxis.id)
        .join(Task, Praxis.task_id == Task.id)
        .join(voter_char, Vote.voter_character_id == voter_char.c.id)
        .where(Praxis.created_by_id == character_id)
    )
    if before is not None:
        query = query.where(Vote.created_at < before)
    query = query.order_by(Vote.created_at.desc()).limit(SUB_QUERY_LIMIT)

    result = await session.execute(query)
    items: list[ActivityFeedItemDC] = []
    for row in result.all():
        items.append(ActivityFeedItemDC(
            type=FEED_ITEM_TYPE_VOTE_ON_MINE,
            timestamp=row.created_at,
            actor_display_name=row.voter_display_name,
            actor_faction_slug=row.voter_faction_slug,
            actor_avatar_url=row.voter_avatar_url,
            payload={
                "vote_id": row.id,
                "stars": row.stars,
                "praxis_id": row.praxis_id,
                "praxis_title": row.praxis_title,
                "task_point_value": row.task_point_value,
                "points_earned": row.stars * row.task_point_value,
            },
        ))
    return items


async def _fetch_completions(
    character_ids: list[int],
    item_type: str,
    session: AsyncSession,
    before: Optional[datetime],
) -> list[ActivityFeedItemDC]:
    """Recent praxis (completions) from the given characters (friends or foes)."""
    if not character_ids:
        return []

    query = (
        select(
            Praxis.id,
            Praxis.title,
            Praxis.created_at,
            Praxis.created_by_id.label("character_id"),
            Task.title.label("task_title"),
            Task.point_value.label("task_point_value"),
            Task.primary_faction_slug.label("task_faction_slug"),
            Character.display_name.label("author_display_name"),
            Character.faction_slug.label("author_faction_slug"),
            Character.avatar_url.label("author_avatar_url"),
        )
        .join(Task, Praxis.task_id == Task.id)
        .join(Character, Praxis.created_by_id == Character.id)
        .where(
            Praxis.created_by_id.in_(character_ids),
            Praxis.is_withdrawn == False,  # noqa: E712
            Praxis.status == PraxisStatus.submitted,
        )
    )
    if before is not None:
        query = query.where(Praxis.created_at < before)
    query = query.order_by(Praxis.created_at.desc()).limit(SUB_QUERY_LIMIT)

    result = await session.execute(query)
    items: list[ActivityFeedItemDC] = []
    for row in result.all():
        items.append(ActivityFeedItemDC(
            type=item_type,
            timestamp=row.created_at,
            actor_display_name=row.author_display_name,
            actor_faction_slug=row.author_faction_slug,
            actor_avatar_url=row.author_avatar_url,
            payload={
                "praxis_id": row.id,
                "praxis_title": row.title,
                "task_title": row.task_title,
                "task_point_value": row.task_point_value,
                "task_faction_slug": row.task_faction_slug,
                "character_id": row.character_id,
            },
        ))
    return items


async def _fetch_foe_taunts(
    character_id: int,
    session: AsyncSession,
    before: Optional[datetime],
) -> list[ActivityFeedItemDC]:
    """Taunts received from foes."""
    query = (
        select(
            TauntMessage,
            Character.display_name.label("from_display_name"),
            Character.faction_slug.label("from_faction_slug"),
            Character.avatar_url.label("from_avatar_url"),
        )
        .join(Character, TauntMessage.from_character_id == Character.id)
        .where(TauntMessage.to_character_id == character_id)
    )
    if before is not None:
        query = query.where(TauntMessage.created_at < before)
    query = query.order_by(TauntMessage.created_at.desc()).limit(SUB_QUERY_LIMIT)

    result = await session.execute(query)
    items: list[ActivityFeedItemDC] = []
    for taunt, display_name, faction_slug, avatar_url in result.all():
        items.append(ActivityFeedItemDC(
            type=FEED_ITEM_TYPE_FOE_TAUNT,
            timestamp=taunt.created_at,
            actor_display_name=display_name,
            actor_faction_slug=faction_slug,
            actor_avatar_url=avatar_url,
            payload={
                "taunt_id": taunt.id,
                "message": taunt.message,
                "trigger_type": taunt.trigger_type.value,
                "from_character_id": taunt.from_character_id,
            },
        ))
    return items


async def _fetch_global_tasks(
    session: AsyncSession,
    before: Optional[datetime],
) -> list[ActivityFeedItemDC]:
    """Recently activated tasks (global events)."""
    query = (
        select(
            Task.id,
            Task.title,
            Task.point_value,
            Task.level_required,
            Task.primary_faction_slug,
            Task.created_at,
        )
        .where(Task.status == TaskStatus.active)
    )
    if before is not None:
        query = query.where(Task.created_at < before)
    query = query.order_by(Task.created_at.desc()).limit(SUB_QUERY_LIMIT)

    result = await session.execute(query)
    items: list[ActivityFeedItemDC] = []
    for row in result.all():
        items.append(ActivityFeedItemDC(
            type=FEED_ITEM_TYPE_GLOBAL_TASK,
            timestamp=row.created_at,
            actor_display_name="Admin",
            actor_faction_slug=None,
            actor_avatar_url=None,
            payload={
                "task_id": row.id,
                "task_title": row.title,
                "task_point_value": row.point_value,
                "task_level_required": row.level_required,
                "task_faction_slug": row.primary_faction_slug,
            },
        ))
    return items


async def _fetch_era_announcements(
    session: AsyncSession,
    before: Optional[datetime],
) -> list[ActivityFeedItemDC]:
    """Era start announcements."""
    query = select(Era)
    if before is not None:
        query = query.where(Era.started_at < before)
    query = query.order_by(Era.started_at.desc()).limit(5)

    result = await session.execute(query)
    items: list[ActivityFeedItemDC] = []
    for era in result.scalars().all():
        items.append(ActivityFeedItemDC(
            type=FEED_ITEM_TYPE_ERA_ANNOUNCEMENT,
            timestamp=era.started_at,
            actor_display_name="Admin",
            actor_faction_slug=None,
            actor_avatar_url=None,
            payload={
                "era_id": era.id,
                "era_name": era.name,
                "era_notes": era.notes,
                "config_key": era.config_key,
            },
        ))
    return items


async def _fetch_praxis_invites(
    character_id: int,
    praxis_type: PraxisType,
    item_type: str,
    actor_id_key: str,
    session: AsyncSession,
    before: Optional[datetime],
    pending_only: bool = False,
) -> list[ActivityFeedItemDC]:
    """Praxis invites (collab invites / duel challenges) sent to the current character."""
    query = (
        select(
            PraxisInvite.id,
            PraxisInvite.created_at,
            PraxisInvite.status,
            PraxisInvite.inviter_id,
            PraxisInvite.praxis_id,
            Task.title.label("task_title"),
            Task.point_value.label("task_point_value"),
            Task.primary_faction_slug.label("task_faction_slug"),
            Task.level_required.label("task_level_required"),
            Character.display_name.label("actor_display_name"),
            Character.faction_slug.label("actor_faction_slug"),
            Character.avatar_url.label("actor_avatar_url"),
        )
        .join(Praxis, PraxisInvite.praxis_id == Praxis.id)
        .join(Task, Praxis.task_id == Task.id)
        .join(Character, PraxisInvite.inviter_id == Character.id)
        .where(
            PraxisInvite.invitee_id == character_id,
            Praxis.type == praxis_type,
        )
    )
    if pending_only:
        query = query.where(PraxisInvite.status == PraxisInviteStatus.pending)
    if before is not None:
        query = query.where(PraxisInvite.created_at < before)
    query = query.order_by(PraxisInvite.created_at.desc()).limit(SUB_QUERY_LIMIT)

    result = await session.execute(query)
    items: list[ActivityFeedItemDC] = []
    for row in result.all():
        payload = {
            "invite_id": row.id,
            "praxis_id": row.praxis_id,
            "task_title": row.task_title,
            "task_point_value": row.task_point_value,
            "task_faction_slug": row.task_faction_slug,
            "invite_status": row.status.value,
            actor_id_key: row.inviter_id,
        }
        # ponytail: only collab cards render a level badge; duel payload omits it
        if praxis_type == PraxisType.collab:
            payload["task_level_required"] = row.task_level_required
        items.append(ActivityFeedItemDC(
            type=item_type,
            timestamp=row.created_at,
            actor_display_name=row.actor_display_name,
            actor_faction_slug=row.actor_faction_slug,
            actor_avatar_url=row.actor_avatar_url,
            payload=payload,
        ))
    return items


async def _fetch_friend_signups(
    friend_ids: list[int],
    my_task_ids: list[int],
    session: AsyncSession,
    before: Optional[datetime],
) -> list[ActivityFeedItemDC]:
    """Friends who joined praxes on tasks the current character is also doing."""
    if not friend_ids or not my_task_ids:
        return []

    query = (
        select(
            PraxisMember.id,
            PraxisMember.joined_at,
            Praxis.task_id,
            Character.id.label("character_id"),
            Character.display_name,
            Character.faction_slug,
            Character.avatar_url,
            Task.title.label("task_title"),
            Task.point_value.label("task_point_value"),
            Task.primary_faction_slug.label("task_faction_slug"),
        )
        .join(Praxis, PraxisMember.praxis_id == Praxis.id)
        .join(Character, PraxisMember.character_id == Character.id)
        .join(Task, Praxis.task_id == Task.id)
        .where(
            PraxisMember.character_id.in_(friend_ids),
            Praxis.task_id.in_(my_task_ids),
            Praxis.is_withdrawn == False,  # noqa: E712
        )
    )
    if before is not None:
        query = query.where(PraxisMember.joined_at < before)
    query = query.order_by(PraxisMember.joined_at.desc()).limit(SUB_QUERY_LIMIT)

    result = await session.execute(query)
    items: list[ActivityFeedItemDC] = []
    for row in result.all():
        items.append(ActivityFeedItemDC(
            type=FEED_ITEM_TYPE_FRIEND_SIGNUP,
            timestamp=row.joined_at,
            actor_display_name=row.display_name,
            actor_faction_slug=row.faction_slug,
            actor_avatar_url=row.avatar_url,
            payload={
                "praxis_member_id": row.id,
                "character_id": row.character_id,
                "task_id": row.task_id,
                "task_title": row.task_title,
                "task_point_value": row.task_point_value,
                "task_faction_slug": row.task_faction_slug,
            },
        ))
    return items


async def _fetch_invitation_letters(
    character_id: int,
    session: AsyncSession,
    before: Optional[datetime],
) -> list[ActivityFeedItemDC]:
    """Faction invitation letters delivered to the current character."""
    era_row = await get_current_era_row(session)

    query = (
        select(InvitationLetter)
        .where(
            InvitationLetter.character_id == character_id,
            InvitationLetter.era_id == era_row.id,
        )
    )
    if before is not None:
        query = query.where(InvitationLetter.delivered_at < before)
    query = query.order_by(InvitationLetter.delivered_at.desc()).limit(SUB_QUERY_LIMIT)

    result = await session.execute(query)
    items: list[ActivityFeedItemDC] = []
    for letter in result.scalars().all():
        faction_name = (
            CURRENT_ERA.factions[letter.faction_slug].name
            if letter.faction_slug in CURRENT_ERA.factions
            else letter.faction_slug
        )
        items.append(ActivityFeedItemDC(
            type=FEED_ITEM_TYPE_INVITATION_LETTER,
            timestamp=letter.delivered_at,
            actor_display_name=faction_name,
            actor_faction_slug=letter.faction_slug,
            actor_avatar_url=None,
            payload={
                "letter_id": letter.id,
                "faction_slug": letter.faction_slug,
                "faction_name": faction_name,
            },
        ))
    return items


async def _fetch_friend_defections(
    friend_ids: list[int],
    session: AsyncSession,
    before: Optional[datetime],
) -> list[ActivityFeedItemDC]:
    """Friends who recently changed factions (defected)."""
    if not friend_ids:
        return []

    era_row = await get_current_era_row(session)

    query = (
        select(
            FactionDefectionHistory.id,
            FactionDefectionHistory.character_id,
            FactionDefectionHistory.faction_slug,
            FactionDefectionHistory.defected_at,
            Character.display_name,
            Character.faction_slug.label("current_faction_slug"),
            Character.avatar_url,
        )
        .join(Character, FactionDefectionHistory.character_id == Character.id)
        .where(
            FactionDefectionHistory.character_id.in_(friend_ids),
            FactionDefectionHistory.era_id == era_row.id,
        )
    )
    if before is not None:
        query = query.where(FactionDefectionHistory.defected_at < before)
    query = query.order_by(FactionDefectionHistory.defected_at.desc()).limit(SUB_QUERY_LIMIT)

    result = await session.execute(query)
    items: list[ActivityFeedItemDC] = []
    for row in result.all():
        old_faction_name = (
            CURRENT_ERA.factions[row.faction_slug].name
            if row.faction_slug in CURRENT_ERA.factions
            else row.faction_slug
        )
        new_faction_name = (
            CURRENT_ERA.factions[row.current_faction_slug].name
            if row.current_faction_slug in CURRENT_ERA.factions
            else row.current_faction_slug
        )
        items.append(ActivityFeedItemDC(
            type=FEED_ITEM_TYPE_FRIEND_DEFECTION,
            timestamp=row.defected_at,
            actor_display_name=row.display_name,
            actor_faction_slug=row.current_faction_slug,
            actor_avatar_url=row.avatar_url,
            payload={
                "character_id": row.character_id,
                "old_faction_slug": row.faction_slug,
                "old_faction_name": old_faction_name,
                "new_faction_slug": row.current_faction_slug,
                "new_faction_name": new_faction_name,
            },
        ))
    return items


async def _compute_counts(
    character_id: int,
    friend_ids: list[int],
    my_task_ids: list[int],
    session: AsyncSession,
) -> FeedCountsDC:
    """Compute badge counts for each filter tab using lightweight COUNT queries."""

    async def count_votes_on_mine() -> int:
        result = await session.execute(
            select(func.count())
            .select_from(Vote)
            .join(Praxis, Vote.praxis_id == Praxis.id)
            .where(Praxis.created_by_id == character_id)
        )
        return result.scalar_one()

    async def count_friend_completions() -> int:
        if not friend_ids:
            return 0
        result = await session.execute(
            select(func.count())
            .select_from(Praxis)
            .where(
                Praxis.created_by_id.in_(friend_ids),
                Praxis.is_withdrawn == False,  # noqa: E712
                Praxis.status == PraxisStatus.submitted,
            )
        )
        return result.scalar_one()

    async def count_friend_signups() -> int:
        if not friend_ids or not my_task_ids:
            return 0
        result = await session.execute(
            select(func.count())
            .select_from(PraxisMember)
            .join(Praxis, PraxisMember.praxis_id == Praxis.id)
            .where(
                PraxisMember.character_id.in_(friend_ids),
                Praxis.task_id.in_(my_task_ids),
                Praxis.is_withdrawn == False,  # noqa: E712
            )
        )
        return result.scalar_one()

    async def count_foe_taunts() -> int:
        result = await session.execute(
            select(func.count())
            .select_from(TauntMessage)
            .where(TauntMessage.to_character_id == character_id)
        )
        return result.scalar_one()

    era_row = await get_current_era_row(session)

    async def count_invitation_letters() -> int:
        result = await session.execute(
            select(func.count())
            .select_from(InvitationLetter)
            .where(
                InvitationLetter.character_id == character_id,
                InvitationLetter.era_id == era_row.id,
            )
        )
        return result.scalar_one()

    async def count_friend_defections() -> int:
        if not friend_ids:
            return 0
        result = await session.execute(
            select(func.count())
            .select_from(FactionDefectionHistory)
            .where(
                FactionDefectionHistory.character_id.in_(friend_ids),
                FactionDefectionHistory.era_id == era_row.id,
            )
        )
        return result.scalar_one()

    async def count_your_stuff() -> int:
        """Votes on mine + praxis invites + invitation letters."""
        invite_result = await session.execute(
            select(func.count())
            .select_from(PraxisInvite)
            .where(PraxisInvite.invitee_id == character_id)
        )
        invite_count = invite_result.scalar_one()
        votes_count = await count_votes_on_mine()
        letters_count = await count_invitation_letters()
        return votes_count + invite_count + letters_count

    async def count_global() -> int:
        tasks_result = await session.execute(
            select(func.count())
            .select_from(Task)
            .where(Task.status == TaskStatus.active)
        )
        era_result = await session.execute(
            select(func.count()).select_from(Era)
        )
        return tasks_result.scalar_one() + era_result.scalar_one()

    async def count_requests() -> int:
        result = await session.execute(
            select(func.count())
            .select_from(PraxisInvite)
            .where(
                PraxisInvite.invitee_id == character_id,
                PraxisInvite.status == PraxisInviteStatus.pending,
            )
        )
        return result.scalar_one()

    # Run counts sequentially (shared async session)
    friend_completions_count = await count_friend_completions()
    friend_signups_count = await count_friend_signups()
    friend_defections_count = await count_friend_defections()
    friends_count = friend_completions_count + friend_signups_count + friend_defections_count
    foe_ids_for_count = await _get_related_ids(character_id, RelationshipType.foe, session)
    foe_completions_count = 0
    if foe_ids_for_count:
        foe_completions_result = await session.execute(
            select(func.count())
            .select_from(Praxis)
            .where(
                Praxis.created_by_id.in_(foe_ids_for_count),
                Praxis.is_withdrawn == False,  # noqa: E712
                Praxis.status == PraxisStatus.submitted,
            )
        )
        foe_completions_count = foe_completions_result.scalar_one()
    foes_count = await count_foe_taunts() + foe_completions_count
    your_stuff_count = await count_your_stuff()
    global_count = await count_global()
    requests_count = await count_requests()

    all_count = friends_count + foes_count + your_stuff_count + global_count

    return FeedCountsDC(
        all=all_count,
        friends=friends_count,
        foes=foes_count,
        your_stuff=your_stuff_count,
        global_count=global_count,
        requests=requests_count,
    )


async def get_activity_feed(
    character_id: int,
    session: AsyncSession,
    feed_filter: Optional[str] = None,
    before_cursor: Optional[datetime] = None,
    limit: int = 20,
) -> ActivityFeedResponseDC:
    """Fetch a unified activity feed for the given character.

    Args:
        character_id: The character requesting the feed.
        session: Database session.
        feed_filter: One of "all", "friends", "foes", "your_stuff", "global", "requests".
        before_cursor: ISO datetime cursor for pagination (items before this time).
        limit: Max items to return.
    """
    active_filter = feed_filter or "all"
    allowed_types = FILTER_QUERIES.get(active_filter, FILTER_QUERIES["all"])
    is_requests_filter = active_filter == "requests"

    # Pre-fetch relationship and task context needed by multiple sub-queries
    friend_ids: list[int] = []
    foe_ids: list[int] = []
    my_task_ids: list[int] = []

    needs_friends = bool(allowed_types & {
        FEED_ITEM_TYPE_FRIEND_COMPLETION, FEED_ITEM_TYPE_FRIEND_SIGNUP,
        FEED_ITEM_TYPE_FRIEND_DEFECTION,
    })
    needs_foes = FEED_ITEM_TYPE_FOE_COMPLETION in allowed_types
    needs_my_tasks = FEED_ITEM_TYPE_FRIEND_SIGNUP in allowed_types

    if needs_friends:
        friend_ids = await _get_related_ids(character_id, RelationshipType.friend, session)
    if needs_foes:
        foe_ids = await _get_related_ids(character_id, RelationshipType.foe, session)
    if needs_my_tasks:
        my_task_ids = await _get_my_task_ids(character_id, session)

    # Build list of coroutines to run in parallel
    fetch_tasks: list = []

    if FEED_ITEM_TYPE_VOTE_ON_MINE in allowed_types:
        fetch_tasks.append(_fetch_votes_on_mine(character_id, session, before_cursor))

    if FEED_ITEM_TYPE_FRIEND_COMPLETION in allowed_types:
        fetch_tasks.append(_fetch_completions(friend_ids, FEED_ITEM_TYPE_FRIEND_COMPLETION, session, before_cursor))

    if FEED_ITEM_TYPE_FOE_TAUNT in allowed_types:
        fetch_tasks.append(_fetch_foe_taunts(character_id, session, before_cursor))

    if FEED_ITEM_TYPE_FOE_COMPLETION in allowed_types:
        fetch_tasks.append(_fetch_completions(foe_ids, FEED_ITEM_TYPE_FOE_COMPLETION, session, before_cursor))

    if FEED_ITEM_TYPE_GLOBAL_TASK in allowed_types:
        fetch_tasks.append(_fetch_global_tasks(session, before_cursor))

    if FEED_ITEM_TYPE_ERA_ANNOUNCEMENT in allowed_types:
        fetch_tasks.append(_fetch_era_announcements(session, before_cursor))

    if FEED_ITEM_TYPE_COLLAB_INVITE in allowed_types:
        fetch_tasks.append(_fetch_praxis_invites(
            character_id, PraxisType.collab, FEED_ITEM_TYPE_COLLAB_INVITE,
            "inviter_character_id", session, before_cursor, pending_only=is_requests_filter,
        ))

    if FEED_ITEM_TYPE_DUEL_CHALLENGE in allowed_types:
        fetch_tasks.append(_fetch_praxis_invites(
            character_id, PraxisType.duel, FEED_ITEM_TYPE_DUEL_CHALLENGE,
            "challenger_character_id", session, before_cursor, pending_only=is_requests_filter,
        ))

    if FEED_ITEM_TYPE_FRIEND_SIGNUP in allowed_types:
        fetch_tasks.append(_fetch_friend_signups(
            friend_ids, my_task_ids, session, before_cursor,
        ))

    if FEED_ITEM_TYPE_INVITATION_LETTER in allowed_types:
        fetch_tasks.append(_fetch_invitation_letters(
            character_id, session, before_cursor,
        ))

    if FEED_ITEM_TYPE_FRIEND_DEFECTION in allowed_types:
        fetch_tasks.append(_fetch_friend_defections(
            friend_ids, session, before_cursor,
        ))

    # Run all sub-queries (they share the same session, so sequential is safer
    # with SQLAlchemy async — asyncio.gather can cause issues with shared session)
    all_items: list[ActivityFeedItemDC] = []
    for task in fetch_tasks:
        items = await task
        all_items.extend(items)

    # Sort by timestamp descending, slice to limit
    all_items.sort(key=lambda item: item.timestamp, reverse=True)
    paginated = all_items[:limit]

    # Compute next cursor
    next_cursor = None
    if len(all_items) > limit:
        next_cursor = paginated[-1].timestamp.isoformat()

    # Compute badge counts (separate from pagination)
    counts = await _compute_counts(character_id, friend_ids, my_task_ids, session)

    return ActivityFeedResponseDC(
        items=paginated,
        counts=counts,
        next_cursor=next_cursor,
    )
