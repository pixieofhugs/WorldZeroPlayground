"""Per-ACCOUNT notification preferences (#1047): registry and resolver.

Each row has two switches. ``on_updates`` is honoured
(:func:`muted_feed_types` → ``activity_feed._visible_types``). ``by_email`` is
**stored intent only**: nothing sends email yet (#2164). Do NOT add a sender here.

One JSONB column (no cross-account queries); unset keys resolve to defaults
here, so adding an event needs no migration.

Locks are derived, never listed: request rows (``REQUEST_ITEM_TYPES``) are
locked ON; rows with no feed type are locked OFF. ``awaiting_submission`` is
state, not an event, so it has no row.
"""

from dataclasses import dataclass
from typing import Any, Mapping

from services.activity_feed import (
    FEED_ITEM_TYPE_COLLAB_INVITE,
    FEED_ITEM_TYPE_COMMENT_MENTION,
    FEED_ITEM_TYPE_COMMENT_ON_MINE,
    FEED_ITEM_TYPE_DUEL_CHALLENGE,
    FEED_ITEM_TYPE_ERA_ANNOUNCEMENT,
    FEED_ITEM_TYPE_GLOBAL_TASK,
    FEED_ITEM_TYPE_INVITATION_LETTER,
    FEED_ITEM_TYPE_VOTE_CHANGED_ON_MINE,
    FEED_ITEM_TYPE_VOTE_ON_MINE,
    REQUEST_ITEM_TYPES,
)

#: No feed row (``LevelUpPopup`` covers it), so its page switch is locked OFF
#: rather than a false affordance (#1263); only email is free.
LEVEL_UP = "level_up"


@dataclass(frozen=True)
class NotificationEvent:
    """One row of the Notifications card. ``key`` is the JSONB + copy key (a row may own
    several feed types)."""

    key: str
    #: Empty = no feed presence; see :data:`LEVEL_UP`.
    feed_types: tuple[str, ...]
    #: On for person-directed events, off for ambient/high-frequency ones.
    email_default: bool

    @property
    def page_locked(self) -> bool:
        """Whether "show on Updates" is the reader's to change."""
        if not self.feed_types:
            return True  # nothing to show — locked OFF
        return bool(set(self.feed_types) & REQUEST_ITEM_TYPES)  # locked ON

    @property
    def page_default(self) -> bool:
        """Also the pinned value of a locked row: ON if it has a feed type."""
        return bool(self.feed_types)


#: The nine rows, in the order the card draws them.
NOTIFICATION_EVENTS: tuple[NotificationEvent, ...] = (
    NotificationEvent(
        key=FEED_ITEM_TYPE_DUEL_CHALLENGE,
        feed_types=(FEED_ITEM_TYPE_DUEL_CHALLENGE,),
        email_default=True,
    ),
    NotificationEvent(
        key=FEED_ITEM_TYPE_COLLAB_INVITE,
        feed_types=(FEED_ITEM_TYPE_COLLAB_INVITE,),
        email_default=True,
    ),
    NotificationEvent(
        key=FEED_ITEM_TYPE_INVITATION_LETTER,
        feed_types=(FEED_ITEM_TYPE_INVITATION_LETTER,),
        email_default=True,
    ),
    NotificationEvent(
        key=FEED_ITEM_TYPE_COMMENT_ON_MINE,
        feed_types=(FEED_ITEM_TYPE_COMMENT_ON_MINE,),
        email_default=True,
    ),
    NotificationEvent(
        key=FEED_ITEM_TYPE_COMMENT_MENTION,
        feed_types=(FEED_ITEM_TYPE_COMMENT_MENTION,),
        email_default=True,
    ),
    # One row, two types: both read as "someone rated my praxis".
    NotificationEvent(
        key=FEED_ITEM_TYPE_VOTE_ON_MINE,
        feed_types=(FEED_ITEM_TYPE_VOTE_ON_MINE, FEED_ITEM_TYPE_VOTE_CHANGED_ON_MINE),
        email_default=False,
    ),
    NotificationEvent(key=LEVEL_UP, feed_types=(), email_default=False),
    NotificationEvent(
        key=FEED_ITEM_TYPE_ERA_ANNOUNCEMENT,
        feed_types=(FEED_ITEM_TYPE_ERA_ANNOUNCEMENT,),
        email_default=False,
    ),
    NotificationEvent(
        key=FEED_ITEM_TYPE_GLOBAL_TASK,
        feed_types=(FEED_ITEM_TYPE_GLOBAL_TASK,),
        email_default=False,
    ),
)

EVENTS_BY_KEY: dict[str, NotificationEvent] = {
    event.key: event for event in NOTIFICATION_EVENTS
}


@dataclass(frozen=True)
class ResolvedPref:
    """One row's two switches, after defaults and locks have been applied."""

    on_updates: bool
    by_email: bool
    locked: bool


def _stored_bool(stored: Any, field: str, fallback: bool) -> bool:
    """Read one switch out of whatever the column happens to hold.

    Non-booleans (hand edits, rollbacks) resolve to the default.
    """
    if not isinstance(stored, Mapping):
        return fallback
    value = stored.get(field)
    return value if isinstance(value, bool) else fallback


def resolve_prefs(raw: Any) -> dict[str, ResolvedPref]:
    """Every row's live values — the ONE reader of the stored column.

    Junk resolves to defaults. Locked rows are pinned here, not trusted from storage.
    """
    stored = raw if isinstance(raw, Mapping) else {}
    resolved: dict[str, ResolvedPref] = {}
    for event in NOTIFICATION_EVENTS:
        row = stored.get(event.key)
        resolved[event.key] = ResolvedPref(
            on_updates=(
                event.page_default
                if event.page_locked
                else _stored_bool(row, "on_updates", event.page_default)
            ),
            by_email=_stored_bool(row, "by_email", event.email_default),
            locked=event.page_locked,
        )
    return resolved


def muted_feed_types(raw: Any) -> frozenset[str]:
    """Feed types this account has turned off on the Updates page.

    Never includes a request type (locked ON).
    """
    resolved = resolve_prefs(raw)
    return frozenset(
        feed_type
        for event in NOTIFICATION_EVENTS
        if not resolved[event.key].on_updates
        for feed_type in event.feed_types
    )


def apply_update(raw: Any, incoming: Mapping[str, Mapping[str, bool]]) -> dict:
    """The new column value after a client write. Pure — the caller assigns it.

    Trust boundary: unknown keys are dropped (no unbounded growth, stale clients
    don't 400); locked rows' page values are ignored. Saved values are stored
    explicitly so a later default change doesn't flip them.
    """
    stored = dict(raw) if isinstance(raw, Mapping) else {}
    for key, values in incoming.items():
        event = EVENTS_BY_KEY.get(key)
        if event is None:
            continue
        current = stored.get(key)
        stored[key] = {
            "on_updates": (
                event.page_default
                if event.page_locked
                else _stored_bool(
                    values,
                    "on_updates",
                    _stored_bool(current, "on_updates", event.page_default),
                )
            ),
            "by_email": _stored_bool(
                values,
                "by_email",
                _stored_bool(current, "by_email", event.email_default),
            ),
        }
    return stored
