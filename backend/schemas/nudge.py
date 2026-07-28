"""Schemas for nudges (#1083)."""
from datetime import datetime

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
