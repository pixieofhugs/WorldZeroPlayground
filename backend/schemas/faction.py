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


class InvitationLetterOut(BaseModel):
    faction_slug: str
    delivered_at: datetime

    model_config = {"from_attributes": True}


class FactionPageOut(BaseModel):
    current_faction_slug: str
    all_factions: list[FactionStatusOut]
    # #1384: the letters themselves, not just the "invited" status they imply.
    # A per-faction status row is the wrong home for a timestamp — delivered_at
    # is meaningless on a row reading "defected" — so the letters stay their own
    # list. They ride here because the query behind `all_factions` had already
    # read them; the deleted GET /factions/invitations re-ran it verbatim.
    invitations: list[InvitationLetterOut]
