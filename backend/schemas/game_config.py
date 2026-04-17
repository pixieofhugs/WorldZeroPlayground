from pydantic import BaseModel


class FactionConfigOut(BaseModel):
    slug: str
    name: str
    description: str
    color: str
    is_selectable: bool
    can_always_rejoin: bool
    own_task_modifier: float
    other_task_modifier: float
    collab_own_modifier: float
    collab_other_modifier: float
    duel_win_modifier: float
    duel_loss_modifier: float


class GameConfigOut(BaseModel):
    era_name: str
    level_thresholds: list[int]
    max_task_signups: int
    vote_budget_base: int
    vote_budget_multiplier: float
    factions: list[FactionConfigOut]
