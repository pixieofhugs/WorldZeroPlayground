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
    """One side of a duel, shaped for the read page (#308).

    Display metadata + live vote points only — never the praxis body. A
    forfeited / unsubmitted side still renders (name, avatar) but ``is_submitted``
    is False; its body stays behind the normal in_progress 404 (ADR-0024).
    """
    praxis_id: Optional[int]
    character_id: int
    display_name: str
    faction_slug: str
    avatar_url: str
    points_from_votes: int
    is_submitted: bool
    # When the VIEWER last nudged this side's character about this side's praxis
    # (#1083), NULL once the 24h window lapses — the duel twin of
    # `PraxisMemberOut.nudged_at`, and the same server-owned disabled state.
    nudged_at: Optional[datetime] = None
    # What THIS side's faction multiplies the task's points by in this duel, per
    # outcome, resolved by ``services.scoring.compute_duel_multiplier`` (#2865).
    # The tie branch (#2664: the sole ``takes_duel_ties`` holder takes the tie)
    # arrives already resolved in ``tie_multiplier`` -- there is no separate flag
    # to compare. ADDITIVE beside the raw modifiers on /game-config.
    win_multiplier: float = 1.0
    loss_multiplier: float = 1.0
    tie_multiplier: float = 1.0


class DuelDetailOut(WireModel):
    """Read-oriented duel view: both sides' display info + tallies in one call."""
    id: int
    task_id: int
    status: DuelStatus
    forfeited_by_character_id: Optional[int]
    challenger: DuelSideOut
    opponent: DuelSideOut
    # Frozen outcome, populated once the duel is ``resolved`` at era close
    # (ADR-0052); NULL on live duels. A resolved surface renders these instead of
    # the live vote tally so the final standing never moves under the reader.
    # NULL winner on a resolved duel = tie, or no-contest (never became votable).
    winner_character_id: Optional[int] = None
    challenger_final_points: Optional[int] = None
    opponent_final_points: Optional[int] = None
