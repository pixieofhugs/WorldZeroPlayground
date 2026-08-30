"""Schemas for the unified activity feed.

THE PAYLOAD CONTRACT (#1402)
----------------------------
``payload`` used to be ``dict[str, Any]`` carrying fifteen de-facto shapes that
were validated nowhere — the only written-down schema for them lived in the
frontend's ``normalizeFeedItem.ts``, which is how ``comment_mention`` managed to
render blank for its entire life (#1192). The shapes are declared here now, one
model per feed type, and ``services.activity_feed`` constructs them at the point
each row is mapped, so producer drift fails where the shape is produced rather
than in somebody's browser.

``extra="forbid"`` is the load-bearing half. A missing field is caught by the
field being required; an *added* one is caught only by forbidding extras, and an
added key is the likelier drift — someone tucks a value into the dict for a card
they are building and nothing anywhere notices.

Wire-compatibility is a hard requirement of this change: the field order below
reproduces each builder's dict insertion order, the types reproduce what the
columns already emit, and the frontend needed no changes. The enum-backed fields
(``invite_status``, ``duel_status``, ``praxis_type``, ``trigger_type``) are typed
``str`` rather than as their Enum on purpose — the builders pass ``.value`` and
that string IS the wire contract, so a builder that starts passing a raw enum
member should fail validation, not silently serialise the same way.
"""
from datetime import datetime
from typing import Annotated, Literal, Optional, Union

from pydantic import ConfigDict, Field, TypeAdapter, computed_field
from schemas.base import WireModel


class FeedPayloadBase(WireModel):
    """Shared config for every feed payload: closed, frozen, wire-shaped."""

    model_config = ConfigDict(extra="forbid", frozen=True)


class VoteOnMinePayload(FeedPayloadBase):
    """Someone voted on the viewer's praxis.

    ``value`` is the whole story the row needs: the "+N pts" it prints is the
    stars this voter gave, which is **exactly** what their vote added to the
    praxis (#2402). ``points_from_votes`` is a plain ``sum(Vote.value)`` and
    ``Contribution`` adds it *after* the faction and duel multipliers, so a
    single vote's contribution depends on nothing else — not the other votes,
    the author's faction, the task's points, a metatask or a duel.

    So this is a delta, not a total, and there is no ``points_earned`` here.
    #2199 put the praxis's whole score on this payload, filled by a second
    scoring pass, because the per-vote number then in use was *invented*
    (``value × task_point_value``, a product where the score is a sum, which
    announced 120 points against a praxis worth 34). The delta is not a
    restated formula though — it is the raw input the sum is over — so it
    cannot diverge from the scoring path the way that arithmetic did, and the
    pass that read the total is gone.
    """

    vote_id: int
    value: int
    praxis_id: int
    # Praxis.title is nullable in the model, so a praxis genuinely can have none.
    praxis_title: Optional[str] = None
    task_point_value: int


class CompletionPayload(FeedPayloadBase):
    """A friend or a foe submitted a praxis.

    ONE shape for TWO feed types. ``friend_completion`` and ``foe_completion``
    are built by the same ``_completion_item_factory`` off the same columns and
    differ only in which id list the query reads — so they are one payload model
    and two item variants, rather than a copy-paste pair that could drift apart
    while claiming to be the same card.
    """

    praxis_id: int
    praxis_title: Optional[str] = None
    task_title: str
    task_point_value: int
    task_faction_slug: str
    character_id: int


class FoeTauntPayload(FeedPayloadBase):
    """A taunt received from a foe.

    ADR-0031: a structured reference, never rendered prose — the frontend
    resolves the wording out of ``taunts.json`` from these four fields.
    """

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
    """A faction letter was delivered to the viewer.

    ADR-0038: the slug only — the card resolves the faction's name from
    ``factions.json``.
    """

    letter_id: int
    faction_slug: str


class FriendDefectionPayload(FeedPayloadBase):
    """A friend changed factions this era. ADR-0038: slugs only."""

    character_id: int
    old_faction_slug: str
    new_faction_slug: str


