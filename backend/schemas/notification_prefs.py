"""Wire shapes for the account's notification preferences (#1047)."""

from pydantic import BaseModel

from schemas.base import WireModel


class NotificationPrefOut(WireModel):
    """One row's two switches, resolved.

    ``locked`` is sent, not derived client-side: its rule lives in ``FEED_SOURCES``.
    """

    #: Live; see ``muted_feed_types``.
    on_updates: bool
    #: Stored intent only; no email sender exists (#2164).
    by_email: bool
    #: ON for request rows, OFF for ``level_up`` (no feed row).
    locked: bool


class NotificationPrefsOut(WireModel):
    """Every row, keyed by event, defaults filled in."""

    events: dict[str, NotificationPrefOut]


class NotificationPrefIn(BaseModel):
    """A whole-row write; locked values are ignored (``apply_update``)."""

    on_updates: bool
    by_email: bool


class NotificationPrefsIn(BaseModel):
    """A save, partial by row. Unknown keys are dropped, not rejected."""

    events: dict[str, NotificationPrefIn]
