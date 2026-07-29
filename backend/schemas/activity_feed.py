"""Schemas for the unified activity feed."""
from datetime import datetime
from typing import Any, Optional

from pydantic import BaseModel, computed_field


class ActivityFeedItem(BaseModel):
    """A single item in the activity feed.

    The ``type`` field discriminates the payload shape:
    - vote_on_mine: someone voted on your submission
    - friend_completion: a friend completed a task
    - foe_taunt: a foe sent a taunt
    - global_task: a new task was activated
    - era_announcement: a new era started
    - collab_invite: someone invited you to collaborate
    - duel_challenge: someone challenged you to a duel
    - friend_signup: a friend signed up for a task you're doing
    - nudge: a collaborator or duel rival poked you to file your part

    ``item_key`` is the item's stable identity, ``"{type}:{source row PK}"``.
    A feed item is derived from a UNION over 15 source tables and owns no row
    of its own, so this is the only handle a client can archive, restore, or
    de-duplicate against. It is stable across requests and across devices —
    see ``services.activity_feed.build_item_key``.
    """

    type: str
    item_key: str
    timestamp: datetime
    actor_display_name: Optional[str] = None
    actor_faction_slug: Optional[str] = None
    actor_avatar_url: Optional[str] = None
    payload: dict[str, Any]

    @computed_field  # type: ignore[prop-decorator]
    @property
    def context_faction_slug(self) -> Optional[str]:
        """The faction this card's frame themes to (per-faction feed surface #12).

        Resolves the SPEC-faction-ui-profile.md §2 rule once, server-side, so the
        frontend frame dispatches on a single value: the actor's member faction,
        else the task's faction (task-context events like ``global_task`` carry no
        actor), else None — a neutral card (e.g. ``era_announcement``)."""
        return self.actor_faction_slug or self.payload.get("task_faction_slug")


class FeedCounts(BaseModel):
    """Badge counts for each filter tab."""

    all: int = 0
    friends: int = 0
    foes: int = 0
    your_stuff: int = 0
    global_count: int = 0
    requests: int = 0


class ActivityFeedResponse(BaseModel):
    """Paginated activity feed with badge counts."""

    items: list[ActivityFeedItem]
    counts: FeedCounts
    next_cursor: Optional[str] = None


class FeedItemArchiveRequest(BaseModel):
    """Archive or restore exactly one feed item, named by its stable key."""

    item_key: str


class FeedItemArchiveResponse(BaseModel):
    """The item's resulting archive state.

    ``archived`` is the state *after* the call, not whether the call changed
    anything: both endpoints are idempotent, so an undo strip that fires twice
    gets the same answer twice. ``changed`` reports whether a row moved, for
    clients that want to suppress a redundant toast.
    """

    item_key: str
    archived: bool
    changed: bool


class FeedBulkArchiveRequest(BaseModel):
    """Archive or restore in bulk, scoped to one filter tab.

    ``filter`` names the tab the player is looking at — the same values the
    feed's own ``filter`` query param takes. Omitted means every type: on
    restore that empties the whole archive, which is what the Archived tab's
    "Restore all" means.
    """

    filter: Optional[str] = None


class FeedBulkArchiveResponse(BaseModel):
    """How many items the bulk call moved."""

    count: int
    archived: bool
