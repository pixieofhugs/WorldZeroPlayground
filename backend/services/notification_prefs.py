"""Per-ACCOUNT notification preferences (#1047) — the registry and its resolver.

Nine rows, two independent switches each (owner ruling 2026-08-19, which
supersedes #2153's exclusive three-segment control):

``page``
    "Show on Updates" — whether this event may appear in the activity feed.
    **Wired and honoured for real** (owner ruling 2026-08-31):
    :func:`muted_feed_types` feeds ``activity_feed._visible_types``, so the
    list, the tab badges and the sidebar panel all drop the type together.

``email``
    "Email me" — **stored intent only.** Nothing in ``backend/`` sends email:
    no provider, no sender, no queue, no template layer. This value is written
    and read back and does nothing else; #2164 honours it when the channel
    goes live, and the settings card says so in copy. Do NOT add a sender here.

WHY ONE JSONB COLUMN AND NOT A TABLE
------------------------------------
``account.notification_prefs`` is one JSONB, ``server_default '{}'``. Nothing
queries across accounts — a send already knows its recipient — so there is no
join to make cheap and no index to want. **Unset keys resolve to their default
here**, which is what makes adding a tenth event a code change with no
migration and no backfill: an account still holding ``{}`` resolves to every
default, including defaults invented after it was written.

THE LOCKS ARE DERIVED, NEVER LISTED
-----------------------------------
Two rows lock, for two different reasons, and both fall out of the registry:

1. **A requests row may never be suppressed** (owner ruling 2026-08-19). Its
   page switch is locked ON. Membership comes from
   ``activity_feed.REQUEST_ITEM_TYPES``, which is itself derived from
   ``FEED_SOURCES``, so a *tenth* request type cannot be silently unlocked by
   anyone adding it to ``FILTER_REQUESTS``. The rule is requests-section
   membership, not "does it involve me": ``comment_mention`` and
   ``comment_on_mine`` are deliberately not requests and stay disableable.

2. **A row with no feed type has nothing to show.** See ``LEVEL_UP`` below.

``awaiting_submission`` gets no row at all. It is the fourth requests type but
it is *state* rather than an event — the backend refuses to archive it — so
there is nothing to prefer.
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

#: The one row that is not backed by a feed type. ``level_up`` exists today
#: only as a *taunt* trigger aimed at other people; the owner ruled on
#: 2026-08-18 that it gets **no feed row**, because ``LevelUpPopup`` already
#: tells you at the moment it happens. So its page switch has nothing to
#: filter and renders locked OFF with the reason on the row — the same
#: locked-switch idiom the Privacy card and the three requests rows use,
#: rather than a live switch that would move and change nothing (the
#: false-affordance class #1263 named and the 2026-07-30 ruling forbids).
#: Its **email** switch is the whole point of the row and is fully free.
LEVEL_UP = "level_up"


@dataclass(frozen=True)
class NotificationEvent:
    """One row of the Notifications card.

    ``key`` is the stored JSONB key and the client's copy key — a stable
    identifier, not a feed type, because one row can own more than one type.
    """

    key: str
    #: Feed types the page switch filters. Empty means the row has no feed
    #: presence at all; see :data:`LEVEL_UP`.
    feed_types: tuple[str, ...]
    #: "Email me" starts on for the five things aimed at a person and off for
    #: the four that are ambient or high-frequency (owner ruling 2026-08-18):
    #: a praxis doing well is a dozen mails in an evening, the level-up popup
    #: already says it, and an era announcement goes to everybody at once.
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
    # One row, two types: a vote landing and a vote changing are both "someone
    # rated my praxis" to a reader, and splitting them would be a switch about
    # the storage rather than about the event.
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

    page: bool
    email: bool
    locked: bool


def _stored_bool(stored: Any, field: str, fallback: bool) -> bool:
    """Read one switch out of whatever the column happens to hold.

    Defensive rather than paranoid: the column is JSONB written by this app,
    but it is also the one column a hand-edited row or a rolled-back deploy can
    leave a shape in. Anything that is not a real boolean resolves to the
    default, which is exactly what an unset key does.
    """
    if not isinstance(stored, Mapping):
        return fallback
    value = stored.get(field)
    return value if isinstance(value, bool) else fallback


def resolve_prefs(raw: Any) -> dict[str, ResolvedPref]:
    """Every row's live values — the ONE reader of the stored column.

    An account holding ``{}`` (or ``None``, or junk) gets every default. A
    locked row's page value is pinned here rather than trusted from storage,
    so a stale write from before a type joined the requests section cannot
    suppress an obligation.
    """
    stored = raw if isinstance(raw, Mapping) else {}
    resolved: dict[str, ResolvedPref] = {}
    for event in NOTIFICATION_EVENTS:
        row = stored.get(event.key)
        resolved[event.key] = ResolvedPref(
            page=(
                event.page_default
                if event.page_locked
                else _stored_bool(row, "page", event.page_default)
            ),
            email=_stored_bool(row, "email", event.email_default),
            locked=event.page_locked,
        )
    return resolved


def muted_feed_types(raw: Any) -> frozenset[str]:
    """Feed types this account has turned off on the Updates page.

    A request type can never appear here — :attr:`NotificationEvent.page_locked`
    pins those on, so the bell's number and the Requests queue are untouchable
    by this whole file.
    """
    resolved = resolve_prefs(raw)
    return frozenset(
        feed_type
        for event in NOTIFICATION_EVENTS
        if not resolved[event.key].page
        for feed_type in event.feed_types
    )


def apply_update(raw: Any, incoming: Mapping[str, Mapping[str, bool]]) -> dict:
    """The new column value after a client write. Pure — the caller assigns it.

    The trust boundary, and the whole of the validation:

    * **Unknown keys are dropped.** A hostile client cannot grow this column
      without bound, and a stale client naming a retired event degrades instead
      of 400ing on a preferences save.
    * **A locked row's page value is ignored.** It is not the reader's to set,
      so accepting one would store a value that :func:`resolve_prefs` then
      overrides — a lie in the database.

    Every known key is written on every save, not just the ones that differ
    from their default. The column is nine small objects at worst, and a
    "sparse, defaults-only" store would silently re-flip a reader's explicit
    choice the day a default changes.
    """
    stored = dict(raw) if isinstance(raw, Mapping) else {}
    for key, values in incoming.items():
        event = EVENTS_BY_KEY.get(key)
        if event is None:
            continue
        current = stored.get(key)
        stored[key] = {
            "page": (
                event.page_default
                if event.page_locked
                else _stored_bool(values, "page", _stored_bool(current, "page", event.page_default))
            ),
            "email": _stored_bool(
                values, "email", _stored_bool(current, "email", event.email_default)
            ),
        }
    return stored
