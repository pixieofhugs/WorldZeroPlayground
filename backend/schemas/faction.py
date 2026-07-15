from datetime import datetime
from typing import Literal

from pydantic import BaseModel, Field


FactionMembershipStatus = Literal[
    "member", "invited", "not_invited", "defected", "can_return"
]


# ADR-0038: faction name/description prose is not emitted by the backend. The
# frontend resolves it from frontend/src/locales/en/factions.json by slug
# (factionName()/factionDescription()). These schemas carry slug + status only.
class FactionOut(BaseModel):
    slug: str
    status: str

    model_config = {"from_attributes": True}


class FactionChoiceRequest(BaseModel):
    faction_slug: str = Field(min_length=1, max_length=50)


class FactionStatusOut(BaseModel):
    slug: str
    status: FactionMembershipStatus


class FactionPageOut(BaseModel):
    current_faction_slug: str
    all_factions: list[FactionStatusOut]


class InvitationLetterOut(BaseModel):
    faction_slug: str
    delivered_at: datetime

    model_config = {"from_attributes": True}


class DefectionHistoryOut(BaseModel):
    faction_slug: str
    defected_at: datetime

    model_config = {"from_attributes": True}
