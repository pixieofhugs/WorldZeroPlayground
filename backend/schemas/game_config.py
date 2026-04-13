from pydantic import BaseModel


class FactionConfigOut(BaseModel):
    slug: str
    name: str
    description: str
    color: str
    is_selectable: bool
    point_multiplier: float
    own_faction_multiplier: float
    other_faction_multiplier: float
    duel_bonus_multiplier: float


class GameConfigOut(BaseModel):
    era_name: str
    level_thresholds: list[int]
    max_task_signups: int
    vote_budget_base: int
    vote_budget_multiplier: float
    task_submit_level_gap: int
    factions: list[FactionConfigOut]
