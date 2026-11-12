"""Activity feed schemas: one payload model per feed type (#1402).

``extra="forbid"`` catches added keys (the likelier drift). Field order is the
wire key order. Enum-backed fields are typed ``str`` on purpose: builders pass
``.value``, so a raw enum member should fail validation.
"""
from datetime import datetime
from typing import Annotated, Literal, Optional, Union

from pydantic import ConfigDict, Field, TypeAdapter, computed_field
from schemas.base import WireModel


class FeedPayloadBase(WireModel):
    model_config = ConfigDict(extra="forbid", frozen=True)


class VoteOnMinePayload(FeedPayloadBase):
    """Someone voted on the viewer's praxis.

    ``value`` is exactly the points the vote added (#2402): vote points are summed
    after the multipliers, so this is a delta, not a total. No ``points_earned``.
    """

    vote_id: int
    value: int
    praxis_id: int
    praxis_title: Optional[str] = None
    task_point_value: int


class CompletionPayload(FeedPayloadBase):
    """A friend or foe submitted a praxis; shared by both completion types."""

    praxis_id: int
    praxis_title: Optional[str] = None
    task_title: str
    task_point_value: int
    task_faction_slug: str
    character_id: int


class FoeTauntPayload(FeedPayloadBase):
    """A taunt from a foe; keys only, wording in ``taunts.json`` (ADR-0031)."""

    taunt_id: int
    faction_slug: str
    trigger_type: str
    from_character_id: int
    from_name: str
    to_name: str


class GlobalTaskPayload(FeedPayloadBase):
    """A task was activated."""

    task_id: int
    task_title: str
    task_point_value: int
    task_level_required: int
    task_faction_slug: str


class EraAnnouncementPayload(FeedPayloadBase):
    """A new era started."""

    era_id: int
    era_name: str
    era_notes: str
    config_key: str


class CollabInvitePayload(FeedPayloadBase):
    """Someone invited the viewer into a collab."""

    invite_id: int
    praxis_id: int
    task_title: str
    task_point_value: int
    task_faction_slug: str
    invite_status: str
    inviter_character_id: int
    task_level_required: int


class DuelChallengePayload(FeedPayloadBase):
    """Someone challenged the viewer to a duel (ADR-0011)."""

    duel_id: int
    challenger_praxis_id: int
    challenger_character_id: int
    task_title: str
    task_point_value: int
    task_faction_slug: str
    duel_status: str


class FriendSignupPayload(FeedPayloadBase):
    """A friend joined a task the viewer is also doing."""

    praxis_member_id: int
    character_id: int
    task_id: int
    task_title: str
    task_point_value: int
    task_faction_slug: str
    task_level_required: int


class InvitationLetterPayload(FeedPayloadBase):
    """A faction letter was delivered to the viewer. ADR-0038: slug only."""

    letter_id: int
    faction_slug: str


class FriendDefectionPayload(FeedPayloadBase):
    """A friend changed factions this era. ADR-0038: slugs only."""

    character_id: int
    old_faction_slug: str
    new_faction_slug: str


class CommentPayload(FeedPayloadBase):
    """A comment concerning the viewer; shared by ``comment_mention`` and
    ``comment_on_mine`` (#2159), which differ only in their queries.

    Exactly one of ``praxis_id``/``task_id`` is set (DB CHECK, migration 0005);
    ``comment_on_mine`` is praxis-only.
    """

    comment_id: int
    character_id: int
    praxis_id: Optional[int] = None
    task_id: Optional[int] = None
    excerpt: str


class CollaboratorSubmittedPayload(FeedPayloadBase):
    """A co-member filed their part of a collab the viewer is in (#571)."""

    praxis_member_id: int
    character_id: int
    praxis_id: int
    task_title: str
    task_point_value: int
    task_faction_slug: str
    # Has the READER filed (#2284)? Gates the "Submit yours" action, not the row.
    # ``has_submitted`` = approval of the live proposal (ADR-0079), not ``is_done``.
    viewer_has_submitted: bool


class AwaitingSubmissionPayload(FeedPayloadBase):
    """A collab/duel praxis waiting on the VIEWER's own submission."""

    praxis_member_id: int
    praxis_id: int
    praxis_type: str
    task_title: str
    task_point_value: int
    task_faction_slug: str
    task_level_required: int


class NudgePayload(FeedPayloadBase):
    """Someone poked the viewer to file their part (#1083)."""

    nudge_id: int
    praxis_id: int
    praxis_type: str
    from_character_id: int
    from_name: str
    task_title: str
    task_point_value: int
    task_faction_slug: str


#: Fewer models than types: see ``CompletionPayload`` and ``CommentPayload``.
FeedPayload = Union[
    VoteOnMinePayload,
    CompletionPayload,
    FoeTauntPayload,
    GlobalTaskPayload,
    EraAnnouncementPayload,
    CollabInvitePayload,
    DuelChallengePayload,
    FriendSignupPayload,
    InvitationLetterPayload,
    FriendDefectionPayload,
    CommentPayload,
    CollaboratorSubmittedPayload,
    AwaitingSubmissionPayload,
    NudgePayload,
]


