"""The unified activity feed: many sources, one reverse-chronological, cursor-paged
timeline.

ADR-0036: each type is one ``FeedSource`` in ``FEED_SOURCES``. Badge counts are
``COUNT`` over the same windowed query, so a source's ``WHERE`` is written once.
"""
import logging
from dataclasses import dataclass, field, replace
from datetime import datetime
from typing import Any, Callable, Optional, Sequence

from pydantic import ValidationError
from sqlalchemy import (
    Select,
    String,
    and_,
    delete,
    exists,
    func,
    literal,
    or_,
    select,
    union_all,
)
from sqlalchemy.dialects.postgresql import insert as postgres_insert
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import InstrumentedAttribute, aliased

from errors import ErrorCode, raise_coded
from game_config import era_config_for_key
from models.character import Character
from models.comment import Comment, CommentMention
from models.era import Era
from models.faction_defection_history import FactionDefectionHistory
from models.feed_dismissal import FeedDismissal
from models.invitation_letter import InvitationLetter
from models.nudge import Nudge
from models.relationship import Relationship, RelationshipStatus, RelationshipType
from models.duel import Duel, DuelStatus
from models.praxis import ModerationStatus, Praxis, PraxisInvite, PraxisInviteStatus, PraxisMember, PraxisStatus, PraxisType
from services.block_service import blocked_counterpart_ids
from services.meta_task import character_sees_metatasks
from services.praxis_visibility import praxis_visibility_condition
from models.character_stats import CharacterStats
from models.task import Task, TaskStatus, TaskType
from models.taunt_message import TauntMessage
from models.vote import Vote
from schemas.activity_feed import (
    AwaitingSubmissionPayload,
    CollabInvitePayload,
    CollaboratorSubmittedPayload,
    CommentPayload,
    CompletionPayload,
    DuelChallengePayload,
    EraAnnouncementPayload,
    FeedPayload,
    FoeTauntPayload,
    FriendDefectionPayload,
    FriendSignupPayload,
    GlobalTaskPayload,
    InvitationLetterPayload,
    NudgePayload,
    VoteOnMinePayload,
)
from services.era import get_current_era_row

logger = logging.getLogger(__name__)


@dataclass(frozen=True)
class ActivityFeedItemDC:
    """Frozen dataclass mirror of schemas.activity_feed.ActivityFeedItem.

    ``payload`` is a declared Pydantic shape (#1402) so a drifted shape fails in
    the mapper; it is the client contract, so no dataclass mirror.
    """
    type: str
    item_key: str
    timestamp: datetime
    payload: FeedPayload
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
    # Per-type count for every type the current view could show.
    by_type: dict[str, int] = field(default_factory=dict)


@dataclass(frozen=True)
class ActivityFeedResponseDC:
    """Frozen dataclass mirror of schemas.activity_feed.ActivityFeedResponse."""
    items: list[ActivityFeedItemDC]
    counts: FeedCountsDC
    next_cursor: Optional[str] = None


FEED_ITEM_TYPE_VOTE_ON_MINE = "vote_on_mine"
FEED_ITEM_TYPE_VOTE_CHANGED_ON_MINE = "vote_changed_on_mine"
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
FEED_ITEM_TYPE_COMMENT_ON_MINE = "comment_on_mine"
FEED_ITEM_TYPE_COLLABORATOR_SUBMITTED = "collaborator_submitted"
FEED_ITEM_TYPE_AWAITING_SUBMISSION = "awaiting_submission"
FEED_ITEM_TYPE_NUDGE = "nudge"

# Items are derived, never stored, so identity is ``"{type}:{source row PK}"``.
# The prefix is needed: several types share a source table. Never derive it
# from position/offset/time — dismissals key on it.
ITEM_KEY_SEPARATOR = ":"


def build_item_key(item_type: str, source_id: int) -> str:
    """The stable identity of one feed item: its type plus its source row's PK."""
    return f"{item_type}{ITEM_KEY_SEPARATOR}{source_id}"


# ``awaiting_submission`` is state, not an event, and self-clears; archiving it
# would silence a standing obligation (#1192).
NON_ARCHIVABLE_ITEM_TYPES: frozenset[str] = frozenset({FEED_ITEM_TYPE_AWAITING_SUBMISSION})

FILTER_ALL = "all"
FILTER_FRIENDS = "friends"
FILTER_FOES = "foes"
FILTER_YOUR_STUFF = "your_stuff"
FILTER_GLOBAL = "global"
FILTER_REQUESTS = "requests"

# Pre-fetch needs: a source whose needed list is empty contributes nothing.
NEEDS_FRIEND_IDS = "friend_ids"
NEEDS_FOE_IDS = "foe_ids"
NEEDS_MY_TASK_IDS = "my_task_ids"

SUB_QUERY_LIMIT = 50
ERA_ANNOUNCEMENT_LIMIT = 5
ADMIN_ACTOR_NAME = "Admin"

# The card shows this verbatim; it does not re-truncate.
COMMENT_EXCERPT_LENGTH = 140


@dataclass(frozen=True)
class FeedContext:
    """Everything a source's query needs, resolved once in the pre-fetch phase.

    ``unanswered_requests_only`` (#1301): every live tab shows only requests
    still awaiting an answer; only the Archived view sets it False, so an item
    archived while pending stays listed there. "Answered" is per type (ADR-0070).

    ``sees_metatasks`` is the resolved boolean from
    :func:`services.meta_task.character_sees_metatasks` (#2280), not a level, so
    no source restates the threshold.
    """
    character_id: int
    friend_ids: tuple[int, ...]
    foe_ids: tuple[int, ...]
    my_task_ids: tuple[int, ...]
    era_id: int
    before: Optional[datetime]
    unanswered_requests_only: bool
    sees_metatasks: bool


@dataclass(frozen=True)
class FeedSource:
    """One feed type: its tabs, its pre-fetch needs, its query and row mapper.

    ADR-0036: ``query`` is the single authority for the type's ``WHERE``; fan-out
    and badge count both use it.

    ``source_id_column`` (the item-key PK) lets the archive filter run in SQL,
    so a dismissed row never eats a ``SUB_QUERY_LIMIT`` slot and the count drops too.
    """
    item_type: str
    filters: frozenset[str]
    needs: frozenset[str]
    query: Callable[[FeedContext], Select]
    to_item: Callable[[Any], ActivityFeedItemDC]
    source_id_column: InstrumentedAttribute[int]


@dataclass(frozen=True, eq=False)
class FeedArchiveView:
    """The viewer's archive, resolved once per request.

    ``dismissed_source_ids``: archived source PKs, split by type.
    ``archived_only``: False hides archived items (live), True shows only them.
    ``eq=False`` so the dict needn't be hashable.
    """
    dismissed_source_ids: dict[str, frozenset[int]]
    archived_only: bool = False


