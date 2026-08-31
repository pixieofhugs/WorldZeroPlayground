"""Wire shapes for the account's notification preferences (#1047)."""

from pydantic import BaseModel

from schemas.base import WireModel


class NotificationPrefOut(WireModel):
    """One row's two switches, resolved — never the raw stored object.

    ``locked`` is sent rather than re-derived client-side. The rule behind it
    is "is this type in the requests section", and that set lives in
    ``FEED_SOURCES``; a client deriving it would be a second copy of a rule
    whose whole point (owner ruling 2026-08-19) is that a *tenth* request type
    cannot be silently unlocked.
    """

    #: "Show on Updates". Honoured for real — see ``muted_feed_types``.
    page: bool
    #: "Email me". STORED INTENT ONLY: nothing in ``backend/`` sends email.
    #: #2164 honours this when the channel exists. Do not add a sender.
    email: bool
    #: Whether ``page`` is the reader's to change. Locked ON for the three
    #: requests rows, locked OFF for ``level_up``, which has no feed row.
    locked: bool


class NotificationPrefsOut(WireModel):
    """Every row, keyed by event. Unset keys have already become defaults."""

    events: dict[str, NotificationPrefOut]


class NotificationPrefIn(BaseModel):
    """One row's two switches as a client sends them.

    Both required: this is a whole-row write, not a patch, so a client that
    sends half a row is a client that has lost track of the other switch.
    ``page`` on a locked row is accepted and then ignored — see ``apply_update``.
    """

    page: bool
    email: bool


class NotificationPrefsIn(BaseModel):
    """A save. Partial by row — a client may send one row or all nine.

    Keys the registry does not know are DROPPED rather than rejected: it keeps
    a hostile client from growing the column without bound, and it keeps a
    stale client naming a retired event from failing a preferences save.
    """

    events: dict[str, NotificationPrefIn]
