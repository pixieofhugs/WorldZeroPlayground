"""Schemas for nudges (#1083)."""
from datetime import datetime
from typing import Optional

from schemas.base import WireModel


class NudgeOut(WireModel):
    """One recorded nudge. UI state comes from ``nudged_at`` on the next read."""

    id: int
    praxis_id: int
    from_character_id: int
    to_character_id: int
    created_at: datetime

    model_config = {"from_attributes": True}


class NudgeResultOut(WireModel):
    """Per-recipient outcome of a crew nudge; one of ``nudge``/``error``.

    Cooldown is per sender→recipient→praxis, so partial success is normal.
    ``status_code`` is the single route's answer (422/403/400), as in
    ``MediaUploadResultOut``. Batch-wide failures fail the whole request.
    """

    to_character_id: int
    nudge: Optional[NudgeOut] = None
    error: Optional[str] = None
    status_code: Optional[int] = None
