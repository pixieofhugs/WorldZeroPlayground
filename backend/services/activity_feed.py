"""Service layer for the unified activity feed.

Aggregates multiple activity sources into a single reverse-chronological
timeline with cursor-based pagination.

Per SPEC-backend-architecture.md, this service returns dataclasses. The
router owns the Pydantic schema conversion.

ADR-0036: feed types are a registry. Each type is one ``FeedSource`` in the
module-level ``FEED_SOURCES`` tuple — a frozen dataclass pairing the type's
filter-tab membership, the pre-fetch context it needs, one query builder, and
one row-to-item mapper. ``get_activity_feed`` iterates the registry; badge
counts are ``COUNT`` over the *same* windowed query, so a source's ``WHERE`` is
authored exactly once and the counts can never drift from the fan-out.
"""
import asyncio
from dataclasses import dataclass
from datetime import datetime
from typing import Any, Callable, Coroutine, Optional

from sqlalchemy import Select, func, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import aliased

from models.character import Character
from models.comment import Comment, CommentMention
from models.era import Era
from models.faction_defection_history import FactionDefectionHistory
from models.invitation_letter import InvitationLetter
from models.relationship import Relationship, RelationshipStatus, RelationshipType
from models.duel import Duel, DuelStatus
from models.praxis import ModerationStatus, Praxis, PraxisInvite, PraxisInviteStatus, PraxisMember, PraxisStatus, PraxisType
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


# --- Feed item types --------------------------------------------------------
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
FEED_ITEM_TYPE_COMMENT_MENTION = "comment_mention"
FEED_ITEM_TYPE_COLLABORATOR_SUBMITTED = "collaborator_submitted"

# --- Filter tabs ------------------------------------------------------------
FILTER_ALL = "all"
FILTER_FRIENDS = "friends"
FILTER_FOES = "foes"
FILTER_YOUR_STUFF = "your_stuff"
FILTER_GLOBAL = "global"
FILTER_REQUESTS = "requests"

# --- Pre-fetch context a source's query depends on --------------------------
# A source that needs one of these but whose context list is empty contributes
# nothing (empty fetch, zero count) — the pre-fetch guard, in one place.
NEEDS_FRIEND_IDS = "friend_ids"
NEEDS_FOE_IDS = "foe_ids"
NEEDS_MY_TASK_IDS = "my_task_ids"

SUB_QUERY_LIMIT = 50
ERA_ANNOUNCEMENT_LIMIT = 5
ADMIN_ACTOR_NAME = "Admin"


@dataclass(frozen=True)
class FeedContext:
    """Everything a source's query needs, resolved once in the pre-fetch phase.

    ``pending_invites_only`` is the sole per-request axis: the ``requests`` tab
    windows collab invites / duel challenges to pending only; every other tab
    (and the your_stuff / all counts) sees every status.
    """
    character_id: int
    friend_ids: tuple[int, ...]
    foe_ids: tuple[int, ...]
    my_task_ids: tuple[int, ...]
    era_id: int
    before: Optional[datetime]
    pending_invites_only: bool


@dataclass(frozen=True)
class FeedSource:
    """One feed type: its tabs, its pre-fetch needs, its query and row mapper.

    ADR-0036: the ``query`` is the single authority for this type's ``WHERE``.
    The fan-out runs it and maps rows via ``to_item``; the badge count is
    ``COUNT`` over the very same (windowed) query. Adding a feed type is one
    entry in ``FEED_SOURCES`` — not six scattered edits.
    """
    item_type: str
    filters: frozenset[str]
    needs: frozenset[str]
    query: Callable[[FeedContext], Select]
    to_item: Callable[[Any], ActivityFeedItemDC]


# ---------------------------------------------------------------------------
# Pre-fetch helpers
# ---------------------------------------------------------------------------

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
            Praxis.status.in_([PraxisStatus.in_progress, PraxisStatus.pending]),
        )
    )
    return list(result.scalars().all())


