from datetime import datetime
from typing import Optional
from schemas.base import WireModel
from models.duel import DuelStatus


class DuelChallengeIn(WireModel):
    """Body for POST /duels/challenge — attach a duel to an existing praxis."""
    challenger_praxis_id: int
    opponent_character_id: int


class DuelRespondIn(WireModel):
    """Body for POST /duels/{duel_id}/respond — accept or decline."""
    accept: bool


class DuelOut(WireModel):
    id: int
    task_id: int
    challenger_praxis_id: int
    opponent_character_id: int
    opponent_praxis_id: Optional[int]
    status: DuelStatus
    created_at: datetime

    model_config = {"from_attributes": True}


class DuelSideOut(WireModel):
    """One duel side for the read page (#308); never the praxis body (ADR-0024)."""
    praxis_id: Optional[int]
    character_id: int
    display_name: str
    faction_slug: str
    avatar_url: str
    points_from_votes: int
    is_submitted: bool
    # Duel twin of `PraxisMemberOut.nudged_at` (#1083).
    nudged_at: Optional[datetime] = None
    # This side's multiplier per outcome (``compute_duel_multiplier``, #2865);
    # ``tie_multiplier`` already resolves ``takes_duel_ties`` (#2664).
    win_multiplier: float = 1.0
    loss_multiplier: float = 1.0
    tie_multiplier: float = 1.0


class DuelDetailOut(WireModel):
    """Both sides' display info and tallies in one call."""
    id: int
    task_id: int
    status: DuelStatus
    forfeited_by_character_id: Optional[int]
    challenger: DuelSideOut
    opponent: DuelSideOut
    # Frozen at era close (ADR-0052); NULL while live. A resolved duel with a
    # NULL winner is a tie or no-contest.
    winner_character_id: Optional[int] = None
    challenger_final_points: Optional[int] = None
    opponent_final_points: Optional[int] = None