class FeedItemBase(WireModel):
    """Fields every feed item carries.

    ``item_key`` = ``"{type}:{source row PK}"``, the only stable handle to archive
    or dedupe by (``build_item_key``). Variants redeclare ``type``/``payload`` so
    key order stays fixed by this base.
    """

    type: str
    item_key: str
    timestamp: datetime
    actor_display_name: Optional[str] = None
    actor_faction_slug: Optional[str] = None
    actor_avatar_url: Optional[str] = None
    payload: FeedPayload

    @computed_field  # type: ignore[prop-decorator]
    @property
    def context_faction_slug(self) -> Optional[str]:
        """Card frame faction: actor's, else task's, else None (faction UI spec §2).

        ``getattr`` because only some payloads carry a task.
        """
        return self.actor_faction_slug or getattr(self.payload, "task_faction_slug", None)


# Literals mirror ``FEED_ITEM_TYPE_*`` in ``services.activity_feed`` (Literal
# can't take a variable); pinned by test_every_registry_type_has_a_schema_variant.

class VoteOnMineItem(FeedItemBase):
    type: Literal["vote_on_mine"]
    payload: VoteOnMinePayload


class VoteChangedOnMineItem(FeedItemBase):
    """A voter re-rated the viewer's praxis (#1712).

    ``value`` is the vote now; no prior value is stored. A separate type so its
    item key differs and archiving the original can't silence it.
    """

    type: Literal["vote_changed_on_mine"]
    payload: VoteOnMinePayload


class FriendCompletionItem(FeedItemBase):
    type: Literal["friend_completion"]
    payload: CompletionPayload


class FoeCompletionItem(FeedItemBase):
    type: Literal["foe_completion"]
    payload: CompletionPayload


class FoeTauntItem(FeedItemBase):
    type: Literal["foe_taunt"]
    payload: FoeTauntPayload


class GlobalTaskItem(FeedItemBase):
    type: Literal["global_task"]
    payload: GlobalTaskPayload


class EraAnnouncementItem(FeedItemBase):
    type: Literal["era_announcement"]
    payload: EraAnnouncementPayload


class CollabInviteItem(FeedItemBase):
    type: Literal["collab_invite"]
    payload: CollabInvitePayload


class DuelChallengeItem(FeedItemBase):
    type: Literal["duel_challenge"]
    payload: DuelChallengePayload


class FriendSignupItem(FeedItemBase):
    type: Literal["friend_signup"]
    payload: FriendSignupPayload


class InvitationLetterItem(FeedItemBase):
    type: Literal["invitation_letter"]
    payload: InvitationLetterPayload


class FriendDefectionItem(FeedItemBase):
    type: Literal["friend_defection"]
    payload: FriendDefectionPayload


class CommentMentionItem(FeedItemBase):
    type: Literal["comment_mention"]
    payload: CommentPayload


class CommentOnMineItem(FeedItemBase):
    """A comment on a praxis the viewer authored or belongs to (#2159).

    Separate from ``comment_mention`` so item keys (``FeedDismissal``) differ. A
    comment that is both is one row (``_comments_on_mine_query``).
    """

    type: Literal["comment_on_mine"]
    payload: CommentPayload


class CollaboratorSubmittedItem(FeedItemBase):
    type: Literal["collaborator_submitted"]
    payload: CollaboratorSubmittedPayload


class AwaitingSubmissionItem(FeedItemBase):
    type: Literal["awaiting_submission"]
    payload: AwaitingSubmissionPayload


class NudgeItem(FeedItemBase):
    type: Literal["nudge"]
    payload: NudgePayload


#: Discriminated union over ``type``. An alias, not a class: validate via
#: ``ACTIVITY_FEED_ITEM_ADAPTER``.
ActivityFeedItem = Annotated[
    Union[
        VoteOnMineItem,
        VoteChangedOnMineItem,
        FriendCompletionItem,
        FoeCompletionItem,
        FoeTauntItem,
        GlobalTaskItem,
        EraAnnouncementItem,
        CollabInviteItem,
        DuelChallengeItem,
        FriendSignupItem,
        InvitationLetterItem,
        FriendDefectionItem,
        CommentMentionItem,
        CommentOnMineItem,
        CollaboratorSubmittedItem,
        AwaitingSubmissionItem,
        NudgeItem,
    ],
    Field(discriminator="type"),
]

ACTIVITY_FEED_ITEM_ADAPTER: TypeAdapter[ActivityFeedItem] = TypeAdapter(ActivityFeedItem)


class FeedCounts(WireModel):
    """Badge counts per filter tab, plus the per-type facet.

    Scalars always describe the live feed, even on the Archived tab. ``by_type``
    counts the current view, includes zeros, and ignores its own axis.
    """

    all: int = 0
    friends: int = 0
    foes: int = 0
    your_stuff: int = 0
    global_count: int = 0
    requests: int = 0
    by_type: dict[str, int] = Field(default_factory=dict)


class ActivityFeedResponse(WireModel):
    """Paginated activity feed with badge counts."""

    items: list[ActivityFeedItem]
    counts: FeedCounts
    next_cursor: Optional[str] = None


class FeedItemArchiveRequest(WireModel):
    """Archive or restore exactly one feed item, named by its stable key."""

    item_key: str


class FeedItemArchiveResponse(WireModel):
    """``archived`` is the state after the (idempotent) call; ``changed`` says
    whether a row moved."""

    item_key: str
    archived: bool
    changed: bool


class FeedBulkArchiveRequest(WireModel):
    """Bulk archive/restore scoped to a feed ``filter``; omitted = every type."""

    filter: Optional[str] = None


class FeedBulkArchiveResponse(WireModel):
    """How many items the bulk call moved."""

    count: int
    archived: bool