# ---------------------------------------------------------------------------
# Per-source query builders + row mappers
#
# Each builder returns the windowed Select (ORDER BY + LIMIT) that IS the
# source of truth for its WHERE clause; the matching mapper turns one row into
# an ActivityFeedItemDC. Counts wrap the same Select in a COUNT subquery.
# ---------------------------------------------------------------------------

def _vote_on_mine_query(ctx: FeedContext) -> Select:
    """Votes cast on the current character's praxis."""
    voter_char = Character.__table__.alias("voter_char")
    query = (
        select(
            Vote.id,
            Vote.value,
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
        .where(Praxis.created_by_id == ctx.character_id)
    )
    if ctx.before is not None:
        query = query.where(Vote.created_at < ctx.before)
    return query.order_by(Vote.created_at.desc()).limit(SUB_QUERY_LIMIT)


def _vote_on_mine_item(row: Any) -> ActivityFeedItemDC:
    return ActivityFeedItemDC(
        type=FEED_ITEM_TYPE_VOTE_ON_MINE,
        timestamp=row.created_at,
        actor_display_name=row.voter_display_name,
        actor_faction_slug=row.voter_faction_slug,
        actor_avatar_url=row.voter_avatar_url,
        payload={
            "vote_id": row.id,
            "value": row.value,
            "praxis_id": row.praxis_id,
            "praxis_title": row.praxis_title,
            "task_point_value": row.task_point_value,
            "points_earned": row.value * row.task_point_value,
        },
    )


def _completions_query_factory(character_ids_attr: str) -> Callable[[FeedContext], Select]:
    """Build a completions query reading its character-id list from ``ctx.<attr>``."""
    def build(ctx: FeedContext) -> Select:
        character_ids = getattr(ctx, character_ids_attr)
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
                Praxis.status == PraxisStatus.submitted,
            )
        )
        if ctx.before is not None:
            query = query.where(Praxis.created_at < ctx.before)
        return query.order_by(Praxis.created_at.desc()).limit(SUB_QUERY_LIMIT)
    return build


def _completion_item_factory(item_type: str) -> Callable[[Any], ActivityFeedItemDC]:
    def to_item(row: Any) -> ActivityFeedItemDC:
        return ActivityFeedItemDC(
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
        )
    return to_item


def _foe_taunts_query(ctx: FeedContext) -> Select:
    """Taunts received from foes.

    ADR-0031: emits a structured reference (frozen ``faction_slug`` +
    ``trigger_type`` + both display names), never rendered prose.
    """
    from_character = aliased(Character)
    to_character = aliased(Character)
    query = (
        select(
            TauntMessage,
            from_character.display_name.label("from_display_name"),
            from_character.faction_slug.label("from_faction_slug"),
            from_character.avatar_url.label("from_avatar_url"),
            to_character.display_name.label("to_display_name"),
        )
        .join(from_character, TauntMessage.from_character_id == from_character.id)
        .join(to_character, TauntMessage.to_character_id == to_character.id)
        .where(TauntMessage.to_character_id == ctx.character_id)
    )
    if ctx.before is not None:
        query = query.where(TauntMessage.created_at < ctx.before)
    return query.order_by(TauntMessage.created_at.desc()).limit(SUB_QUERY_LIMIT)


def _foe_taunt_item(row: Any) -> ActivityFeedItemDC:
    taunt: TauntMessage = row[0]
    return ActivityFeedItemDC(
        type=FEED_ITEM_TYPE_FOE_TAUNT,
        timestamp=taunt.created_at,
        actor_display_name=row.from_display_name,
        actor_faction_slug=row.from_faction_slug,
        actor_avatar_url=row.from_avatar_url,
        payload={
            "taunt_id": taunt.id,
            "faction_slug": taunt.faction_slug,
            "trigger_type": taunt.trigger_type.value,
            "from_character_id": taunt.from_character_id,
            "from_name": row.from_display_name,
            "to_name": row.to_display_name,
        },
    )


