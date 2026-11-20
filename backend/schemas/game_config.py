from schemas.base import WireModel


class FactionConfigOut(WireModel):
    # No prose (ADR-0038). No `can_always_rejoin`: the server answers joins (#1387).
    slug: str
    own_task_modifier: float
    other_task_modifier: float
    collab_own_modifier: float
    collab_other_modifier: float
    duel_win_modifier: float
    duel_loss_modifier: float
    # "The array" (#1869): a client-side perk, so the client needs the flag.
    reads_the_array: bool
    # "Take the tie" (#2664): `duelStakes` computes from it; never hardcode a slug.
    takes_duel_ties: bool


class LevelUnlockOut(WireModel):
    # ADR-0031: a copy key (progression:unlocks.<key>), not prose.
    kind: str
    key: str


class LevelProfileOut(WireModel):
    # ADR-0031: rank_key resolves to t('progression:ranks.<rank_key>').
    rank_key: str
    unlocks: list[LevelUnlockOut]


class GameConfigOut(WireModel):
    # Only fields with a frontend reader (#1387); vote budget: `VoteCastOut`.
    era_name: str
    # The live Era row; moves on every rollover, even one keeping the name.
    era_id: int
    # Latest dial flip (0 before any); with era_id, the client cache stamp (ADR-0072).
    rules_revision: int
    level_thresholds: list[int]
    duel_level_required: int
    collab_auto_submit_days: int
    # Copy states this window; never hardcode it (#1695).
    pending_task_admin_review_hours: int
    # Lowest level that sees a proposal before review (#3668).
    level_to_see_pending_tasks: int
    max_task_signups: int
    factions: list[FactionConfigOut]
    level_profiles: list[LevelProfileOut]