class CommentPayload(FeedPayloadBase):
    """Somebody commented, and it concerns the viewer.

    ONE shape for TWO feed types, on the same ground as ``CompletionPayload``.
    ``comment_mention`` fires when the comment names the viewer;
    ``comment_on_mine`` (#2159) fires when it sits on a praxis the viewer
    authored or is a member of. Both rows say the same six things about the same
    ``comment`` row and the frontend renders them from one branch, so a second
    model would be a copy-paste pair free to drift while claiming to be the same
    card. What differs between them is *which comments match*, and that lives in
    the two queries.

    Exactly one of ``praxis_id`` / ``task_id`` is set — ``num_nonnulls(...) = 1``
    is a DB CHECK (migration 0005), so both are Optional here and the client
    reads them in order without a tie-break. ``comment_on_mine`` is praxis-only
    (a task has no author to be commented at), so on that type ``task_id`` is
    always None — the field stays because the shape is shared, and the client
    already reads the two in order.
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
    # Has the READER filed their own part? Every other field here describes the
    # submitter, which left the renderer offering "Submit yours" to people who
    # already had (#2284) — a CTA into an editor that is closed, so it landed on
    # the praxis instead. The answer is the viewer's own ``PraxisMember``, one
    # join from a query that already selects that row, and it belongs on the
    # wire rather than inferred client-side because the client holds nothing to
    # infer it from.
    #
    # It gates the ACTION, not the row: a collaborator filing their part is news
    # either way, so unlike #2279's unanswerable invite this is a payload field
    # and not a predicate in the WHERE.
    #
    # Reads ``PraxisMember.has_submitted``, which since ADR-0079 means approval
    # of the live proposal rather than "my part is finished" (that is
    # ``is_done``). Approval is the right one: it is what the Submit control
    # sets, what ``awaiting_submission`` calls the viewer's turn, and what this
    # feed type already reports about the submitter — so all three agree.
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


#: Every payload shape the feed can carry. Fourteen models for seventeen types —
#: see ``CompletionPayload`` and ``CommentPayload``.
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
    """The fields every feed item carries, whatever its type.

    ``item_key`` is the item's stable identity, ``"{type}:{source row PK}"``.
    A feed item is derived from a UNION over 15 source tables and owns no row
    of its own, so this is the only handle a client can archive, restore, or
    de-duplicate against. It is stable across requests and across devices —
    see ``services.activity_feed.build_item_key``.

    Each variant below narrows ``type`` to its own literal and ``payload`` to its
    own model. Both are *redeclared*, not added, so the JSON key order is the one
    this base fixes and the wire is unchanged.
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
        """The faction this card's frame themes to (per-faction feed surface #12).

        Resolves the SPEC-faction-ui-profile.md §2 rule once, server-side, so the
        frontend frame dispatches on a single value: the actor's member faction,
        else the task's faction (task-context events like ``global_task`` carry no
        actor), else None — a neutral card (e.g. ``era_announcement``).

        ``getattr`` rather than a field, because only eight of the fourteen
        payloads carry a task: it is the typed spelling of the ``payload.get()``
        this used to be, and the six without a task still resolve to None.
        """
        return self.actor_faction_slug or getattr(self.payload, "task_faction_slug", None)


# --- One variant per feed type ----------------------------------------------
# The literals below are the same strings as ``services.activity_feed``'s
# ``FEED_ITEM_TYPE_*`` constants, which stay there because the registry is the
# authority on what types exist. ``Literal`` will not take a variable, so the
# two spellings are pinned together by
# ``test_every_registry_type_has_a_schema_variant`` rather than by an import.

class VoteOnMineItem(FeedItemBase):
    type: Literal["vote_on_mine"]
    payload: VoteOnMinePayload


class VoteChangedOnMineItem(FeedItemBase):
    """A voter went back and re-rated the viewer's praxis (#1712).

    Same payload as ``VoteOnMineItem`` — ``value`` is the vote that stands
    *now* — and deliberately no "changed from" fields: no prior value is
    stored, so the row can print what the vote is worth but never the size of
    the change. The two are distinct types rather than one type with
    a flag because the item KEY has to differ, so archiving the original cannot
    silence the change.
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
    """Somebody commented on a praxis the viewer authored or belongs to (#2159).

    Distinct from ``comment_mention`` rather than a flag on it, for the reason
    ``vote_changed_on_mine`` is distinct from ``vote_on_mine``: the item KEY has
    to differ or the two would share a ``FeedDismissal`` row. It also lets the
    player filter and archive "someone replied to me" separately from "someone
    named me", which is the whole point of the type facet.

    A comment that is BOTH is one row, not two — see ``_comments_on_mine_query``
    in the service, which withholds where a mention already speaks.
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


#: A single item in the activity feed: a discriminated union over ``type``.
#:
#: Discriminating on ``type`` — a field that was already on the wire — is what
#: makes this free: the JSON is byte-identical to the untyped version, and
#: OpenAPI publishes a ``oneOf`` with a discriminator map, so generated clients
#: get a union they can narrow with ``if (item.type === 'nudge')`` instead of the
#: hand-derived ``Record<string, any>`` the frontend reads today.
#:
#: This is an annotated alias, not a class — validate through
#: ``ACTIVITY_FEED_ITEM_ADAPTER`` where a bare ``.model_validate`` was used.
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
    """Badge counts for each filter tab, plus the per-type facet.

    The six scalars are **sidebar** numbers: they always describe the live feed,
    on every tab, including while the player is reading the Archived one.

    ``by_type`` is a **facet** and answers a different question: how many of
    each type are in the list currently on screen. It carries every type the
    current view could show — including zeros, which the client hides (epic
    #1419 decision 20) — and it is computed under every active axis *except*
    its own, so ticking one type never zeroes the rest.
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
    """The item's resulting archive state.

    ``archived`` is the state *after* the call, not whether the call changed
    anything: both endpoints are idempotent, so an undo strip that fires twice
    gets the same answer twice. ``changed`` reports whether a row moved, for
    clients that want to suppress a redundant toast.
    """

    item_key: str
    archived: bool
    changed: bool


class FeedBulkArchiveRequest(WireModel):
    """Archive or restore in bulk, scoped to one filter tab.

    ``filter`` names the tab the player is looking at — the same values the
    feed's own ``filter`` query param takes. Omitted means every type: on
    restore that empties the whole archive, which is what the Archived tab's
    "Restore all" means.
    """

    filter: Optional[str] = None


class FeedBulkArchiveResponse(WireModel):
    """How many items the bulk call moved."""

    count: int
    archived: bool