def _global_tasks_query(ctx: FeedContext) -> Select:
    """Recently activated tasks (global events)."""
    query = select(
        Task.id,
        Task.title,
        Task.point_value,
        Task.level_required,
        Task.primary_faction_slug,
        Task.created_at,
    ).where(Task.status == TaskStatus.active)
    if ctx.before is not None:
        query = query.where(Task.created_at < ctx.before)
    return query.order_by(Task.created_at.desc()).limit(SUB_QUERY_LIMIT)


def _global_task_item(row: Any) -> ActivityFeedItemDC:
    return ActivityFeedItemDC(
        type=FEED_ITEM_TYPE_GLOBAL_TASK,
        timestamp=row.created_at,
        actor_display_name=ADMIN_ACTOR_NAME,
        actor_faction_slug=None,
        actor_avatar_url=None,
        payload={
            "task_id": row.id,
            "task_title": row.title,
            "task_point_value": row.point_value,
            "task_level_required": row.level_required,
            "task_faction_slug": row.primary_faction_slug,
        },
    )


def _era_announcements_query(ctx: FeedContext) -> Select:
    """Era start announcements."""
    query: Select = select(Era)
    if ctx.before is not None:
        query = query.where(Era.started_at < ctx.before)
    return query.order_by(Era.started_at.desc()).limit(ERA_ANNOUNCEMENT_LIMIT)


def _era_announcement_item(row: Any) -> ActivityFeedItemDC:
    era: Era = row[0]
    return ActivityFeedItemDC(
        type=FEED_ITEM_TYPE_ERA_ANNOUNCEMENT,
        timestamp=era.started_at,
        actor_display_name=ADMIN_ACTOR_NAME,
        actor_faction_slug=None,
        actor_avatar_url=None,
        payload={
            "era_id": era.id,
            "era_name": era.name,
            "era_notes": era.notes,
            "config_key": era.config_key,
        },
    )


def _collab_invites_query(ctx: FeedContext) -> Select:
    """Collab invites sent to the current character (PraxisInvite, collab type)."""
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
            PraxisInvite.invitee_id == ctx.character_id,
            Praxis.type == PraxisType.collab,
        )
    )
    if ctx.pending_invites_only:
        query = query.where(PraxisInvite.status == PraxisInviteStatus.pending)
    if ctx.before is not None:
        query = query.where(PraxisInvite.created_at < ctx.before)
    return query.order_by(PraxisInvite.created_at.desc()).limit(SUB_QUERY_LIMIT)


def _collab_invite_item(row: Any) -> ActivityFeedItemDC:
    return ActivityFeedItemDC(
        type=FEED_ITEM_TYPE_COLLAB_INVITE,
        timestamp=row.created_at,
        actor_display_name=row.actor_display_name,
        actor_faction_slug=row.actor_faction_slug,
        actor_avatar_url=row.actor_avatar_url,
        payload={
            "invite_id": row.id,
            "praxis_id": row.praxis_id,
            "task_title": row.task_title,
            "task_point_value": row.task_point_value,
            "task_faction_slug": row.task_faction_slug,
            "invite_status": row.status.value,
            # ponytail: only collab cards render a level badge
            "inviter_character_id": row.inviter_id,
            "task_level_required": row.task_level_required,
        },
    )


def _duel_challenges_query(ctx: FeedContext) -> Select:
    """Duel challenges issued to the current character (ADR-0011, Duel table)."""
    query = (
        select(
            Duel.id,
            Duel.created_at,
            Duel.status,
            Duel.challenger_praxis_id,
            Task.title.label("task_title"),
            Task.point_value.label("task_point_value"),
            Task.primary_faction_slug.label("task_faction_slug"),
            Character.id.label("challenger_character_id"),
            Character.display_name.label("actor_display_name"),
            Character.faction_slug.label("actor_faction_slug"),
            Character.avatar_url.label("actor_avatar_url"),
        )
        .join(Praxis, Duel.challenger_praxis_id == Praxis.id)
        .join(Task, Duel.task_id == Task.id)
        .join(Character, Praxis.created_by_id == Character.id)
        .where(Duel.opponent_character_id == ctx.character_id)
    )
    if ctx.pending_invites_only:
        query = query.where(Duel.status == DuelStatus.pending)
    if ctx.before is not None:
        query = query.where(Duel.created_at < ctx.before)
    return query.order_by(Duel.created_at.desc()).limit(SUB_QUERY_LIMIT)


