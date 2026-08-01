"""Schemas for nudges (#1083, bulk nudge #1415)."""
from datetime import datetime
from typing import Optional

from pydantic import BaseModel


class NudgeOut(BaseModel):
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


class NudgeResultOut(BaseModel):
    """One recipient's outcome inside a bulk nudge.

    ``POST /praxes/{id}/nudge`` ("nudge the crew") is deliberately
    partial-success, the same idiom as ``MediaUploadResultOut``: the 24h
    cooldown in ``services.nudge.NUDGE_COOLDOWN`` is per
    (sender, recipient, praxis), so within one call some recipients are
    outside their window and some are still inside it — a single recipient's
    cooldown must not fail the whole crew. Exactly one of ``nudge`` / ``error``
    is populated.

    ``character_id`` identifies the recipient so the roster row that reads
    this back does not have to match on ``nudge``, which is absent on a skip.
    ``status_code`` carries the status the single-recipient route
    (``POST /praxes/{id}/nudge/{character_id}``) would have returned for that
    recipient — 422 for a still-cooling-down nudge — so the client can branch
    without parsing prose.
    """

    character_id: int
    nudge: Optional[NudgeOut] = None
    error: Optional[str] = None
    status_code: Optional[int] = None

    model_config = {"from_attributes": True}
