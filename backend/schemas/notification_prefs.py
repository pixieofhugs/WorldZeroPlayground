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
    #: Defaults to the email default; sent only to a device the player subscribed.
    by_push: bool
    #: ON for request rows, OFF for ``level_up`` (no feed row).
    locked: bool


class NotificationPrefsOut(WireModel):
    """Every row, keyed by event, defaults filled in."""

    events: dict[str, NotificationPrefOut]
    #: False when the server has no VAPID keys: Settings must say so.
    push_available: bool
    #: What the browser subscribes against; None exactly when push is unavailable.
    vapid_public_key: str | None


class NotificationPrefIn(BaseModel):
    """A whole-row write; locked values are ignored (``apply_update``)."""

    on_updates: bool
    by_email: bool
    #: Optional so a client that predates push keeps saving.
    by_push: bool | None = None


class NotificationPrefsIn(BaseModel):
    """A save, partial by row. Unknown keys are dropped, not rejected."""

    events: dict[str, NotificationPrefIn]