def _duel_challenge_item(row: Any) -> ActivityFeedItemDC:
    return ActivityFeedItemDC(
        type=FEED_ITEM_TYPE_DUEL_CHALLENGE,
        timestamp=row.created_at,
        actor_display_name=row.actor_display_name,
        actor_faction_slug=row.actor_faction_slug,
        actor_avatar_url=row.actor_avatar_url,
        payload={
            "duel_id": row.id,
            "challenger_praxis_id": row.challenger_praxis_id,
            "challenger_character_id": row.challenger_character_id,
            "task_title": row.task_title,
            "task_point_value": row.task_point_value,
            "task_faction_slug": row.task_faction_slug,
            "duel_status": row.status.value,
        },
    )


def _friend_signups_query(ctx: FeedContext) -> Select:
    """Friends who joined praxes on tasks the current character is also doing."""
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
            PraxisMember.character_id.in_(ctx.friend_ids),
            Praxis.task_id.in_(ctx.my_task_ids),
        )
    )
    if ctx.before is not None:
        query = query.where(PraxisMember.joined_at < ctx.before)
    return query.order_by(PraxisMember.joined_at.desc()).limit(SUB_QUERY_LIMIT)


def _friend_signup_item(row: Any) -> ActivityFeedItemDC:
    return ActivityFeedItemDC(
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
    )


def _invitation_letters_query(ctx: FeedContext) -> Select:
    """Faction invitation letters delivered to the current character (this era)."""
    query: Select = select(InvitationLetter).where(
        InvitationLetter.character_id == ctx.character_id,
        InvitationLetter.era_id == ctx.era_id,
    )
    if ctx.before is not None:
        query = query.where(InvitationLetter.delivered_at < ctx.before)
    return query.order_by(InvitationLetter.delivered_at.desc()).limit(SUB_QUERY_LIMIT)


def _invitation_letter_item(row: Any) -> ActivityFeedItemDC:
    # ADR-0038: emit the faction slug only — the frontend card resolves the
    # faction name from factions.json (factionName(faction_slug)).
    letter: InvitationLetter = row[0]
    return ActivityFeedItemDC(
        type=FEED_ITEM_TYPE_INVITATION_LETTER,
        timestamp=letter.delivered_at,
        actor_display_name=letter.faction_slug,
        actor_faction_slug=letter.faction_slug,
        actor_avatar_url=None,
        payload={
            "letter_id": letter.id,
            "faction_slug": letter.faction_slug,
        },
    )


def _friend_defections_query(ctx: FeedContext) -> Select:
    """Friends who recently changed factions (defected) this era."""
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
            FactionDefectionHistory.character_id.in_(ctx.friend_ids),
            FactionDefectionHistory.era_id == ctx.era_id,
        )
    )
    if ctx.before is not None:
        query = query.where(FactionDefectionHistory.defected_at < ctx.before)
    return query.order_by(FactionDefectionHistory.defected_at.desc()).limit(SUB_QUERY_LIMIT)


def _friend_defection_item(row: Any) -> ActivityFeedItemDC:
    # ADR-0038: emit faction slugs only — the frontend resolves both faction
    # names from factions.json (factionName(<slug>)).
    return ActivityFeedItemDC(
        type=FEED_ITEM_TYPE_FRIEND_DEFECTION,
        timestamp=row.defected_at,
        actor_display_name=row.display_name,
        actor_faction_slug=row.current_faction_slug,
        actor_avatar_url=row.avatar_url,
        payload={
            "character_id": row.character_id,
            "old_faction_slug": row.faction_slug,
            "new_faction_slug": row.current_faction_slug,
        },
    )


