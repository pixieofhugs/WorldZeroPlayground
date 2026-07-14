from pydantic import BaseModel


class FactionConfigOut(BaseModel):
    slug: str
    name: str
    description: str
    can_always_rejoin: bool
    own_task_modifier: float
    other_task_modifier: float
    collab_own_modifier: float
    collab_other_modifier: float
    duel_win_modifier: float
    duel_loss_modifier: float


class LevelUnlockOut(BaseModel):
    # ADR-0031: emit a copy key, not prose. Frontend resolves
    # t('progression:unlocks.<key>.name' | '.desc'). kind stays (game data).
    kind: str
    key: str


class LevelProfileOut(BaseModel):
    # ADR-0031: rank_key resolves to t('progression:ranks.<rank_key>').
    rank_key: str
    unlocks: list[LevelUnlockOut]


class GameConfigOut(BaseModel):
    era_name: str
    level_thresholds: list[int]
    duel_level_required: int
    collaboration_level_required: int
    max_task_signups: int
    vote_budget_base: int
    vote_budget_multiplier: float
    factions: list[FactionConfigOut]
    level_profiles: list[LevelProfileOut]
