from enum import StrEnum
from typing import Optional

from schemas.base import WireModel


class PickerStartStatus(StrEnum):
    authorization_needed = "authorization_needed"
    ready = "ready"


class PickerPollState(StrEnum):
    waiting = "waiting"
    picked = "picked"
    expired = "expired"


class PickerSessionStartOut(WireModel):
    """``authorization_needed``: open the authorize popup, then ask again.
    ``ready``: the other three fields are populated."""

    status: PickerStartStatus
    session_id: Optional[str] = None
    picker_uri: Optional[str] = None
    poll_interval_seconds: Optional[float] = None


class PickerPollOut(WireModel):
    state: PickerPollState


class GooglePhotosIngestIn(WireModel):
    session_id: str