def _comment_mentions_query(ctx: FeedContext) -> Select:
    """Comments that @mention the current character (visible, non-withdrawn)."""
    query = (
        select(
            Comment.id,
            Comment.body_text,
            Comment.created_at,
            Comment.praxis_id,
            Comment.task_id,
            Character.display_name.label("author_display_name"),
            Character.faction_slug.label("author_faction_slug"),
            Character.avatar_url.label("author_avatar_url"),
        )
        .join(CommentMention, CommentMention.comment_id == Comment.id)
        .join(Character, Comment.created_by_id == Character.id)
        .where(
            CommentMention.mentioned_character_id == ctx.character_id,
            Comment.is_withdrawn.is_(False),
            Comment.moderation_status == ModerationStatus.visible,
        )
    )
    if ctx.before is not None:
        query = query.where(Comment.created_at < ctx.before)
    return query.order_by(Comment.created_at.desc()).limit(SUB_QUERY_LIMIT)


def _comment_mention_item(row: Any) -> ActivityFeedItemDC:
    return ActivityFeedItemDC(
        type=FEED_ITEM_TYPE_COMMENT_MENTION,
        timestamp=row.created_at,
        actor_display_name=row.author_display_name,
        actor_faction_slug=row.author_faction_slug,
        actor_avatar_url=row.author_avatar_url,
        payload={
            "comment_id": row.id,
            "praxis_id": row.praxis_id,
            "task_id": row.task_id,
            "excerpt": row.body_text[:140],
        },
    )


def _collaborator_submitted_query(ctx: FeedContext) -> Select:
    """A collaborator submitted their part of a collab the viewer is also in (#571).

    PraxisMember rows with has_submitted=True on collab praxes the viewer is also
    a member of, excluding the viewer's own membership. Ordered by submitted_at —
    the moment their part landed, not when they joined.
    """
    viewer_praxis_ids = (
        select(PraxisMember.praxis_id)
        .where(PraxisMember.character_id == ctx.character_id)
        .scalar_subquery()
    )
    query = (
        select(
            PraxisMember.id,
            PraxisMember.submitted_at,
            PraxisMember.praxis_id,
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
            PraxisMember.has_submitted.is_(True),
            PraxisMember.submitted_at.is_not(None),
            PraxisMember.character_id != ctx.character_id,
            Praxis.type == PraxisType.collab,
            PraxisMember.praxis_id.in_(viewer_praxis_ids),
        )
    )
    if ctx.before is not None:
        query = query.where(PraxisMember.submitted_at < ctx.before)
    return query.order_by(PraxisMember.submitted_at.desc()).limit(SUB_QUERY_LIMIT)


def _collaborator_submitted_item(row: Any) -> ActivityFeedItemDC:
    return ActivityFeedItemDC(
        type=FEED_ITEM_TYPE_COLLABORATOR_SUBMITTED,
        timestamp=row.submitted_at,
        actor_display_name=row.display_name,
        actor_faction_slug=row.faction_slug,
        actor_avatar_url=row.avatar_url,
        payload={
            "praxis_member_id": row.id,
            "character_id": row.character_id,
            "praxis_id": row.praxis_id,
            "task_title": row.task_title,
            "task_point_value": row.task_point_value,
            "task_faction_slug": row.task_faction_slug,
        },
    )


# ---------------------------------------------------------------------------
# The registry — one entry per feed type. Adding a type is one line here.
# ---------------------------------------------------------------------------

