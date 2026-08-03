from schemas.base import WireModel


class FactionConfigOut(WireModel):
    # ADR-0038: no name/description — the frontend resolves faction prose from
    # frontend/src/locales/en/factions.json by slug.
    # NOT here: `can_always_rejoin` (#1387). It stays a LIVE rule on
    # `game_config.FactionConfig` — `services.faction_service` branches on it —
    # but the server already answers "may this life join?" itself, so no client
    # needs the raw flag.
    slug: str
    own_task_modifier: float
    other_task_modifier: float
    collab_own_modifier: float
    collab_other_modifier: float
    duel_win_modifier: float
    duel_loss_modifier: float


class LevelUnlockOut(WireModel):
    # ADR-0031: emit a copy key, not prose. Frontend resolves
    # t('progression:unlocks.<key>.name' | '.desc'). kind stays (game data).
    kind: str
    key: str


class LevelProfileOut(WireModel):
    # ADR-0031: rank_key resolves to t('progression:ranks.<rank_key>').
    rank_key: str
    unlocks: list[LevelUnlockOut]


class GameConfigOut(WireModel):
    # NOT here (#1387): `collaboration_level_required`, `vote_budget_base` and
    # `vote_budget_multiplier`. All three remain live `EraConfig` rules the
    # server enforces; none had a frontend reader. The vote budget in particular
    # is computed on read (ADR-0043) and surfaces on `VoteCastOut.viewer_stats`,
    # so the client never needs the formula's inputs.
    era_name: str
    level_thresholds: list[int]
    duel_level_required: int
    collab_auto_submit_days: int
    max_task_signups: int
    factions: list[FactionConfigOut]
    level_profiles: list[LevelProfileOut]
