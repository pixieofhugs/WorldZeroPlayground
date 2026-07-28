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
    """

    type: str
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