FEED_SOURCES: tuple[FeedSource, ...] = (
    FeedSource(
        item_type=FEED_ITEM_TYPE_VOTE_ON_MINE,
        filters=frozenset({FILTER_ALL, FILTER_YOUR_STUFF}),
        needs=frozenset(),
        query=_vote_on_mine_query,
        to_item=_vote_on_mine_item,
    ),
    FeedSource(
        item_type=FEED_ITEM_TYPE_FRIEND_COMPLETION,
        filters=frozenset({FILTER_ALL, FILTER_FRIENDS}),
        needs=frozenset({NEEDS_FRIEND_IDS}),
        query=_completions_query_factory(NEEDS_FRIEND_IDS),
        to_item=_completion_item_factory(FEED_ITEM_TYPE_FRIEND_COMPLETION),
    ),
    FeedSource(
        item_type=FEED_ITEM_TYPE_FOE_TAUNT,
        filters=frozenset({FILTER_ALL, FILTER_FOES}),
        needs=frozenset(),
        query=_foe_taunts_query,
        to_item=_foe_taunt_item,
    ),
    FeedSource(
        item_type=FEED_ITEM_TYPE_GLOBAL_TASK,
        filters=frozenset({FILTER_ALL, FILTER_GLOBAL}),
        needs=frozenset(),
        query=_global_tasks_query,
        to_item=_global_task_item,
    ),
    FeedSource(
        item_type=FEED_ITEM_TYPE_ERA_ANNOUNCEMENT,
        filters=frozenset({FILTER_ALL, FILTER_GLOBAL}),
        needs=frozenset(),
        query=_era_announcements_query,
        to_item=_era_announcement_item,
    ),
    FeedSource(
        item_type=FEED_ITEM_TYPE_COLLAB_INVITE,
        filters=frozenset({FILTER_ALL, FILTER_YOUR_STUFF, FILTER_REQUESTS}),
        needs=frozenset(),
        query=_collab_invites_query,
        to_item=_collab_invite_item,
    ),
    FeedSource(
        item_type=FEED_ITEM_TYPE_DUEL_CHALLENGE,
        filters=frozenset({FILTER_ALL, FILTER_YOUR_STUFF, FILTER_REQUESTS}),
        needs=frozenset(),
        query=_duel_challenges_query,
        to_item=_duel_challenge_item,
    ),
    FeedSource(
        item_type=FEED_ITEM_TYPE_FRIEND_SIGNUP,
        filters=frozenset({FILTER_ALL, FILTER_FRIENDS}),
        needs=frozenset({NEEDS_FRIEND_IDS, NEEDS_MY_TASK_IDS}),
        query=_friend_signups_query,
        to_item=_friend_signup_item,
    ),
    FeedSource(
        item_type=FEED_ITEM_TYPE_COLLABORATOR_SUBMITTED,
        filters=frozenset({FILTER_ALL, FILTER_YOUR_STUFF}),
        needs=frozenset(),
        query=_collaborator_submitted_query,
        to_item=_collaborator_submitted_item,
    ),
    FeedSource(
        item_type=FEED_ITEM_TYPE_INVITATION_LETTER,
        filters=frozenset({FILTER_ALL, FILTER_YOUR_STUFF}),
        needs=frozenset(),
        query=_invitation_letters_query,
        to_item=_invitation_letter_item,
    ),
    FeedSource(
        item_type=FEED_ITEM_TYPE_FRIEND_DEFECTION,
        filters=frozenset({FILTER_ALL, FILTER_FRIENDS}),
        needs=frozenset({NEEDS_FRIEND_IDS}),
        query=_friend_defections_query,
        to_item=_friend_defection_item,
    ),
    FeedSource(
        item_type=FEED_ITEM_TYPE_FOE_COMPLETION,
        filters=frozenset({FILTER_ALL, FILTER_FOES}),
        needs=frozenset({NEEDS_FOE_IDS}),
        query=_completions_query_factory(NEEDS_FOE_IDS),
        to_item=_completion_item_factory(FEED_ITEM_TYPE_FOE_COMPLETION),
    ),
    FeedSource(
        item_type=FEED_ITEM_TYPE_COMMENT_MENTION,
        filters=frozenset({FILTER_ALL, FILTER_YOUR_STUFF}),
        needs=frozenset(),
        query=_comment_mentions_query,
        to_item=_comment_mention_item,
    ),
)

