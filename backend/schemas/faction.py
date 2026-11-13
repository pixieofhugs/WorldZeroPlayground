from datetime import datetime
from typing import Literal

from pydantic import Field
from schemas.base import WireModel


FactionMembershipStatus = Literal[
    "member", "invited", "not_invited", "defected", "can_return"
]


# ADR-0038: slugs only; prose lives in locales/en/factions.json.
class FactionOut(WireModel):
    slug: str
    status: str

    model_config = {"from_attributes": True}


class FactionChoiceRequest(WireModel):
    faction_slug: str = Field(min_length=1, max_length=50)


class FactionStatusOut(WireModel):
    slug: str
    status: FactionMembershipStatus
    # Would the ACTIVE character's move be accepted now (`move_refusal`, #3168)?
    joinable: bool


class InvitationLetterOut(WireModel):
    faction_slug: str
    delivered_at: datetime

    model_config = {"from_attributes": True}


class FactionPageOut(WireModel):
    current_faction_slug: str
    all_factions: list[FactionStatusOut]
    # The letters themselves (#1384), from the same query as `all_factions`.
    invitations: list[InvitationLetterOut]