async def _get_related_ids(
    character_id: int,
    rel_type: RelationshipType,
    session: AsyncSession,
) -> list[int]:
    """Get IDs of characters the current character has declared with this relationship type.

    Minus blocks in either direction (ADR-0077), as a subquery because the
    statement count is pinned (``test_activity_feed_query_count``).
    """
    result = await session.execute(
        select(Relationship.to_character_id).where(
            Relationship.from_character_id == character_id,
            Relationship.type == rel_type,
            Relationship.status == RelationshipStatus.active,
            Relationship.to_character_id.not_in(blocked_counterpart_ids(character_id)),
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


# Per-source builders return the windowed Select; counts wrap the same Select.

# Votes are edited in place, so the table is partitioned (exhaustive, disjoint,
# #1712): never-touched -> ``vote_on_mine``, re-rated -> ``vote_changed_on_mine``.
# Otherwise a read card would silently change its number.
_VOTE_WAS_CHANGED = Vote.updated_at > Vote.created_at


def _vote_query_factory(changed: bool) -> Callable[[FeedContext], Select]:
    """Build the cast-vote or changed-vote query — they differ only in time.

    Cursor and ORDER BY follow the column the item's timestamp comes from.
    """
    moment = Vote.updated_at if changed else Vote.created_at

    def build(ctx: FeedContext) -> Select:
        voter_char = Character.__table__.alias("voter_char")
        query = (
            select(
                Vote.id,
                Vote.value,
                moment.label("moment"),
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
            .where(
                Praxis.created_by_id == ctx.character_id,
                _VOTE_WAS_CHANGED if changed else ~_VOTE_WAS_CHANGED,
            )
        )
        if ctx.before is not None:
            query = query.where(moment < ctx.before)
        return query.order_by(moment.desc()).limit(SUB_QUERY_LIMIT)

    return build


def _vote_item_factory(item_type: str) -> Callable[[Any], ActivityFeedItemDC]:
    """Both vote sources carry the same payload — the value that stands now.

    Keyed per vote, not per revision: repeated changes collapse into one item.

    ponytail: can't say what the vote changed *from*, and an alt re-rating with
    an identical value reads as a change (``uq_vote_praxis_account``). Upgrade:
    a ``previous_value`` column on ``Vote`` set in ``cast_or_update_vote``.
    """
    def build(row: Any) -> ActivityFeedItemDC:
        return ActivityFeedItemDC(
            type=item_type,
            item_key=build_item_key(item_type, row.id),
            timestamp=row.moment,
            actor_display_name=row.voter_display_name,
            actor_faction_slug=row.voter_faction_slug,
            actor_avatar_url=row.voter_avatar_url,
            payload=VoteOnMinePayload(
                vote_id=row.id,
                value=row.value,
                praxis_id=row.praxis_id,
                praxis_title=row.praxis_title,
                task_point_value=row.task_point_value,
                # Only `value` (#2402): a vote's contribution IS its star value.
            ),
        )

    return build


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
                # Anyone can declare you a foe and read this source, so apply the
                # same visibility as every other door: moderation `hidden`, and
                # duel sides sealed until reveal (#999).
                Praxis.moderation_status != ModerationStatus.hidden,
                praxis_visibility_condition(ctx.character_id),
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
            item_key=build_item_key(item_type, row.id),
            timestamp=row.created_at,
            actor_display_name=row.author_display_name,
            actor_faction_slug=row.author_faction_slug,
            actor_avatar_url=row.author_avatar_url,
            payload=CompletionPayload(
                praxis_id=row.id,
                praxis_title=row.title,
                task_title=row.task_title,
                task_point_value=row.task_point_value,
                task_faction_slug=row.task_faction_slug,
                character_id=row.character_id,
            ),
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
        item_key=build_item_key(FEED_ITEM_TYPE_FOE_TAUNT, taunt.id),
        timestamp=taunt.created_at,
        actor_display_name=row.from_display_name,
        actor_faction_slug=row.from_faction_slug,
        actor_avatar_url=row.from_avatar_url,
        payload=FoeTauntPayload(
            taunt_id=taunt.id,
            faction_slug=taunt.faction_slug,
            trigger_type=taunt.trigger_type.value,
            from_character_id=taunt.from_character_id,
            from_name=row.from_display_name,
            to_name=row.to_display_name,
        ),
    )


def _global_tasks_query(ctx: FeedContext) -> Select:
    """Recently activated tasks (global events) — the ones newer than the reader.

    Tasks created before the character are not news (#2225); per character,
    not account. ``>=`` because ``now()`` is the transaction timestamp. A
    correlated subquery so it rides the badge COUNT without a round trip.

    Metatasks are withheld below ``ctx.sees_metatasks`` (#2280), here in SQL so
    the badge drops too. Level only — no faction clause: ADR-0029 removed that gate.
    """
    character_born = (
        select(Character.created_at)
        .where(Character.id == ctx.character_id)
        .scalar_subquery()
    )
    query = select(
        Task.id,
        Task.title,
        Task.point_value,
        Task.level_required,
        Task.primary_faction_slug,
        Task.created_at,
    ).where(
        Task.status == TaskStatus.active,
        Task.created_at >= character_born,
    )
    if not ctx.sees_metatasks:
        query = query.where(Task.task_type != TaskType.metatask)
    if ctx.before is not None:
        query = query.where(Task.created_at < ctx.before)
    return query.order_by(Task.created_at.desc()).limit(SUB_QUERY_LIMIT)


def _global_task_item(row: Any) -> ActivityFeedItemDC:
    return ActivityFeedItemDC(
        type=FEED_ITEM_TYPE_GLOBAL_TASK,
        item_key=build_item_key(FEED_ITEM_TYPE_GLOBAL_TASK, row.id),
        timestamp=row.created_at,
        actor_display_name=ADMIN_ACTOR_NAME,
        actor_faction_slug=None,
        actor_avatar_url=None,
        payload=GlobalTaskPayload(
            task_id=row.id,
            task_title=row.title,
            task_point_value=row.point_value,
            task_level_required=row.level_required,
            task_faction_slug=row.primary_faction_slug,
        ),
    )


def _era_announcements_query(ctx: FeedContext) -> Select:
    """Era start announcements."""
    query: Select = select(Era)
    if ctx.before is not None:
        query = query.where(Era.started_at < ctx.before)
    return query.order_by(Era.started_at.desc()).limit(ERA_ANNOUNCEMENT_LIMIT)


def _era_announcement_item(row: Any) -> ActivityFeedItemDC:
    era: Era = row[0]
    # Name from the row's own config_key (#1623), not CURRENT_ERA (past eras are
    # listed too). Stored name is the fallback for a config that no longer exists.
    era_config = era_config_for_key(era.config_key)
    return ActivityFeedItemDC(
        type=FEED_ITEM_TYPE_ERA_ANNOUNCEMENT,
        item_key=build_item_key(FEED_ITEM_TYPE_ERA_ANNOUNCEMENT, era.id),
        timestamp=era.started_at,
        actor_display_name=ADMIN_ACTOR_NAME,
        actor_faction_slug=None,
        actor_avatar_url=None,
        payload=EraAnnouncementPayload(
            era_id=era.id,
            era_name=era_config.name if era_config is not None else era.name,
            era_notes=era.notes,
            config_key=era.config_key,
        ),
    )


def _collab_invites_query(ctx: FeedContext) -> Select:
    """Collab invites sent to the current character (PraxisInvite, collab type).

    "Unanswered" is two conditions (#2279): still pending AND the praxis not
    submitted (``respond_to_invite`` refuses accept then). Filtered here, not in
    the renderer, so the badge count drops too (ADR-0036).
    """
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
    if ctx.unanswered_requests_only:
        query = query.where(
            PraxisInvite.status == PraxisInviteStatus.pending,
            Praxis.status != PraxisStatus.submitted,
        )
    if ctx.before is not None:
        query = query.where(PraxisInvite.created_at < ctx.before)
    return query.order_by(PraxisInvite.created_at.desc()).limit(SUB_QUERY_LIMIT)


def _collab_invite_item(row: Any) -> ActivityFeedItemDC:
    return ActivityFeedItemDC(
        type=FEED_ITEM_TYPE_COLLAB_INVITE,
        item_key=build_item_key(FEED_ITEM_TYPE_COLLAB_INVITE, row.id),
        timestamp=row.created_at,
        actor_display_name=row.actor_display_name,
        actor_faction_slug=row.actor_faction_slug,
        actor_avatar_url=row.actor_avatar_url,
        payload=CollabInvitePayload(
            invite_id=row.id,
            praxis_id=row.praxis_id,
            task_title=row.task_title,
            task_point_value=row.task_point_value,
            task_faction_slug=row.task_faction_slug,
            invite_status=row.status.value,
            inviter_character_id=row.inviter_id,
            task_level_required=row.task_level_required,
        ),
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
    if ctx.unanswered_requests_only:
        query = query.where(Duel.status == DuelStatus.pending)
    if ctx.before is not None:
        query = query.where(Duel.created_at < ctx.before)
    return query.order_by(Duel.created_at.desc()).limit(SUB_QUERY_LIMIT)


def _duel_challenge_item(row: Any) -> ActivityFeedItemDC:
    return ActivityFeedItemDC(
        type=FEED_ITEM_TYPE_DUEL_CHALLENGE,
        item_key=build_item_key(FEED_ITEM_TYPE_DUEL_CHALLENGE, row.id),
        timestamp=row.created_at,
        actor_display_name=row.actor_display_name,
        actor_faction_slug=row.actor_faction_slug,
        actor_avatar_url=row.actor_avatar_url,
        payload=DuelChallengePayload(
            duel_id=row.id,
            challenger_praxis_id=row.challenger_praxis_id,
            challenger_character_id=row.challenger_character_id,
            task_title=row.task_title,
            task_point_value=row.task_point_value,
            task_faction_slug=row.task_faction_slug,
            duel_status=row.status.value,
        ),
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
            Task.level_required.label("task_level_required"),
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
        item_key=build_item_key(FEED_ITEM_TYPE_FRIEND_SIGNUP, row.id),
        timestamp=row.joined_at,
        actor_display_name=row.display_name,
        actor_faction_slug=row.faction_slug,
        actor_avatar_url=row.avatar_url,
        payload=FriendSignupPayload(
            praxis_member_id=row.id,
            character_id=row.character_id,
            task_id=row.task_id,
            task_title=row.task_title,
            task_point_value=row.task_point_value,
            task_faction_slug=row.task_faction_slug,
            task_level_required=row.task_level_required,
        ),
    )


def _invitation_letters_query(ctx: FeedContext) -> Select:
    """Faction invitation letters delivered to the current character (this era).

    No status column: "answered" means the viewer already stands in that
    faction (ADR-0070), via a scalar subquery rather than another round trip.
    """
    query: Select = select(InvitationLetter).where(
        InvitationLetter.character_id == ctx.character_id,
        InvitationLetter.era_id == ctx.era_id,
    )
    if ctx.unanswered_requests_only:
        query = query.where(
            InvitationLetter.faction_slug
            != select(Character.faction_slug)
            .where(Character.id == ctx.character_id)
            .scalar_subquery()
        )
    if ctx.before is not None:
        query = query.where(InvitationLetter.delivered_at < ctx.before)
    return query.order_by(InvitationLetter.delivered_at.desc()).limit(SUB_QUERY_LIMIT)


def _invitation_letter_item(row: Any) -> ActivityFeedItemDC:
    # ADR-0038: slug only; the frontend resolves the name.
    letter: InvitationLetter = row[0]
    return ActivityFeedItemDC(
        type=FEED_ITEM_TYPE_INVITATION_LETTER,
        item_key=build_item_key(FEED_ITEM_TYPE_INVITATION_LETTER, letter.id),
        timestamp=letter.delivered_at,
        actor_display_name=letter.faction_slug,
        actor_faction_slug=letter.faction_slug,
        actor_avatar_url=None,
        payload=InvitationLetterPayload(
            letter_id=letter.id,
            faction_slug=letter.faction_slug,
        ),
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
    # ADR-0038: slugs only.
    return ActivityFeedItemDC(
        type=FEED_ITEM_TYPE_FRIEND_DEFECTION,
        # PK not in the payload, but selected, so the key is stable.
        item_key=build_item_key(FEED_ITEM_TYPE_FRIEND_DEFECTION, row.id),
        timestamp=row.defected_at,
        actor_display_name=row.display_name,
        actor_faction_slug=row.current_faction_slug,
        actor_avatar_url=row.avatar_url,
        payload=FriendDefectionPayload(
            character_id=row.character_id,
            old_faction_slug=row.faction_slug,
            new_faction_slug=row.current_faction_slug,
        ),
    )


#: Shared projection for both comment sources; only the WHERE differs.
_COMMENT_COLUMNS = (
    Comment.id,
    Comment.body_text,
    Comment.created_at,
    Comment.praxis_id,
    Comment.task_id,
    Character.id.label("author_character_id"),
    Character.display_name.label("author_display_name"),
    Character.faction_slug.label("author_faction_slug"),
    Character.avatar_url.label("author_avatar_url"),
)


def _mentions_the_viewer(ctx: FeedContext):
    """Does this comment name the viewer? Correlated on ``Comment.id``.

    Required by the mention source, refused by on-mine; one definition so they agree.
    """
    return exists().where(
        and_(
            CommentMention.comment_id == Comment.id,
            CommentMention.mentioned_character_id == ctx.character_id,
        )
    )


def _comment_mentions_query(ctx: FeedContext) -> Select:
    """Comments that @mention the current character (visible, non-withdrawn)."""
    query = (
        select(*_COMMENT_COLUMNS)
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


def _comments_on_mine_query(ctx: FeedContext) -> Select:
    """Somebody else commented on a praxis that is the viewer's (#2159).

    "Theirs" = author OR member (author membership is a create-path convention,
    not a schema invariant). Membership is ``EXISTS`` so multi-member praxes
    don't duplicate rows. Praxis comments only: tasks have no author.

    ``~_mentions_the_viewer`` suppresses the double; the mention row (stronger
    signal) stands. Visibility mirrors the mention query.
    """
    query = (
        select(*_COMMENT_COLUMNS)
        .join(Praxis, Comment.praxis_id == Praxis.id)
        .join(Character, Comment.created_by_id == Character.id)
        .where(
            Comment.created_by_id != ctx.character_id,
            or_(
                Praxis.created_by_id == ctx.character_id,
                exists().where(
                    and_(
                        PraxisMember.praxis_id == Praxis.id,
                        PraxisMember.character_id == ctx.character_id,
                    )
                ),
            ),
            ~_mentions_the_viewer(ctx),
            Comment.is_withdrawn.is_(False),
            Comment.moderation_status == ModerationStatus.visible,
        )
    )
    if ctx.before is not None:
        query = query.where(Comment.created_at < ctx.before)
    return query.order_by(Comment.created_at.desc()).limit(SUB_QUERY_LIMIT)


def _comment_item_factory(item_type: str) -> Callable[[Any], ActivityFeedItemDC]:
    """The row builder for both comment types — same payload, different tag.

    Keys differ by type, so the double is suppressed in WHERE, not here.
    """

    def to_item(row: Any) -> ActivityFeedItemDC:
        return ActivityFeedItemDC(
            type=item_type,
            item_key=build_item_key(item_type, row.id),
            timestamp=row.created_at,
            actor_display_name=row.author_display_name,
            actor_faction_slug=row.author_faction_slug,
            actor_avatar_url=row.author_avatar_url,
            payload=CommentPayload(
                comment_id=row.id,
                # The commenter; "character_id" like other actor types (#1196).
                character_id=row.author_character_id,
                # Exactly one is set (DB CHECK, migration 0005).
                praxis_id=row.praxis_id,
                task_id=row.task_id,
                excerpt=row.body_text[:COMMENT_EXCERPT_LENGTH],
            ),
        )

    return to_item


def _collaborator_submitted_query(ctx: FeedContext) -> Select:
    """A collaborator submitted their part of a collab the viewer is also in (#571).

    Ordered by submitted_at. The viewer's own member row is joined (#2284) to
    carry ``viewer_has_submitted`` so the CTA can drop; not a predicate, since
    the news stands either way. Unique ``(praxis_id, character_id)`` keeps it 1:1.
    """
    viewer_member = aliased(PraxisMember)
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
            viewer_member.has_submitted.label("viewer_has_submitted"),
        )
        .join(Praxis, PraxisMember.praxis_id == Praxis.id)
        .join(Character, PraxisMember.character_id == Character.id)
        .join(Task, Praxis.task_id == Task.id)
        .join(
            viewer_member,
            and_(
                viewer_member.praxis_id == PraxisMember.praxis_id,
                viewer_member.character_id == ctx.character_id,
            ),
        )
        .where(
            PraxisMember.has_submitted.is_(True),
            PraxisMember.submitted_at.is_not(None),
            PraxisMember.character_id != ctx.character_id,
            Praxis.type == PraxisType.collab,
        )
    )
    if ctx.before is not None:
        query = query.where(PraxisMember.submitted_at < ctx.before)
    return query.order_by(PraxisMember.submitted_at.desc()).limit(SUB_QUERY_LIMIT)


def _collaborator_submitted_item(row: Any) -> ActivityFeedItemDC:
    return ActivityFeedItemDC(
        type=FEED_ITEM_TYPE_COLLABORATOR_SUBMITTED,
        item_key=build_item_key(FEED_ITEM_TYPE_COLLABORATOR_SUBMITTED, row.id),
        timestamp=row.submitted_at,
        actor_display_name=row.display_name,
        actor_faction_slug=row.faction_slug,
        actor_avatar_url=row.avatar_url,
        payload=CollaboratorSubmittedPayload(
            praxis_member_id=row.id,
            character_id=row.character_id,
            praxis_id=row.praxis_id,
            task_title=row.task_title,
            task_point_value=row.task_point_value,
            task_faction_slug=row.task_faction_slug,
            viewer_has_submitted=row.viewer_has_submitted,
        ),
    )


def _awaiting_submission_query(ctx: FeedContext) -> Select:
    """Praxes waiting on the VIEWER's own submission, where somebody else is party to it.

    Viewer unsubmitted on an open praxis with at least one OTHER member.
    Mirror of ``_collaborator_submitted_query``; ordered by ``joined_at``.

    The other-member EXISTS, not a type check (#1980): a collab nobody was
    invited to is a solo draft, not an awaited action.
    """
    other_member = aliased(PraxisMember)
    query = (
        select(
            PraxisMember.id,
            PraxisMember.joined_at,
            PraxisMember.praxis_id,
            Praxis.type.label("praxis_type"),
            Task.title.label("task_title"),
            Task.point_value.label("task_point_value"),
            Task.primary_faction_slug.label("task_faction_slug"),
            Task.level_required.label("task_level_required"),
        )
        .join(Praxis, PraxisMember.praxis_id == Praxis.id)
        .join(Task, Praxis.task_id == Task.id)
        .where(
            PraxisMember.character_id == ctx.character_id,
            PraxisMember.has_submitted.is_(False),
            Praxis.status.in_([PraxisStatus.in_progress, PraxisStatus.pending]),
            select(other_member.id)
            .where(
                other_member.praxis_id == PraxisMember.praxis_id,
                other_member.character_id != ctx.character_id,
            )
            .exists(),
        )
    )
    if ctx.before is not None:
        query = query.where(PraxisMember.joined_at < ctx.before)
    return query.order_by(PraxisMember.joined_at.desc()).limit(SUB_QUERY_LIMIT)


def _awaiting_submission_item(row: Any) -> ActivityFeedItemDC:
    # No actor: the card frames to the task's faction (context_faction_slug fallback).
    return ActivityFeedItemDC(
        type=FEED_ITEM_TYPE_AWAITING_SUBMISSION,
        item_key=build_item_key(FEED_ITEM_TYPE_AWAITING_SUBMISSION, row.id),
        timestamp=row.joined_at,
        actor_display_name=None,
        actor_faction_slug=None,
        actor_avatar_url=None,
        payload=AwaitingSubmissionPayload(
            praxis_member_id=row.id,
            praxis_id=row.praxis_id,
            praxis_type=row.praxis_type.value,
            task_title=row.task_title,
            task_point_value=row.task_point_value,
            task_faction_slug=row.task_faction_slug,
            task_level_required=row.task_level_required,
        ),
    )


def _nudge_query(ctx: FeedContext) -> Select:
    """Nudges the viewer has RECEIVED (#1083).

    The feed is the nudge's only delivery. ``Nudge.praxis_id`` is the praxis
    the recipient owes.

    Lives exactly as long as the obligation: open praxis AND the recipient's
    member row unfiled (#1301) — both needed — mirroring ``send_nudge``'s
    write-time check. No other-member clause (#1980): for a duel the sender
    isn't a member at all.
    """
    sender = aliased(Character)
    query = (
        select(
            Nudge.id,
            Nudge.created_at,
            Nudge.praxis_id,
            Nudge.from_character_id,
            Praxis.type.label("praxis_type"),
            Task.title.label("task_title"),
            Task.point_value.label("task_point_value"),
            Task.primary_faction_slug.label("task_faction_slug"),
            sender.display_name.label("from_display_name"),
            sender.faction_slug.label("from_faction_slug"),
            sender.avatar_url.label("from_avatar_url"),
        )
        .join(Praxis, Nudge.praxis_id == Praxis.id)
        .join(Task, Praxis.task_id == Task.id)
        .join(sender, Nudge.from_character_id == sender.id)
        # INNER: the nudge retires with the recipient's membership.
        .join(
            PraxisMember,
            and_(
                PraxisMember.praxis_id == Nudge.praxis_id,
                PraxisMember.character_id == Nudge.to_character_id,
            ),
        )
        .where(
            Nudge.to_character_id == ctx.character_id,
            PraxisMember.has_submitted.is_(False),
            Praxis.status.in_([PraxisStatus.in_progress, PraxisStatus.pending]),
        )
    )
    if ctx.before is not None:
        query = query.where(Nudge.created_at < ctx.before)
    return query.order_by(Nudge.created_at.desc()).limit(SUB_QUERY_LIMIT)


def _nudge_item(row: Any) -> ActivityFeedItemDC:
    return ActivityFeedItemDC(
        type=FEED_ITEM_TYPE_NUDGE,
        item_key=build_item_key(FEED_ITEM_TYPE_NUDGE, row.id),
        timestamp=row.created_at,
        actor_display_name=row.from_display_name,
        actor_faction_slug=row.from_faction_slug,
        actor_avatar_url=row.from_avatar_url,
        payload=NudgePayload(
            nudge_id=row.id,
            praxis_id=row.praxis_id,
            # 'solo' for a duel side (ADR-0011), same as `awaiting_submission`.
            praxis_type=row.praxis_type.value,
            from_character_id=row.from_character_id,
            from_name=row.from_display_name,
            task_title=row.task_title,
            task_point_value=row.task_point_value,
            task_faction_slug=row.task_faction_slug,
        ),
    )


# The registry — one entry per feed type.

FEED_SOURCES: tuple[FeedSource, ...] = (
    FeedSource(
        item_type=FEED_ITEM_TYPE_VOTE_ON_MINE,
        filters=frozenset({FILTER_ALL, FILTER_YOUR_STUFF}),
        needs=frozenset(),
        query=_vote_query_factory(changed=False),
        to_item=_vote_item_factory(FEED_ITEM_TYPE_VOTE_ON_MINE),
        source_id_column=Vote.id,
    ),
    FeedSource(
        # Its own type so its key differs: under ``vote_on_mine:{id}`` a change
        # would arrive already archived. Still archivable.
        item_type=FEED_ITEM_TYPE_VOTE_CHANGED_ON_MINE,
        filters=frozenset({FILTER_ALL, FILTER_YOUR_STUFF}),
        needs=frozenset(),
        query=_vote_query_factory(changed=True),
        to_item=_vote_item_factory(FEED_ITEM_TYPE_VOTE_CHANGED_ON_MINE),
        source_id_column=Vote.id,
    ),
    FeedSource(
        item_type=FEED_ITEM_TYPE_FRIEND_COMPLETION,
        filters=frozenset({FILTER_ALL, FILTER_FRIENDS}),
        needs=frozenset({NEEDS_FRIEND_IDS}),
        query=_completions_query_factory(NEEDS_FRIEND_IDS),
        to_item=_completion_item_factory(FEED_ITEM_TYPE_FRIEND_COMPLETION),
        source_id_column=Praxis.id,
    ),
    FeedSource(
        item_type=FEED_ITEM_TYPE_FOE_TAUNT,
        filters=frozenset({FILTER_ALL, FILTER_FOES}),
        needs=frozenset(),
        query=_foe_taunts_query,
        to_item=_foe_taunt_item,
        source_id_column=TauntMessage.id,
    ),
    FeedSource(
        item_type=FEED_ITEM_TYPE_GLOBAL_TASK,
        filters=frozenset({FILTER_ALL, FILTER_GLOBAL}),
        needs=frozenset(),
        query=_global_tasks_query,
        to_item=_global_task_item,
        source_id_column=Task.id,
    ),
    FeedSource(
        item_type=FEED_ITEM_TYPE_ERA_ANNOUNCEMENT,
        filters=frozenset({FILTER_ALL, FILTER_GLOBAL}),
        needs=frozenset(),
        query=_era_announcements_query,
        to_item=_era_announcement_item,
        source_id_column=Era.id,
    ),
    FeedSource(
        item_type=FEED_ITEM_TYPE_COLLAB_INVITE,
        filters=frozenset({FILTER_ALL, FILTER_YOUR_STUFF, FILTER_REQUESTS}),
        needs=frozenset(),
        query=_collab_invites_query,
        to_item=_collab_invite_item,
        source_id_column=PraxisInvite.id,
    ),
    FeedSource(
        item_type=FEED_ITEM_TYPE_DUEL_CHALLENGE,
        filters=frozenset({FILTER_ALL, FILTER_YOUR_STUFF, FILTER_REQUESTS}),
        needs=frozenset(),
        query=_duel_challenges_query,
        to_item=_duel_challenge_item,
        source_id_column=Duel.id,
    ),
    FeedSource(
        item_type=FEED_ITEM_TYPE_FRIEND_SIGNUP,
        filters=frozenset({FILTER_ALL, FILTER_FRIENDS}),
        needs=frozenset({NEEDS_FRIEND_IDS, NEEDS_MY_TASK_IDS}),
        query=_friend_signups_query,
        to_item=_friend_signup_item,
        source_id_column=PraxisMember.id,
    ),
    FeedSource(
        item_type=FEED_ITEM_TYPE_COLLABORATOR_SUBMITTED,
        filters=frozenset({FILTER_ALL, FILTER_YOUR_STUFF}),
        needs=frozenset(),
        query=_collaborator_submitted_query,
        to_item=_collaborator_submitted_item,
        source_id_column=PraxisMember.id,
    ),
    FeedSource(
        # In REQUESTS: drives the Pending Requests panel and bell badge.
        item_type=FEED_ITEM_TYPE_AWAITING_SUBMISSION,
        filters=frozenset({FILTER_ALL, FILTER_YOUR_STUFF, FILTER_REQUESTS}),
        needs=frozenset(),
        query=_awaiting_submission_query,
        to_item=_awaiting_submission_item,
        source_id_column=PraxisMember.id,
    ),
    FeedSource(
        # Not REQUESTS: `awaiting_submission` already badges the same obligation.
        item_type=FEED_ITEM_TYPE_NUDGE,
        filters=frozenset({FILTER_ALL, FILTER_YOUR_STUFF}),
        needs=frozenset(),
        query=_nudge_query,
        to_item=_nudge_item,
        source_id_column=Nudge.id,
    ),
    FeedSource(
        # Answered, not read (#1419), so a request.
        item_type=FEED_ITEM_TYPE_INVITATION_LETTER,
        filters=frozenset({FILTER_ALL, FILTER_YOUR_STUFF, FILTER_REQUESTS}),
        needs=frozenset(),
        query=_invitation_letters_query,
        to_item=_invitation_letter_item,
        source_id_column=InvitationLetter.id,
    ),
    FeedSource(
        item_type=FEED_ITEM_TYPE_FRIEND_DEFECTION,
        filters=frozenset({FILTER_ALL, FILTER_FRIENDS}),
        needs=frozenset({NEEDS_FRIEND_IDS}),
        query=_friend_defections_query,
        to_item=_friend_defection_item,
        source_id_column=FactionDefectionHistory.id,
    ),
    FeedSource(
        item_type=FEED_ITEM_TYPE_FOE_COMPLETION,
        filters=frozenset({FILTER_ALL, FILTER_FOES}),
        needs=frozenset({NEEDS_FOE_IDS}),
        query=_completions_query_factory(NEEDS_FOE_IDS),
        to_item=_completion_item_factory(FEED_ITEM_TYPE_FOE_COMPLETION),
        source_id_column=Praxis.id,
    ),
    FeedSource(
        item_type=FEED_ITEM_TYPE_COMMENT_MENTION,
        filters=frozenset({FILTER_ALL, FILTER_YOUR_STUFF}),
        needs=frozenset(),
        query=_comment_mentions_query,
        to_item=_comment_item_factory(FEED_ITEM_TYPE_COMMENT_MENTION),
        source_id_column=Comment.id,
    ),
    FeedSource(
        # #2159. Not REQUESTS: a comment asks nothing of you.
        item_type=FEED_ITEM_TYPE_COMMENT_ON_MINE,
        filters=frozenset({FILTER_ALL, FILTER_YOUR_STUFF}),
        needs=frozenset(),
        query=_comments_on_mine_query,
        to_item=_comment_item_factory(FEED_ITEM_TYPE_COMMENT_ON_MINE),
        source_id_column=Comment.id,
    ),
)

# Registry membership per tab; what a view shows is ``_visible_types`` (ADR-0070).
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

FEED_ITEM_TYPES: frozenset[str] = frozenset(source.item_type for source in FEED_SOURCES)
ARCHIVABLE_ITEM_TYPES: frozenset[str] = FEED_ITEM_TYPES - NON_ARCHIVABLE_ITEM_TYPES

# Obligations: someone is waiting on an answer.
REQUEST_ITEM_TYPES: frozenset[str] = frozenset(FILTER_QUERIES[FILTER_REQUESTS])

# Tabs that are a stream of news, not a queue to clear.
STREAM_FILTERS: frozenset[str] = frozenset({FILTER_ALL, FILTER_YOUR_STUFF})


def _visible_types(
    active_filter: str, archived: bool, muted: frozenset[str] = frozenset()
) -> set[str]:
    """Which feed types this view may return — the one authority for both.

    ADR-0070: unanswered requests live in the queue, never the stream. They are
    dropped from live ``all``/``your_stuff`` here, not in ``FEED_SOURCES``,
    because the Archived view reads ``all`` and must still list them. Read
    ADR-0070 before "fixing" this.

    Fan-out and ``_sum_counts_for_tab`` both call this, so badge == list
    (ADR-0036). ``muted`` (#1047) is enforced here: request types are never
    muted, and the archive is never muted.
    """
    if archived:
        return set(FILTER_QUERIES[FILTER_ALL])
    types = set(FILTER_QUERIES[active_filter])
    if active_filter in STREAM_FILTERS:
        types -= REQUEST_ITEM_TYPES
    return types - (muted - REQUEST_ITEM_TYPES)


def _normalise_filter(feed_filter: Optional[str]) -> str:
    """An unknown or absent tab falls back to ``all``."""
    return feed_filter if feed_filter in FILTER_QUERIES else FILTER_ALL


def parse_item_key(item_key: str) -> tuple[str, int]:
    """Split an item key into ``(feed type, source row PK)``.

    Coded 400: unknown type and non-integer id are distinct codes.
    """
    item_type, separator, raw_id = item_key.partition(ITEM_KEY_SEPARATOR)
    if not separator or item_type not in FEED_ITEM_TYPES:
        raise_coded(
            400,
            ErrorCode.feed_item_key_unknown,
            f"Unknown feed item key: {item_key}",
            {"item_key": item_key},
        )
    try:
        source_id = int(raw_id)
    except ValueError:
        raise_coded(
            400,
            ErrorCode.feed_item_key_malformed,
            f"Malformed feed item key: {item_key}",
            {"item_key": item_key},
        )
    return item_type, source_id


def parse_archivable_item_key(item_key: str) -> tuple[str, int]:
    """``parse_item_key`` plus the one type that may never be archived.

    400, not silently accepted (see ``NON_ARCHIVABLE_ITEM_TYPES``).
    """
    item_type, source_id = parse_item_key(item_key)
    if item_type in NON_ARCHIVABLE_ITEM_TYPES:
        raise_coded(
            400,
            ErrorCode.feed_item_not_archivable,
            f"Feed items of type '{item_type}' cannot be archived: they track "
            "work still waiting on you and clear themselves once you file.",
            {"item_type": item_type},
        )
    return item_type, source_id


def _needs_satisfied(source: FeedSource, ctx: FeedContext) -> bool:
    """A source with an empty required context contributes nothing (guard)."""
    if NEEDS_FRIEND_IDS in source.needs and not ctx.friend_ids:
        return False
    if NEEDS_FOE_IDS in source.needs and not ctx.foe_ids:
        return False
    if NEEDS_MY_TASK_IDS in source.needs and not ctx.my_task_ids:
        return False
    return True


def _scoped_query(
    source: FeedSource,
    ctx: FeedContext,
    archive_view: FeedArchiveView,
) -> Optional[Select]:
    """The source's own query, narrowed to one side of the archive.

    ``None``: contributes nothing, no round trip. The archive predicate goes
    inside the Select, before ``LIMIT`` (see ``FeedSource``).
    """
    if not _needs_satisfied(source, ctx):
        return None
    dismissed_ids = archive_view.dismissed_source_ids.get(source.item_type, frozenset())
    query = source.query(ctx)
    if archive_view.archived_only:
        if not dismissed_ids:
            return None
        return query.where(source.source_id_column.in_(dismissed_ids))
    if not dismissed_ids:
        return query
    return query.where(source.source_id_column.notin_(dismissed_ids))


def _row_source_id(source: FeedSource, row: Any) -> Any:
    """Best-effort PK of a row whose mapper just failed — for the drop log only.

    Falls back to the first entity for sources selecting an ORM object.
    ponytail: a log line, not a contract; on ``None`` the ValidationError still
    names the field.
    """
    column_name = source.source_id_column.key
    if hasattr(row, column_name):
        return getattr(row, column_name)
    return getattr(row[0], column_name, None)


def _map_row(source: FeedSource, row: Any) -> Optional[ActivityFeedItemDC]:
    """One row → one item, or ``None`` if its payload does not validate (#1402).

    Fail-soft: one bad row is dropped loudly, not the whole page. Only
    ``ValidationError`` is caught — an ``AttributeError`` is a broken source and
    must surface. Counts don't drop with it (they never hydrate rows); the log
    is the alarm.
    """
    try:
        return source.to_item(row)
    except ValidationError as error:
        logger.error(
            "Dropping malformed feed item %s from the feed: %s",
            build_item_key(source.item_type, _row_source_id(source, row)),
            error,
        )
        return None


async def _run_source_fetch(
    source: FeedSource,
    ctx: FeedContext,
    archive_view: FeedArchiveView,
    session: AsyncSession,
) -> list[ActivityFeedItemDC]:
    """Run a source's query and map rows → items (the one ``to_item`` call site)."""
    query = _scoped_query(source, ctx, archive_view)
    if query is None:
        return []
    result = await session.execute(query)
    return [
        item
        for item in (_map_row(source, row) for row in result.all())
        if item is not None
    ]


async def _fetch_sources(
    sources: Sequence[FeedSource],
    ctx: FeedContext,
    archive_view: FeedArchiveView,
    session: AsyncSession,
) -> list[ActivityFeedItemDC]:
    """Every source's rows, one after another on the request's OWN session (#1532).

    Don't parallelise with a session per source: it exhausts the pool, and
    sequential on one warm connection measured 9× faster. Order is irrelevant;
    the caller sorts.
    """
    items: list[ActivityFeedItemDC] = []
    for source in sources:
        items.extend(await _run_source_fetch(source, ctx, archive_view, session))
    return items


async def _count_sources(
    sources: Sequence[FeedSource],
    ctx: FeedContext,
    archive_view: FeedArchiveView,
    session_factory: Callable,
) -> dict[str, int]:
    """Every source's COUNT in ONE round trip (ADR-0036, #1532).

    Each count wraps the source's own scoped Select, so badge == fan-out. A
    ``UNION ALL`` so badges never take a connection per source. ``None`` scopes
    are 0 without joining the union.
    """
    counts = {source.item_type: 0 for source in sources}
    branches = []
    for source in sources:
        query = _scoped_query(source, ctx, archive_view)
        if query is None:
            continue
        branches.append(
            select(
                literal(source.item_type, String).label("item_type"),
                func.count().label("count"),
            ).select_from(query.subquery())
        )
    if not branches:
        return counts
    async with session_factory() as session:
        result = await session.execute(union_all(*branches))
        for item_type, count in result.all():
            counts[item_type] = int(count)
    return counts


def _sum_counts_for_tab(
    tab: str, counts_by_type: dict[str, int], muted: frozenset[str] = frozenset()
) -> int:
    """Sum the per-source counts of every type the live ``tab`` would show (via
    ``_visible_types``)."""
    return sum(
        counts_by_type.get(item_type, 0)
        for item_type in _visible_types(tab, archived=False, muted=muted)
    )


async def _count_by_type(
    ctx: FeedContext,
    archive_view: FeedArchiveView,
    session_factory: Callable,
) -> dict[str, int]:
    """Every registry source's COUNT, in one statement (ADR-0036, #1532)."""
    return await _count_sources(FEED_SOURCES, ctx, archive_view, session_factory)


async def _compute_counts(
    fetch_ctx: FeedContext,
    archive_view: FeedArchiveView,
    session_factory: Callable,
    active_filter: str,
    muted: frozenset[str] = frozenset(),
) -> FeedCountsDC:
    """Badge counts, each derived from its source's own query (ADR-0036).

    Tab badges always count the live feed (unanswered requests, #1301), even
    on the Archived tab. ``by_type`` counts what the caller is viewing, so the
    Archived tab costs a second pass (#1419). The passes deliberately disagree;
    don't merge them. Neither applies the caller's type selection: a facet
    ignores its own axis, or ticking one type zeroes the rest.
    """
    live_ctx = replace(fetch_ctx, unanswered_requests_only=True)
    live_view = replace(archive_view, archived_only=False)

    if archive_view.archived_only:
        # Sequential: tests inject a factory returning the one request session.
        live_counts = await _count_by_type(live_ctx, live_view, session_factory)
        facet_counts = await _count_by_type(fetch_ctx, archive_view, session_factory)
    else:
        live_counts = await _count_by_type(live_ctx, live_view, session_factory)
        facet_counts = live_counts

    return FeedCountsDC(
        all=_sum_counts_for_tab(FILTER_ALL, live_counts, muted),
        friends=_sum_counts_for_tab(FILTER_FRIENDS, live_counts, muted),
        foes=_sum_counts_for_tab(FILTER_FOES, live_counts, muted),
        your_stuff=_sum_counts_for_tab(FILTER_YOUR_STUFF, live_counts, muted),
        global_count=_sum_counts_for_tab(FILTER_GLOBAL, live_counts, muted),
        # Effectively unmuted: `_visible_types` strips request types from
        # `muted` (#1047).
        requests=_sum_counts_for_tab(FILTER_REQUESTS, live_counts, muted),
        by_type={
            item_type: facet_counts.get(item_type, 0)
            for item_type in sorted(
                _visible_types(active_filter, archive_view.archived_only, muted)
            )
        },
    )


async def _build_fetch_context(
    character_id: int,
    session: AsyncSession,
    before_cursor: Optional[datetime],
    archived: bool,
) -> tuple[FeedContext, FeedArchiveView]:
    """The pre-fetch phase: everything a source's query needs, resolved once.

    Six sequential round trips, per call (the rail's panels share one, #1344).
    The level is a round trip on purpose (#2280): the metatask gate is a rule in
    :func:`character_sees_metatasks`, not to be restated in SQL.
    ``unanswered_requests_only`` follows live/archived only (see ``FeedContext``).
    """
    archive_view = await get_archive_view(character_id, session, archived_only=archived)
    friend_ids = tuple(await _get_related_ids(character_id, RelationshipType.friend, session))
    foe_ids = tuple(await _get_related_ids(character_id, RelationshipType.foe, session))
    my_task_ids = tuple(await _get_my_task_ids(character_id, session))
    era_row = await get_current_era_row(session)
    # No stats row this era = level 0.
    viewer_level = await session.scalar(
        select(CharacterStats.level).where(
            CharacterStats.character_id == character_id,
            CharacterStats.era_id == era_row.id,
        )
    )

    return (
        FeedContext(
            character_id=character_id,
            friend_ids=friend_ids,
            foe_ids=foe_ids,
            my_task_ids=my_task_ids,
            era_id=era_row.id,
            before=before_cursor,
            unanswered_requests_only=not archived,
            sees_metatasks=character_sees_metatasks(
                viewer_level or 0, era_config_for_key(era_row.config_key)
            ),
        ),
        archive_view,
    )


# The rail's activity panel is a glance; the requests side is a COUNT.
SIDEBAR_ACTIVITY_LIMIT = 5


async def get_sidebar_feed(
    character_id: int,
    session: AsyncSession,
    session_factory: Callable,
    muted: frozenset[str] = frozenset(),
) -> tuple[int, list[ActivityFeedItemDC], int]:
    """The rail's pending-request COUNT and its activity panel, in one pass.

    Returns ``(pending_requests_count, recent_activity, activity_count)``, the
    list newest-first and sliced to :data:`SIDEBAR_ACTIVITY_LIMIT`.

    Activity = the live ``all`` view minus obligations (#1556), via
    :func:`_visible_types`, so panel and Requests queue partition the feed
    exactly (ADR-0070). Requests are only a count (#1456), computed like
    ``counts.requests`` (pinned by
    ``test_sidebar_badge_equals_the_requests_queue_card_count``).

    ``activity_count`` is the pre-slice length (#1587) — no second pass. It is
    a floor: exact only below ``SUB_QUERY_LIMIT`` (each source caps there); the
    client shows "50+" at the cap (``ACTIVITY_COUNT_CAP`` in
    ``frontend/src/api/sidebar.ts``, test-pinned to this constant).
    """
    fetch_ctx, archive_view = await _build_fetch_context(
        character_id, session, before_cursor=None, archived=False
    )

    def sources_for(feed_filter: str) -> list[FeedSource]:
        # `muted` never reaches the request count (#1047).
        visible = _visible_types(feed_filter, archived=False, muted=muted)
        return [source for source in FEED_SOURCES if source.item_type in visible]

    recent_activity = await _fetch_sources(
        sources_for(FILTER_ALL), fetch_ctx, archive_view, session
    )
    request_counts = await _count_sources(
        sources_for(FILTER_REQUESTS), fetch_ctx, archive_view, session_factory
    )

    recent_activity.sort(key=lambda item: item.timestamp, reverse=True)
    return (
        sum(request_counts.values()),
        recent_activity[:SIDEBAR_ACTIVITY_LIMIT],
        len(recent_activity),
    )


async def get_activity_feed(
    character_id: int,
    session: AsyncSession,
    session_factory: Callable,
    feed_filter: Optional[str] = None,
    before_cursor: Optional[datetime] = None,
    limit: int = 20,
    archived: bool = False,
    item_types: Optional[list[str]] = None,
    muted_types: frozenset[str] = frozenset(),
) -> ActivityFeedResponseDC:
    """Fetch a unified activity feed for the given character.

    Args:
        character_id: The character requesting the feed.
        session: Database session for the pre-fetch phase (friend/foe/task IDs).
        session_factory: Callable that returns an async session context manager.
            Only for the badge ``UNION ALL`` (#1532). Tests override it to
            return the test session, so never gather the two passes.
        feed_filter: One of "all", "friends", "foes", "your_stuff", "global", "requests".
        before_cursor: ISO datetime cursor for pagination (items before this time).
        limit: Max items to return.
        archived: Return the archive instead; ignores tab type slicing.
        item_types: Intersected with the filter's set; unknown values ignored,
            empty means no constraint. Counts ignore it (see ``_compute_counts``).
        muted_types: Account's switched-off types (#1047); unlike
            ``item_types`` this moves the counts. Request types ignored.
    """
    active_filter = _normalise_filter(feed_filter)
    allowed_types = _visible_types(active_filter, archived, muted_types)
    requested_types = {
        item_type for item_type in (item_types or []) if item_type in FEED_ITEM_TYPES
    }
    if requested_types:
        allowed_types &= requested_types

    fetch_ctx, archive_view = await _build_fetch_context(
        character_id, session, before_cursor=before_cursor, archived=archived
    )

    allowed_sources = [s for s in FEED_SOURCES if s.item_type in allowed_types]

    # Two connections per page (#1532). Not gathered: see `session_factory`.
    all_items = await _fetch_sources(allowed_sources, fetch_ctx, archive_view, session)
    counts = await _compute_counts(
        fetch_ctx, archive_view, session_factory, active_filter, muted_types
    )

    all_items.sort(key=lambda item: item.timestamp, reverse=True)
    paginated = all_items[:limit]

    next_cursor = None
    if len(all_items) > limit:
        next_cursor = paginated[-1].timestamp.isoformat()

    return ActivityFeedResponseDC(
        items=paginated,
        counts=counts,
        next_cursor=next_cursor,
    )


# The archive. ADR-0070: archiving is view state, never a decision — only
# ``feed_dismissal`` is written; never touch ``Duel.status``/``PraxisInvite.status``.

# "Archive all" covers the feed's own window, emptying the tab and its badge.
ARCHIVE_ALL_LIMIT = len(FEED_SOURCES) * SUB_QUERY_LIMIT


async def get_archive_view(
    character_id: int,
    session: AsyncSession,
    archived_only: bool = False,
) -> FeedArchiveView:
    """Load this character's dismissals, pre-split by feed type.

    Unparseable keys are skipped: a stale dismissal must never break a feed.
    """
    result = await session.execute(
        select(FeedDismissal.item_key).where(
            FeedDismissal.character_id == character_id
        )
    )
    source_ids_by_type: dict[str, set[int]] = {}
    for item_key in result.scalars():
        item_type, separator, raw_id = item_key.partition(ITEM_KEY_SEPARATOR)
        if not separator or item_type not in FEED_ITEM_TYPES:
            continue
        try:
            source_id = int(raw_id)
        except ValueError:
            continue
        source_ids_by_type.setdefault(item_type, set()).add(source_id)

    return FeedArchiveView(
        dismissed_source_ids={
            item_type: frozenset(source_ids)
            for item_type, source_ids in source_ids_by_type.items()
        },
        archived_only=archived_only,
    )


async def _insert_dismissals(
    character_id: int,
    item_keys: list[str],
    session: AsyncSession,
) -> int:
    """Archive these keys; return how many rows were actually new.

    ``ON CONFLICT DO NOTHING``: idempotent, and no check-then-insert race into a 500.
    """
    if not item_keys:
        return 0
    statement = (
        postgres_insert(FeedDismissal)
        .values(
            [
                {"character_id": character_id, "item_key": item_key}
                for item_key in item_keys
            ]
        )
        .on_conflict_do_nothing(index_elements=["character_id", "item_key"])
    )
    result = await session.execute(statement)
    await session.flush()
    return int(result.rowcount or 0)


async def dismiss_feed_item(
    character_id: int,
    item_key: str,
    session: AsyncSession,
) -> bool:
    """Archive one feed item. Returns True if this call is what archived it.

    Idempotent: already archived returns False, not 409.
    """
    parse_archivable_item_key(item_key)
    return await _insert_dismissals(character_id, [item_key], session) > 0


async def restore_feed_item(
    character_id: int,
    item_key: str,
    session: AsyncSession,
) -> bool:
    """Take one feed item back out of the archive.

    Returns True if a dismissal row was actually removed.
    """
    parse_item_key(item_key)
    result = await session.execute(
        delete(FeedDismissal)
        .where(
            FeedDismissal.character_id == character_id,
            FeedDismissal.item_key == item_key,
        )
        .execution_options(synchronize_session=False)
    )
    await session.flush()
    return bool(result.rowcount)


async def dismiss_feed_items_for_filter(
    character_id: int,
    session: AsyncSession,
    session_factory: Callable,
    feed_filter: Optional[str] = None,
) -> int:
    """Archive everything the given filter would currently return. One call.

    Re-runs the visible feed so scope matches the tab. Non-archivable rows are
    skipped, not refused.
    """
    feed = await get_activity_feed(
        character_id=character_id,
        session=session,
        session_factory=session_factory,
        feed_filter=feed_filter,
        limit=ARCHIVE_ALL_LIMIT,
    )
    item_keys = [
        item.item_key for item in feed.items if item.type in ARCHIVABLE_ITEM_TYPES
    ]
    return await _insert_dismissals(character_id, item_keys, session)


async def restore_feed_items_for_filter(
    character_id: int,
    session: AsyncSession,
    feed_filter: Optional[str] = None,
) -> int:
    """Empty the archive, or the part of it belonging to one filter. One call.

    No filter restores everything (the Archived tab's case).
    """
    allowed_types = FILTER_QUERIES.get(
        feed_filter or FILTER_ALL, FILTER_QUERIES[FILTER_ALL]
    )
    statement = delete(FeedDismissal).where(FeedDismissal.character_id == character_id)

    if allowed_types != FILTER_QUERIES[FILTER_ALL]:
        archive_view = await get_archive_view(character_id, session)
        item_keys = [
            build_item_key(item_type, source_id)
            for item_type, source_ids in archive_view.dismissed_source_ids.items()
            if item_type in allowed_types
            for source_id in source_ids
        ]
        if not item_keys:
            return 0
        statement = statement.where(FeedDismissal.item_key.in_(item_keys))

    result = await session.execute(
        statement.execution_options(synchronize_session=False)
    )
    await session.flush()
    return int(result.rowcount or 0)