# Which sub-queries each filter includes — derived from the registry so it can
# never drift from FEED_SOURCES. FILTER_QUERIES.get(filter, all) keeps the
# "unknown filter falls back to all" contract.
FILTER_QUERIES: dict[str, set[str]] = {
    tab: {source.item_type for source in FEED_SOURCES if tab in source.filters}
    for tab in (
        FILTER_ALL,
        FILTER_FRIENDS,
        FILTER_FOES,
        FILTER_YOUR_STUFF,
        FILTER_GLOBAL,
        FILTER_REQUESTS,
    )
}


# ---------------------------------------------------------------------------
# Registry runner — one own-session-per-source pattern for fetch and count
# ---------------------------------------------------------------------------

def _needs_satisfied(source: FeedSource, ctx: FeedContext) -> bool:
    """A source with an empty required context contributes nothing (guard)."""
    if NEEDS_FRIEND_IDS in source.needs and not ctx.friend_ids:
        return False
    if NEEDS_FOE_IDS in source.needs and not ctx.foe_ids:
        return False
    if NEEDS_MY_TASK_IDS in source.needs and not ctx.my_task_ids:
        return False
    return True


async def _run_source_fetch(
    source: FeedSource,
    ctx: FeedContext,
    session_factory: Callable,
) -> list[ActivityFeedItemDC]:
    """Run a source's query in its own session and map rows → items."""
    if not _needs_satisfied(source, ctx):
        return []
    async with session_factory() as session:
        result = await session.execute(source.query(ctx))
        return [source.to_item(row) for row in result.all()]


async def _run_source_count(
    source: FeedSource,
    ctx: FeedContext,
    session_factory: Callable,
) -> int:
    """COUNT over the source's OWN windowed query (ADR-0036).

    The count wraps the identical Select in a subquery, so it respects the same
    WHERE, the ``before`` cursor, and the SUB_QUERY_LIMIT window as the fetch —
    the badge can never disagree with what the fan-out would return.
    """
    if not _needs_satisfied(source, ctx):
        return 0
    async with session_factory() as session:
        windowed = source.query(ctx).subquery()
        result = await session.execute(select(func.count()).select_from(windowed))
        return int(result.scalar_one())


def _sum_counts_for_tab(tab: str, counts_by_type: dict[str, int]) -> int:
    """Sum the per-source counts of every source belonging to ``tab``."""
    return sum(
        counts_by_type.get(source.item_type, 0)
        for source in FEED_SOURCES
        if tab in source.filters
    )


async def _compute_counts(
    count_ctx: FeedContext,
    count_ctx_requests: FeedContext,
    session_factory: Callable,
) -> FeedCountsDC:
    """Badge counts, each derived from its source's own query (ADR-0036).

    Every tab but ``requests`` sees all statuses (``count_ctx``); the
    ``requests`` tab windows collab invites / duel challenges to pending only
    (``count_ctx_requests``) — matching what that tab's fan-out returns.
    """
    requests_sources = [s for s in FEED_SOURCES if FILTER_REQUESTS in s.filters]

    normal_results, requests_results = await asyncio.gather(
        asyncio.gather(*(
            _run_source_count(source, count_ctx, session_factory)
            for source in FEED_SOURCES
        )),
        asyncio.gather(*(
            _run_source_count(source, count_ctx_requests, session_factory)
            for source in requests_sources
        )),
    )

    normal_counts = {
        source.item_type: count
        for source, count in zip(FEED_SOURCES, normal_results)
    }
    requests_counts = {
        source.item_type: count
        for source, count in zip(requests_sources, requests_results)
    }

    return FeedCountsDC(
        all=_sum_counts_for_tab(FILTER_ALL, normal_counts),
        friends=_sum_counts_for_tab(FILTER_FRIENDS, normal_counts),
        foes=_sum_counts_for_tab(FILTER_FOES, normal_counts),
        your_stuff=_sum_counts_for_tab(FILTER_YOUR_STUFF, normal_counts),
        global_count=_sum_counts_for_tab(FILTER_GLOBAL, normal_counts),
        requests=_sum_counts_for_tab(FILTER_REQUESTS, requests_counts),
    )


