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
    func,
    literal,
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
from services.praxis import praxis_visibility_condition
from models.character_stats import CharacterStats
from models.task import Task, TaskStatus, TaskType
from models.taunt_message import TauntMessage
from models.vote import Vote
from schemas.activity_feed import (
    AwaitingSubmissionPayload,
    CollabInvitePayload,
    CollaboratorSubmittedPayload,
    CommentMentionPayload,
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

    ``item_key`` is the item's stable identity — see ``build_item_key``.

    ``payload`` is one of the fourteen declared shapes (#1402), not a loose
    dict: the mapper that builds it is the producer, so that is where a drifted
    shape has to fail. This is the one place the service reaches for a Pydantic
    model rather than a dataclass — the payload *is* the contract with the
    client, and mirroring fourteen of them as dataclasses would buy nothing but
    a second place to drift.
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
    # The per-type facet: every type the *current* view could show, with the
    # number it would show. Already computed for the six badges above — this
    # publishes the numbers instead of throwing them away.
    by_type: dict[str, int] = field(default_factory=dict)


@dataclass(frozen=True)
class ActivityFeedResponseDC:
    """Frozen dataclass mirror of schemas.activity_feed.ActivityFeedResponse."""
    items: list[ActivityFeedItemDC]
    counts: FeedCountsDC
    next_cursor: Optional[str] = None


# --- Feed item types --------------------------------------------------------
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
FEED_ITEM_TYPE_COLLABORATOR_SUBMITTED = "collaborator_submitted"
FEED_ITEM_TYPE_AWAITING_SUBMISSION = "awaiting_submission"
FEED_ITEM_TYPE_NUDGE = "nudge"

# --- Item identity ----------------------------------------------------------
# A feed item is derived, never stored: the feed is a UNION read-model over 15
# source tables and owns no rows. Its identity is therefore borrowed from the
# row it was built out of — ``"{feed type}:{source row PK}"``.
#
# The type prefix is load-bearing, not decoration. Three types are built from
# ``praxis_member`` rows (friend_signup / collaborator_submitted /
# awaiting_submission) and two from ``praxis`` rows (friend_completion /
# foe_completion), so a bare PK is not unique across the feed.
#
# Every source's ``to_item`` reads that PK out of a column its query already
# selects — nothing here is derived from row position, offset, or timestamp,
# so the key of a given item is identical on every request until the source row
# is deleted. A dismissal keyed on it can never drift onto a different item.
ITEM_KEY_SEPARATOR = ":"


def build_item_key(item_type: str, source_id: int) -> str:
    """The stable identity of one feed item: its type plus its source row's PK."""
    return f"{item_type}{ITEM_KEY_SEPARATOR}{source_id}"


# ``awaiting_submission`` is *state*, not an event: it exists exactly while the
# viewer's ``PraxisMember.has_submitted`` is false, and clears itself the moment
# they file. A dismissal row would therefore silence a standing obligation
# permanently, so this one type is refused (epic #1192, decision 3).
NON_ARCHIVABLE_ITEM_TYPES: frozenset[str] = frozenset({FEED_ITEM_TYPE_AWAITING_SUBMISSION})

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

# How much of a mentioning comment the feed card quotes. The card shows the
# excerpt verbatim and does not re-truncate, so this number is the whole of what
# a reader sees before they open the thread.
COMMENT_EXCERPT_LENGTH = 140


@dataclass(frozen=True)
class FeedContext:
    """Everything a source's query needs, resolved once in the pre-fetch phase.

    ``unanswered_requests_only`` is the sole per-request axis, and it is a
    **live-feed** axis, not a per-tab one (#1301): every live tab windows the
    request types to the ones still awaiting an answer, because an answered
    request is not news — it is a thing that already happened, and leaving it on
    a live tab draws a card about a decision nobody has to make. Only the
    Archived view sets it False, so an item a player put away while it was
    pending is still listed after it resolves; nothing else lists it, so hiding
    it there would strand it.

    "Answered" is per type, because the four have four different notions of
    doneness (ADR-0070): a ``collab_invite`` / ``duel_challenge`` leaves
    ``pending``; an ``awaiting_submission`` is *state* and self-clears when the
    viewer files; an ``invitation_letter`` has no status column at all, so it is
    answered once the viewer is standing in that faction.

    ``sees_metatasks`` is the answer to
    :func:`services.meta_task.character_sees_metatasks` for this reader, carried
    as the resolved BOOLEAN rather than as a level integer (#2280). A source
    that held the integer would have to restate ``>= era.level_to_see_metatasks``
    to use it, which is the second copy of the threshold the shared predicate
    exists to prevent. Resolved here so the rule is read once per call, in
    Python, where the Albescent apply-bypass cannot be mistaken for it.
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

    ADR-0036: the ``query`` is the single authority for this type's ``WHERE``.
    The fan-out runs it and maps rows via ``to_item``; the badge count is
    ``COUNT`` over the very same (windowed) query. Adding a feed type is one
    entry in ``FEED_SOURCES`` — not six scattered edits.

    ``source_id_column`` is the PK column ``to_item`` builds the item key from.
    Naming it on the registry lets the archive filter be applied *in SQL*, once,
    for every source — so a dismissed row never eats a slot in the
    ``SUB_QUERY_LIMIT`` window (filtering after the fetch would silently shrink
    the page) and the badge count, which wraps the same query, drops with it.
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

    ``dismissed_source_ids`` maps a feed type to the source-row PKs this
    character has archived, pre-split by type so each source's query can filter
    on its own integer PK rather than on a string key.

    ``archived_only`` flips the whole feed over: ``False`` hides archived items
    (the live feed), ``True`` shows *only* them (the Archived tab). It is state,
    not a type-set, which is why it cannot ride ``FILTER_QUERIES``.

    ``eq=False`` so the dict field doesn't have to be hashable; this is a
    per-request carrier, never a key.
    """
    dismissed_source_ids: dict[str, frozenset[int]]
    archived_only: bool = False


EMPTY_ARCHIVE_VIEW = FeedArchiveView(dismissed_source_ids={}, archived_only=False)


# ---------------------------------------------------------------------------
# Pre-fetch helpers
# ---------------------------------------------------------------------------

async def _get_related_ids(
    character_id: int,
    rel_type: RelationshipType,
    session: AsyncSession,
) -> list[int]:
    """Get IDs of characters the current character has declared with this relationship type.

    Minus anyone the pair has blocked, in either direction: a blocked
    counterpart stops being a related character, which is how a block starves
    the four feed sources built from your declarations (ADR-0077). The
    exclusion is a subquery rather than a second round trip because the feed's
    statement count is pinned (``test_activity_feed_query_count``), and the
    declaration itself survives — unblocking restores the source with no
    further action.
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


# ---------------------------------------------------------------------------
# Per-source query builders + row mappers
#
# Each builder returns the windowed Select (ORDER BY + LIMIT) that IS the
# source of truth for its WHERE clause; the matching mapper turns one row into
# an ActivityFeedItemDC. Counts wrap the same Select in a COUNT subquery.
# ---------------------------------------------------------------------------

# A vote is a row that gets EDITED in place — ``cast_or_update_vote`` re-rates
# the existing row rather than inserting a second one — and the feed is a
# read-time projection over live rows (ADR-0023). So the two facts about a vote
# are two different pieces of news, and the vote table is partitioned between
# two sources on ``updated_at > created_at``:
#
#   * ``vote_on_mine``          — a vote as cast, never since touched.
#   * ``vote_changed_on_mine``  — a vote its voter went back and re-rated.
#
# The partition is exhaustive and disjoint, and that is the point (#1712).
# Leaving a re-rated vote in the first source is what let an already-read row
# silently restate a NEW number under its old headline: the author was told
# "+3", the voter moved to 5, and the same card just started saying "+5" with
# no event anywhere. A vote now leaves the cast stream at the moment it stops
# being true and reappears as its own item, timestamped when it moved.
_VOTE_WAS_CHANGED = Vote.updated_at > Vote.created_at


def _vote_query_factory(changed: bool) -> Callable[[FeedContext], Select]:
    """Build the cast-vote or changed-vote query — they differ only in time.

    Both select the identical row shape; ``changed`` picks which side of the
    partition to take and, with it, which timestamp *is* the news. A cast is
    news when it was cast; a change is news when it changed, so the cursor and
    the ORDER BY follow the same column the item's timestamp comes from.
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

    **Repeated changes to the same vote collapse into one notification thread.**
    The key is ``{type}:{vote.id}`` — per *vote*, not per *revision* — so a
    voter who changes their mind five times produces one changed-vote item that
    updates in place, not five cards. That is a deliberate trade, not an
    oversight: telling the five apart needs a revision column on ``Vote`` and a
    migration to carry it, and five cards saying the same person keeps moving
    the same number mostly reads as spam. One item, always showing the value
    that stands, is the thing the author actually needs to know.

    ponytail: the ceiling is that the item cannot say what the vote changed
    *from* — no prior value is stored anywhere, so the copy says "changed their
    vote" and prints the new total. The upgrade path is a ``previous_value``
    column on ``Vote`` set in ``cast_or_update_vote``, which would also let the
    row distinguish a raise from a drop. Same column would fix the one false
    positive here: an alt character re-rating with an IDENTICAL value still
    writes ``voter_character_id``, which moves ``updated_at`` and reads as a
    change (see the attribution note on ``uq_vote_praxis_account``).
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
                # The row prints `value` and nothing else (#2402). One vote's
                # contribution to the praxis total IS its star value —
                # `points_from_votes` is a plain `sum(Vote.value)` that
                # `Contribution` adds AFTER the multipliers — so this mapper
                # needs no total, no second pass and no arithmetic of its own.
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
                # The feed is a read-time projection (ADR-0023), and a projection
                # that forgets a visibility filter re-publishes what every other
                # door refuses. Both doors this used to bypass matter, because a
                # friend/foe edge is unilateral and instant — anyone can declare
                # you a foe and then read this source:
                #   * moderation `hidden` is "off the site entirely", stripped by
                #     `list_praxes` and 404'd by the detail route — but the
                #     `praxis_title` selected above shipped it verbatim, so
                #     whatever got a praxis taken down came back in the title.
                #   * a submitted side of a live duel is author-only until the
                #     seal (#999); this handed the opponent the title the detail
                #     route answers 404 for.
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

    A notification means "something happened since you last looked". For a
    character made this minute nothing has, so a task that was already on the
    board when they were created is not news to them and is not announced
    (owner ruling, #2225). Without this a new character's first bell was the
    whole task board, one row per task.

    Scoped to the CHARACTER, deliberately not the account: a second life on an
    old account starts as clean as the first one did.

    ``>=``, not ``>``. Postgres's ``now()`` is the *transaction* timestamp, so a
    character and a task written in one transaction carry the identical stamp —
    a strict comparison would silence genuine news to save nothing.

    A correlated scalar subquery rather than a sixth pre-fetch round trip: the
    predicate belongs to this source's WHERE (ADR-0036), so it rides the badge
    ``COUNT`` too, and the feed's pinned statement count does not move for it.

    There is no cap on the remainder. Capping the backlog at N most recent was
    considered and rejected on #2225 — it still delivers noise, and the number
    would be arbitrary.

    A metatask is not a feed type of its own — it is a ``Task`` row with
    ``task_type == metatask`` — so it arrives here with everything else, and
    until #2280 it was announced to readers for whom the metatask list does not
    open. Withheld below ``ctx.sees_metatasks``, and withheld HERE for the
    ``_collab_invites_query`` reason (#2279): ``_count_sources`` wraps this same
    Select, so the bell's number drops with the card in one edit (ADR-0036).
    Dropping it in the renderer would leave the badge counting a card nothing
    draws.

    **Level only — no faction predicate, deliberately.** Since #2295/#2282
    ``metatask_faction_slug`` records who *authored* a metatask, not who may use
    one; ADR-0029 removed that gate. A Cozy Coven reader hearing about a
    Warriors of Whimsy metatask is correct, and re-adding a faction clause here
    would put the removed gate back.
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
    # The era's display name comes from its CONFIG, resolved through the row's
    # own config_key (#1623) — not from the Era.name column, and not from
    # CURRENT_ERA. This query emits announcements for PAST eras too, so
    # CURRENT_ERA would relabel Era 1's historical announcement with Era 2's
    # name the day Metamorphosis starts.
    #
    # The stored name is the fallback for a config_key with no config left:
    # a deleted era file, or a row written by a newer version. An old
    # announcement showing the name it shipped under beats showing "era_1".
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

    "Unanswered" is TWO conditions, not one (#2279). The invite's own status
    says nobody has replied; it does not say a reply is still possible. Once the
    room is submitted, ``respond_to_invite`` refuses the accept with
    ``invite_praxis_submitted`` — so a pending invite onto a submitted praxis is
    a card whose Accept button answers nothing, which is exactly the promise
    ``isQueueItem`` is written to keep from the other side.

    Suppressed HERE rather than in the renderer, and that placement is the whole
    point: ``_count_sources`` wraps this same Select, so the bell's number and
    the cards under it drop the invite in one edit (ADR-0036). Filtering in the
    frontend would leave the badge counting a card the queue will not draw.

    Declining stays possible in principle, but is not worth a card: the invite
    is inert either way, and nobody is waiting on the answer.
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

    A letter is the one request type with no status column, because until #1419
    it was never a thing you answered. ADR-0070 reads "answered" off the
    character instead: standing in that faction *is* the acceptance, so on the
    live feed a letter for the faction you already hold asks you for nothing.
    The viewer's slug rides as a scalar subquery rather than a sixth pre-fetch
    round trip — one column, one row, resolved by the same statement.
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
    # ADR-0038: emit the faction slug only — the frontend card resolves the
    # faction name from factions.json (factionName(faction_slug)).
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
    # ADR-0038: emit faction slugs only — the frontend resolves both faction
    # names from factions.json (factionName(<slug>)).
    return ActivityFeedItemDC(
        type=FEED_ITEM_TYPE_FRIEND_DEFECTION,
        # The only source whose PK the payload does not already carry — the
        # query selects it, so the key is as stable as the other fourteen.
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


def _comment_mentions_query(ctx: FeedContext) -> Select:
    """Comments that @mention the current character (visible, non-withdrawn)."""
    query = (
        select(
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
        item_key=build_item_key(FEED_ITEM_TYPE_COMMENT_MENTION, row.id),
        timestamp=row.created_at,
        actor_display_name=row.author_display_name,
        actor_faction_slug=row.author_faction_slug,
        actor_avatar_url=row.author_avatar_url,
        payload=CommentMentionPayload(
            comment_id=row.id,
            # The commenter, so the card's actor can link to their character page
            # like every other actor-bearing type (#1196). Keyed "character_id"
            # to match friend_completion / friend_signup / friend_defection /
            # collaborator_submitted — the frontend reads one payload key for
            # "whose name is this", not a per-type spelling.
            character_id=row.author_character_id,
            # Exactly one of these is set: num_nonnulls(praxis_id, task_id) = 1 is
            # a DB CHECK (migration 0005), so the client can read them in order
            # without a tie-break.
            praxis_id=row.praxis_id,
            task_id=row.task_id,
            excerpt=row.body_text[:COMMENT_EXCERPT_LENGTH],
        ),
    )


def _collaborator_submitted_query(ctx: FeedContext) -> Select:
    """A collaborator submitted their part of a collab the viewer is also in (#571).

    PraxisMember rows with has_submitted=True on collab praxes the viewer is also
    a member of, excluding the viewer's own membership. Ordered by submitted_at —
    the moment their part landed, not when they joined.

    The viewer's own membership is joined rather than merely tested for (#2284).
    It was already half here — ``viewer_praxis_ids`` selected that row to prove
    the viewer belongs — so reading ``has_submitted`` off it costs the same
    round trip and answers the one question the payload could not: has the
    READER filed their part? Without it the card offered "Submit yours" to
    people who already had.

    A JOIN, not a correlated subquery, and not a predicate: the row must still
    appear when the viewer has submitted (that news is real either way), so the
    fact rides out on the payload and the CTA is what drops. The unique
    constraint on ``(praxis_id, character_id)`` makes the join one-to-one, so it
    cannot duplicate rows, and it subsumes the old membership test — a viewer
    with no member row now falls out of the INNER JOIN exactly as they fell out
    of the ``IN``.
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

    A ``PraxisMember`` for the viewer with ``has_submitted=False`` on a still-open
    (in_progress / mid-consensus pending) praxis that has **at least one other
    member** — i.e. it's their turn to post. The mirror of
    ``_collaborator_submitted_query`` (which surfaces *others'* submissions).
    Ordered by ``joined_at`` — when the praxis landed in the viewer's court
    (collab accept / duel accept both create the member row then).

    The last clause is membership, not type (#1980). Solo drafts have always been
    excluded — a praxis-in-progress you are alone on is your own draft, not an
    awaited action, so it is only badge noise — but the exclusion was written as
    ``type in (collab, duel)``, and a collab you created and never invited anyone
    to is a solo draft in every respect this rule cares about. It told its author,
    the instant they pressed save, that it was waiting on them. The EXISTS says
    the thing the type check was standing in for; it excludes solo praxes for
    free (they can only ever hold their author) and leaves duels alone, both
    sides of one being a ``solo`` praxis with a single member (ADR-0011).

    One-member collabs stay legal: creating one and inviting later is fine, and
    the item appears the moment the second member row lands. Nothing has to clean
    up when it goes the other way (a kick) — ``awaiting_submission`` is in
    ``NON_ARCHIVABLE_ITEM_TYPES`` precisely because it is state read live, with no
    stored row to retire.
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
    # No external actor — it's the viewer's own turn. actor_faction_slug=None so
    # the card frames to the task's faction (schema context_faction_slug fallback).
    return ActivityFeedItemDC(
        type=FEED_ITEM_TYPE_AWAITING_SUBMISSION,
        # Carries a key like every other type — the refusal to archive it is a
        # rule (NON_ARCHIVABLE_ITEM_TYPES), not an absence of identity.
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

    The nudge's whole delivery mechanism, and the only one it has ever had: the
    player-to-player ``Message`` model this was once weighed against had no
    player-facing reader and was deleted outright (#1375). The feed is where
    this game puts "someone did a thing involving you", and this row lands
    beside the ``awaiting_submission`` row the recipient already has for the
    same praxis.

    ``Nudge.praxis_id`` is always the praxis the RECIPIENT owes, so the join to
    ``Praxis``/``Task`` gives the card a title and a link the recipient can
    actually open — their own editor.

    A nudge is about an **obligation**, so it lives exactly as long as one: the
    predicate below is ``_awaiting_submission_query``'s open-and-unfiled pair,
    read through the recipient's own member row (#1301). It deliberately does not
    carry that query's "somebody else is here" clause (#1980) — the ``Nudge`` row
    IS somebody else, and for a duel the sender is not a member of the praxis
    they are nudging about at all. Both halves are load-bearing and neither
    subsumes the other — a collab stays ``in_progress`` while the group waits on
    somebody else, which is precisely when *this* member's nudge stops applying;
    and a member row can sit unfiled on a praxis that has since been published,
    which owes nobody anything. It is also the read-time mirror of what
    ``send_nudge`` checks at write time, so a nudge that could not be sent today
    cannot still be on screen from yesterday.
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
        # The recipient's own member row on the nudged praxis. An INNER join, so
        # a nudge whose recipient is no longer a member of that praxis retires
        # with the membership — there is nothing left for them to owe.
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
            # A duel side is `type='solo'` + a Duel row (ADR-0011), so this
            # reads 'solo' for a duel and the card badges off it the same way
            # `awaiting_submission` does — deliberately not re-deriving the duel
            # here, where the row it sits beside is the one that carries it.
            praxis_type=row.praxis_type.value,
            from_character_id=row.from_character_id,
            from_name=row.from_display_name,
            task_title=row.task_title,
            task_point_value=row.task_point_value,
            task_faction_slug=row.task_faction_slug,
        ),
    )


# ---------------------------------------------------------------------------
# The registry — one entry per feed type. Adding a type is one line here.
# ---------------------------------------------------------------------------

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
        # The other half of the vote partition. Same tabs, same payload, its own
        # item key — which is the whole reason it is a type rather than a
        # re-ordered query: ``FeedDismissal`` is unique on
        # ``(character_id, item_key)``, so a change resurfacing under
        # ``vote_on_mine:{id}`` would arrive already-archived for anyone who had
        # read the original. An event, not standing state, so it stays
        # dismissible — it is deliberately NOT in NON_ARCHIVABLE_ITEM_TYPES.
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
        # "Waiting on you to submit" — collab/duel praxes in the viewer's court.
        # In FILTER_REQUESTS so it drives the sidebar Pending Requests panel and
        # the mobile bell badge alongside incoming invites/challenges.
        item_type=FEED_ITEM_TYPE_AWAITING_SUBMISSION,
        filters=frozenset({FILTER_ALL, FILTER_YOUR_STUFF, FILTER_REQUESTS}),
        needs=frozenset(),
        query=_awaiting_submission_query,
        to_item=_awaiting_submission_item,
        source_id_column=PraxisMember.id,
    ),
    FeedSource(
        # A nudge received (#1083). ALL + YOUR_STUFF, deliberately NOT REQUESTS:
        # the obligation it refers to is already a `requests` row
        # (`awaiting_submission`) for the same praxis, so counting the poke there
        # too would badge one outstanding action twice — and a bell that
        # increments because someone pressed a button at you is the wrong shape
        # for a tab whose other members all want a decision.
        item_type=FEED_ITEM_TYPE_NUDGE,
        filters=frozenset({FILTER_ALL, FILTER_YOUR_STUFF}),
        needs=frozenset(),
        query=_nudge_query,
        to_item=_nudge_item,
        source_id_column=Nudge.id,
    ),
    FeedSource(
        # A faction letter is answered, not read (#1419 decision 9), so it joins
        # the other three request types in FILTER_REQUESTS — one edit here, and
        # FILTER_QUERIES / REQUEST_ITEM_TYPES both follow.
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
        to_item=_comment_mention_item,
        source_id_column=Comment.id,
    ),
)

# Which sub-queries each filter includes — derived from the registry so it can
# never drift from FEED_SOURCES. This is *registry* membership; what a given
# view actually shows is ``_visible_types``, which layers ADR-0070 on top.
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

# Every feed type the registry knows, and the subset a player may archive.
# Derived from FEED_SOURCES so neither can drift from the registry.
FEED_ITEM_TYPES: frozenset[str] = frozenset(source.item_type for source in FEED_SOURCES)
ARCHIVABLE_ITEM_TYPES: frozenset[str] = FEED_ITEM_TYPES - NON_ARCHIVABLE_ITEM_TYPES

# The four *obligations* among the fifteen: someone is waiting on an answer.
# Derived from the registry, so joining FILTER_REQUESTS is the only edit needed
# to make a type an obligation.
REQUEST_ITEM_TYPES: frozenset[str] = frozenset(FILTER_QUERIES[FILTER_REQUESTS])

# The two tabs that are a *stream* — a river of news you read and archive, as
# opposed to a pile you clear.
STREAM_FILTERS: frozenset[str] = frozenset({FILTER_ALL, FILTER_YOUR_STUFF})


def _visible_types(active_filter: str, archived: bool) -> set[str]:
    """Which feed types this view may return — the one authority for both.

    ADR-0070: **an unanswered obligation lives in the queue, never in the
    stream.** The four request types are dropped from the live ``all`` and
    ``your_stuff`` views here, as an explicitly-named axis *on top of* the
    registry — not by editing ``FEED_SOURCES``. That distinction is the whole
    subtlety: the Archived view reads ``filter=all`` with ``archived=true``, so
    a registry edit would take the four types out of the archive as well, where
    ADR-0070's archive rule says a request a player put away must still be
    findable.

    Anyone reading ``FEED_SOURCES`` alone will see the four types listed under
    ALL and conclude they belong there. They belong to the queue. Read ADR-0070
    before "fixing" this.

    Both the item fan-out and ``_sum_counts_for_tab`` call this, so the badge
    over a list can never disagree with the list (ADR-0036).
    """
    if archived:
        return set(FILTER_QUERIES[FILTER_ALL])
    types = set(FILTER_QUERIES[active_filter])
    if active_filter in STREAM_FILTERS:
        types -= REQUEST_ITEM_TYPES
    return types


def _normalise_filter(feed_filter: Optional[str]) -> str:
    """An unknown or absent tab falls back to ``all`` — a stale bookmark is not
    an error on a read projection."""
    return feed_filter if feed_filter in FILTER_QUERIES else FILTER_ALL


def parse_item_key(item_key: str) -> tuple[str, int]:
    """Split an item key into ``(feed type, source row PK)``.

    Raises a coded 400 on anything the registry does not recognise. The two
    diagnoses are separate codes, not one code with a ``context``: "no such feed
    type" and "that type with a non-integer id" are genuinely different
    failures, and a client that wants to distinguish a stale bookmark from a
    corrupted key can. Callers that need the "may this be archived?" rule as
    well should use ``parse_archivable_item_key``.
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

    ``awaiting_submission`` is refused rather than silently accepted: it is the
    viewer's own standing obligation and it clears itself the moment they file,
    so a dismissal row would hide it forever (epic #1192, decision 3). 400 —
    the key names a thing that exists, but archiving it is not a request the
    domain accepts.
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


def _scoped_query(
    source: FeedSource,
    ctx: FeedContext,
    archive_view: FeedArchiveView,
) -> Optional[Select]:
    """The source's own query, narrowed to one side of the archive.

    ``None`` means "this source cannot contribute anything" — either its
    pre-fetch context is empty, or the Archived view is asking for a type this
    character has archived nothing of. Both are answered without a round trip.

    The archive predicate is applied *inside* the source's Select, before its
    ``LIMIT``: filtering the mapped items afterwards would let dismissed rows
    consume slots in the ``SUB_QUERY_LIMIT`` window, and would leave the badge
    counts — which wrap this same Select in a COUNT — reading the unfiltered
    number.
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

    Reads the registry's own ``source_id_column`` name off the row, falling back
    to the first selected entity for the three sources that select a whole ORM
    object rather than columns. ponytail: a log line, not a contract. If it ever
    reads ``None`` the validation error still names the model that refused the
    shape and the field it refused, which is the actionable half.
    """
    column_name = source.source_id_column.key
    if hasattr(row, column_name):
        return getattr(row, column_name)
    return getattr(row[0], column_name, None)


def _map_row(source: FeedSource, row: Any) -> Optional[ActivityFeedItemDC]:
    """One row → one item, or ``None`` if its payload does not validate (#1402).

    THE FAIL-SOFT RULE (owner ruling, 2026-07-30). A payload shape that has
    drifted from its declared model is a bug in the producer, but the feed is a
    read projection of fifteen unrelated tables and one bad row must not be able
    to take the whole page down with it. So the item is dropped, loudly, and its
    fourteen siblings are served.

    Only ``ValidationError`` is caught. A mapper that raises ``AttributeError``
    because a query stopped selecting a column is not a malformed payload — it
    is a broken source, and swallowing it would hide an outage behind a quietly
    shorter list.

    The badge count does NOT drop with it: counts are ``COUNT`` over the same
    windowed Select (ADR-0036) and never hydrate a row, so they cannot know one
    failed to map. That is deliberate — a dropped item is an emergency, and
    making the numbers agree would mean paying full row hydration on every
    count, on every request, forever, to be accurate about a state that should
    not exist. The log is the alarm; the count is not.
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
    """Run a source's query and map rows → items.

    The single place ``to_item`` is called, which is why the malformed-payload
    drop lives here rather than in each of the fourteen mappers.
    """
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

    This used to be an ``asyncio.gather`` where each of the fifteen sources took
    its own session — and therefore its own pooled connection — from
    ``session_factory``. The pool holds fifteen connections in total, so a single
    page load asked for the entire pool and a second concurrent reader queued on
    ``pool_timeout``. Worse, the surplus above ``pool_size`` are *overflow*
    connections, discarded on return: most of the fan-out paid a fresh TCP
    connect and a fresh statement prepare, every request.

    Fifteen sequential statements on one warm connection measured **9× faster**
    than fifteen parallel ones on cold connections (20 ms vs 154 ms for one load
    against a local Postgres), and the gap only widens with the connection
    latency of a hosted database. The parallelism was buying nothing it did not
    first spend on getting a connection to be parallel on.

    Order is irrelevant: the caller sorts the merged list by timestamp.

    There is no post-pass. #2199 added one — a praxis fetch plus the whole
    scoring path — purely to stamp a total onto vote rows, and #2402 took the
    total off the row: what a vote notification prints is that voter's own star
    value, which the vote query already selects. Thirteen statements per page
    carrying a vote row went with it.
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

    Each count still wraps that source's OWN windowed Select in a subquery, so
    it respects the same WHERE, the same ``before`` cursor, the same
    ``SUB_QUERY_LIMIT`` window *and* the same archive filter as the fetch — the
    badge can never disagree with what the fan-out would return. An archive that
    doesn't move the numbers is a bug.

    What changed is only how they travel: a ``UNION ALL`` of
    ``SELECT '<type>', count(*)`` instead of one statement, one session and one
    pooled connection per source. Fifteen sources used to mean fifteen
    concurrent connections for numbers nobody reads a row of; the pool holds
    fifteen in total, so the badges alone could exhaust it (#1532).

    Sources whose pre-fetch context is empty — or which have nothing archived on
    the Archived tab — are answered as 0 without joining the union, exactly as
    they were answered without a round trip before.
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


def _sum_counts_for_tab(tab: str, counts_by_type: dict[str, int]) -> int:
    """Sum the per-source counts of every type the live ``tab`` would show.

    Membership comes from ``_visible_types``, the same function the item fan-out
    uses, so the ADR-0070 exclusion lands on the badge and the list together.
    """
    return sum(
        counts_by_type.get(item_type, 0)
        for item_type in _visible_types(tab, archived=False)
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
) -> FeedCountsDC:
    """Badge counts, each derived from its source's own query (ADR-0036).

    The six tab badges always count the **live** feed, never the archive: they
    are the sidebar's "what's waiting for you" numbers, and they stay truthful
    while the player is reading the Archived tab. Hence the forced
    ``archived_only=False`` — the caller's view flips the item fan-out, not the
    badges — and hence the single context: the live feed windows requests to
    unanswered on *every* tab (#1301), so one fan-out answers all six.
    Counting all statuses here while the tabs showed only pending is precisely
    the drift ADR-0036 exists to prevent: a badge reading 5 over a list of 3.

    ``by_type`` is the type **facet**, and it obeys a different rule, because it
    is drawn directly above the list rather than off in the sidebar. It counts
    whatever the caller is actually looking at — which on the Archived tab is
    the archive, and so costs a **second pass over the registry on that tab
    only** (#1419 decision 21). The two passes deliberately disagree; do not
    merge them and do not "optimise" this away. A facet number that
    contradicted the list under it is the same drift, one surface closer.
    Since #1532 each pass is a single UNION ALL, so the Archived tab pays two
    statements for its badges rather than thirty.

    Both are computed **without** the caller's type selection: a facet respects
    every axis except its own, which is what stops the trap where ticking one
    type zeroes the rest and leaves no way back (#1419 decision 19).
    """
    live_ctx = replace(fetch_ctx, unanswered_requests_only=True)
    live_view = replace(archive_view, archived_only=False)

    if archive_view.archived_only:
        # Sequential, not gathered: the two passes share ``session_factory``, and
        # tests inject one that hands back the single request session — which is
        # not safe under concurrent use. Two statements do not need a race.
        live_counts = await _count_by_type(live_ctx, live_view, session_factory)
        facet_counts = await _count_by_type(fetch_ctx, archive_view, session_factory)
    else:
        live_counts = await _count_by_type(live_ctx, live_view, session_factory)
        facet_counts = live_counts

    return FeedCountsDC(
        all=_sum_counts_for_tab(FILTER_ALL, live_counts),
        friends=_sum_counts_for_tab(FILTER_FRIENDS, live_counts),
        foes=_sum_counts_for_tab(FILTER_FOES, live_counts),
        your_stuff=_sum_counts_for_tab(FILTER_YOUR_STUFF, live_counts),
        global_count=_sum_counts_for_tab(FILTER_GLOBAL, live_counts),
        requests=_sum_counts_for_tab(FILTER_REQUESTS, live_counts),
        by_type={
            item_type: facet_counts.get(item_type, 0)
            for item_type in sorted(
                _visible_types(active_filter, archive_view.archived_only)
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

    Six sequential round trips — archive, friends, foes, my tasks, era, level —
    before a single feed row is read. That cost is per *call*, not per filter,
    which is why the rail's two panels share one call to this (#1344) rather
    than paying it twice for two slices of the same fan-out.

    The level is the sixth and newest (#2280), and it is a round trip on
    purpose. ``_global_tasks_query`` reaches for a correlated scalar subquery
    where it can — see ``character_born`` — but that trick only works for facts
    the WHERE can compare directly. The metatask gate is a *rule*
    (:func:`services.meta_task.character_sees_metatasks`), and expressing it in
    SQL would mean restating ``>= era.level_to_see_metatasks`` a second time,
    beside a same-numbered apply threshold that a faction perk bends and this
    one does not. One statement of the rule is worth one statement to the DB.
    ``era_config_for_key`` reads the era row already fetched above, so resolving
    the config costs nothing further.

    ``unanswered_requests_only`` follows the live/archived axis and nothing else.
    The pending window on invites and duel challenges is a live-feed rule, on
    every tab and not just ``requests`` (#1301): an answered request is no
    longer news anywhere. Only the Archived view sets it False — an archived
    invite that was since declined is still archived, and hiding it there would
    strand it, because nothing else lists it.
    """
    archive_view = await get_archive_view(character_id, session, archived_only=archived)
    friend_ids = tuple(await _get_related_ids(character_id, RelationshipType.friend, session))
    foe_ids = tuple(await _get_related_ids(character_id, RelationshipType.foe, session))
    my_task_ids = tuple(await _get_my_task_ids(character_id, session))
    era_row = await get_current_era_row(session)
    # A character with no stats row for this era has not started it, and starts
    # it at level 0 — below every gate, which is the right answer anyway.
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


# The rail's activity panel is a glance, not a list. The requests side has no
# limit constant any more: it is a COUNT, and a number has nothing to truncate.
SIDEBAR_ACTIVITY_LIMIT = 5


async def get_sidebar_feed(
    character_id: int,
    session: AsyncSession,
    session_factory: Callable,
) -> tuple[int, list[ActivityFeedItemDC], int]:
    """The rail's pending-request COUNT and its activity panel, in one pass.

    Returns ``(pending_requests_count, recent_activity, activity_count)``, the
    list newest-first and sliced to :data:`SIDEBAR_ACTIVITY_LIMIT`.

    WHAT THE PANEL CARRIES (#1556)
    ------------------------------
    The player's whole live feed **minus the obligations** — votes on their
    praxes, friend and foe completions, taunts, nudges, mentions, new global
    tasks, era announcements. It used to be the ``global`` tab alone (two
    sources), which meant the rail could not tell you that someone had just
    voted on your work.

    The exclusion is not a second predicate written here: this asks
    :func:`_visible_types` for the live ``all`` view, which is the ONE place
    ADR-0070's *an unanswered obligation lives in the queue, never in the
    stream* is implemented. The Requests queue on ``/updates`` is fed by the
    same function, so the panel and the queue partition the feed exactly — no
    item can fall into both, and none can fall out of both.

    Widening the fan-out from two sources to eleven is the cost, and it is paid
    the way :func:`_fetch_sources` documents: sequential statements on the
    request's own warm connection, never a connection per source. This is the
    same fan-out ``/updates`` already runs on its own load.

    WHY A COUNT AND NOT A LIST (#1456)
    ----------------------------------
    This used to hand back up to a hundred fully-hydrated request items so that
    three consumers — the collapsed rail handle, the mobile bell and the mobile
    FieldDesk — could each read ``.length``. Since #1423 nothing renders them:
    the Requests queue on ``/updates`` is the only surface a request can be
    answered on (ADR-0070). One integer is the whole of what is left.

    The two sides still do not share a fan-out, because they still do not
    overlap — that is ADR-0070 again, from the other direction. Requests are
    counted with :func:`_count_sources` (all four in one UNION ALL); activity is
    fetched with :func:`_fetch_sources`.

    WHY THE NUMBER CANNOT DRIFT FROM THE QUEUE
    ------------------------------------------
    It is the same computation ``counts.requests`` runs, from the same
    ``_visible_types`` authority and the same live context (ADR-0036): one COUNT
    per source, wrapping that source's own query so it inherits the same WHERE,
    the same ``SUB_QUERY_LIMIT`` window and the same archive filter. A badge that
    disagreed with the list under it is precisely what that ADR exists to
    prevent, and the equality is pinned by
    ``test_sidebar_badge_equals_the_requests_queue_card_count``.

    WHY THE ACTIVITY SIDE GETS A COUNT FOR FREE (#1587)
    ---------------------------------------------------
    The parallel note for the other side. The activity panel needed a number
    too — the mobile home's pending row says "12 notifications" — and the
    obvious way to get one is what this function does NOT do: a second pass,
    ``_count_sources`` over the *twelve* live ``all`` sources, on a first-wave
    request. It is not needed. :func:`_fetch_sources` takes no limit; it
    already returns every row from every source, and ``SIDEBAR_ACTIVITY_LIMIT``
    is a Python slice applied afterwards. **The length before that slice is the
    number**, from the same fetch, so ADR-0036 holds by construction rather
    than by assertion: the badge cannot disagree with the list because it IS
    the list.

    It is a floor, not always an exact total. Each source query stops at
    ``SUB_QUERY_LIMIT`` rows, so a player with more than that in one source is
    undercounted. The honest threshold falls out of the same arithmetic: a
    total **below** ``SUB_QUERY_LIMIT`` is provably exact, because no single
    source can have hit its cap while the sum is under it. The client shows the
    real number below the cap and a "50+" form at or above it — see
    ``ACTIVITY_COUNT_CAP`` in ``frontend/src/api/sidebar.ts``, which is pinned
    to this constant by a test rather than copied from it.
    """
    fetch_ctx, archive_view = await _build_fetch_context(
        character_id, session, before_cursor=None, archived=False
    )

    def sources_for(feed_filter: str) -> list[FeedSource]:
        visible = _visible_types(feed_filter, archived=False)
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
        archived: Return the character's archive instead of their live feed.
            Archived-ness is *state*, not type, so it cannot ride
            ``FILTER_QUERIES`` — it is a separate axis crossed with the filter.
            The archive deliberately ignores the friend/foe/global type slicing
            and returns everything archived: a player looking for something they
            put away should not have to remember which tab they put it away from.
        item_types: Narrow the fan-out to these feed types, intersected with the
            filter's own set — ``filter=friends`` + ``friend_signup`` is friend
            signups only. Values the registry does not know are **ignored**, and
            an empty selection means "no type constraint": this is a read
            projection, so a stale bookmark must degrade, never 4xx, and an
            empty multi-select can never mean "match nothing". Counts are
            computed without it (facet semantics — see ``_compute_counts``).
    """
    active_filter = _normalise_filter(feed_filter)
    allowed_types = _visible_types(active_filter, archived)
    requested_types = {
        item_type for item_type in (item_types or []) if item_type in FEED_ITEM_TYPES
    }
    if requested_types:
        allowed_types &= requested_types

    fetch_ctx, archive_view = await _build_fetch_context(
        character_id, session, before_cursor=before_cursor, archived=archived
    )

    allowed_sources = [s for s in FEED_SOURCES if s.item_type in allowed_types]

    # Two connections for the whole page (#1532): the request's own session runs
    # the fan-out, and the badge counts are one UNION ALL on a second. It was
    # ~31 — fifteen fetches, fifteen counts and this session — against a pool of
    # fifteen. Deliberately NOT gathered: tests inject a factory that hands back
    # the request session, and one AsyncSession is not safe under concurrent use.
    all_items = await _fetch_sources(allowed_sources, fetch_ctx, archive_view, session)
    counts = await _compute_counts(
        fetch_ctx, archive_view, session_factory, active_filter
    )

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


# ---------------------------------------------------------------------------
# The archive — reading and writing dismissals
#
# ADR-0070 / epic #1192: archiving is a *view state* and never a decision. Every
# function below writes exactly one thing, ``feed_dismissal``. An archived duel
# challenge is still open; an archived collab invite is still unanswered. If a
# change here ever needs to touch ``Duel.status`` or ``PraxisInvite.status``,
# the change is wrong.
# ---------------------------------------------------------------------------

# One "Archive all" covers everything the current filter would return, which is
# bounded by the same window the feed itself reads: SUB_QUERY_LIMIT rows per
# source. Beyond that window the tab's own badge count is already capped, so
# archiving exactly the window is what makes the tab read empty and the badge
# read zero.
ARCHIVE_ALL_LIMIT = len(FEED_SOURCES) * SUB_QUERY_LIMIT


async def get_archive_view(
    character_id: int,
    session: AsyncSession,
    archived_only: bool = False,
) -> FeedArchiveView:
    """Load this character's dismissals, pre-split by feed type.

    Keys that no longer parse — a type retired from the registry, or a row from
    an older key format — are skipped rather than raised on. A stale dismissal
    must never be able to break somebody's feed.
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

    ``ON CONFLICT DO NOTHING`` rather than read-then-write. Archiving is
    idempotent by contract — the undo strip can fire twice — and a check-then-
    insert leaves a window where two clicks race the unique constraint into a
    500. This is Postgres-specific, which the rest of the schema already is.
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

    Idempotent: archiving an already-archived item is a no-op returning False,
    not a 409.
    """
    parse_archivable_item_key(item_key)
    return await _insert_dismissals(character_id, [item_key], session) > 0


async def restore_feed_item(
    character_id: int,
    item_key: str,
    session: AsyncSession,
) -> bool:
    """Take one feed item back out of the archive.

    Returns True if a dismissal row was actually removed. Restoring puts the
    item back at its own position in the ordering for free: position comes from
    the source row's timestamp, which archiving never touched.
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

    Scope is defined by re-running the very feed the player is looking at, so
    "Archive all" can never drift from what the tab shows. ``awaiting_submission``
    rows are skipped, not refused: a bulk action that 400s because one
    unarchivable row happened to be on screen would be unusable.
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

    No filter restores everything, which is what the Archived tab wants: that
    tab ignores type slicing, so "Restore all" there means all of it.
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
