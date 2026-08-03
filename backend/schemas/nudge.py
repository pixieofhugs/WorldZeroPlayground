"""Schemas for nudges (#1083)."""
from datetime import datetime
from typing import Optional

from schemas.base import WireModel


class NudgeOut(WireModel):
    """Confirmation that one nudge was recorded.

    The caller does not render this: the roster row's disabled state comes from
    ``PraxisMemberOut.nudged_at`` / ``DuelSideOut.nudged_at`` on the next read,
    so the button survives a reload. This exists so the POST has an honest body
    and so a client can show the sent-at time without a second round trip.
    """

    id: int
    praxis_id: int
    from_character_id: int
    to_character_id: int
    created_at: datetime

    model_config = {"from_attributes": True}


class NudgeResultOut(WireModel):
    """One recipient in, one entry out — the per-recipient outcome of a crew nudge.

    ``POST /praxes/{id}/nudge`` is deliberately partial-success, and unlike the
    media batch it is partial-success *by design rather than by accident*:
    :data:`services.nudge.NUDGE_COOLDOWN` is keyed on (sender → recipient →
    praxis), so on any given press some of the crew are inside their window and
    some are not. A response that were a bare list of survivors would leave the
    caller unable to tell "already poked an hour ago" from "not in the crew".

    Exactly one of ``nudge`` / ``error`` is populated. ``status_code`` carries
    the status the single-recipient route would have returned for that recipient
    (422 inside the cooldown or already filed, 403 not a member, 400 yourself) so
    the client can branch without parsing prose — the same idiom as
    :class:`schemas.praxis.MediaUploadResultOut`.

    Batch-wide verdicts are *not* entries: a missing praxis (404), a finished one
    (422) and an unauthorised sender (403) fail the whole request, because none
    of them is a fact about one recipient.
    """

    to_character_id: int
    nudge: Optional[NudgeOut] = None
    error: Optional[str] = None
    status_code: Optional[int] = None