async def get_activity_feed(
    character_id: int,
    session: AsyncSession,
    session_factory: Callable,
    feed_filter: Optional[str] = None,
    before_cursor: Optional[datetime] = None,
    limit: int = 20,
) -> ActivityFeedResponseDC:
    """Fetch a unified activity feed for the given character.

    Args:
        character_id: The character requesting the feed.
        session: Database session for the pre-fetch phase (friend/foe/task IDs).
        session_factory: Callable that returns an async session context manager.
            Each concurrent sub-query gets its own session from this factory.
            Injected via FastAPI's Depends(get_session_factory); tests override
            it to reuse the test-transaction session. (ADR-0036: a deliberate
            test seam, kept even though the router only passes it back down.)
        feed_filter: One of "all", "friends", "foes", "your_stuff", "global", "requests".
        before_cursor: ISO datetime cursor for pagination (items before this time).
        limit: Max items to return.
    """
    active_filter = feed_filter or FILTER_ALL
    allowed_types = FILTER_QUERIES.get(active_filter, FILTER_QUERIES[FILTER_ALL])
    is_requests_filter = active_filter == FILTER_REQUESTS

    # Pre-fetch relationship / task / era context. Badge counts span every tab
    # regardless of the active filter, so all context is loaded up front.
    friend_ids = tuple(await _get_related_ids(character_id, RelationshipType.friend, session))
    foe_ids = tuple(await _get_related_ids(character_id, RelationshipType.foe, session))
    my_task_ids = tuple(await _get_my_task_ids(character_id, session))
    era_row = await get_current_era_row(session)

    fetch_ctx = FeedContext(
        character_id=character_id,
        friend_ids=friend_ids,
        foe_ids=foe_ids,
        my_task_ids=my_task_ids,
        era_id=era_row.id,
        before=before_cursor,
        pending_invites_only=is_requests_filter,
    )
    # Counts always report every tab. The ``requests`` badge windows invites /
    # duels to pending; every other tab counts all statuses.
    count_ctx = FeedContext(
        character_id=character_id,
        friend_ids=friend_ids,
        foe_ids=foe_ids,
        my_task_ids=my_task_ids,
        era_id=era_row.id,
        before=before_cursor,
        pending_invites_only=False,
    )
    count_ctx_requests = FeedContext(
        character_id=character_id,
        friend_ids=friend_ids,
        foe_ids=foe_ids,
        my_task_ids=my_task_ids,
        era_id=era_row.id,
        before=before_cursor,
        pending_invites_only=True,
    )

    allowed_sources = [s for s in FEED_SOURCES if s.item_type in allowed_types]

    # Run fan-out and badge counts concurrently; each sub-query owns its session.
    fetch_coros: list[Coroutine[Any, Any, list[ActivityFeedItemDC]]] = [
        _run_source_fetch(source, fetch_ctx, session_factory)
        for source in allowed_sources
    ]
    gather_results = await asyncio.gather(
        *fetch_coros,
        _compute_counts(count_ctx, count_ctx_requests, session_factory),
    )
    counts: FeedCountsDC = gather_results[-1]

    all_items: list[ActivityFeedItemDC] = []
    for item_list in gather_results[:-1]:
        all_items.extend(item_list)

    # Sort by timestamp descending, slice to limit
    all_items.sort(key=lambda item: item.timestamp, reverse=True)
    paginated = all_items[:limit]

    # Compute next cursor
    next_cursor = None
    if len(all_items) > limit:
        next_cursor = paginated[-1].timestamp.isoformat()

    return ActivityFeedResponseDC(
        items=paginated,
        counts=counts,
        next_cursor=next_cursor,
    )
