from fastapi import APIRouter

from game_config import CURRENT_ERA
from schemas.game_config import FactionConfigOut, GameConfigOut

router = APIRouter()


@router.get("", response_model=GameConfigOut)
async def get_game_config() -> GameConfigOut:
    """Return current era game configuration. No auth required."""
    factions = [
        FactionConfigOut(
            slug=faction.slug,
            name=faction.name,
            description=faction.description,
            is_selectable=faction.is_selectable,
            can_always_rejoin=faction.can_always_rejoin,
            own_task_modifier=faction.own_task_modifier,
            other_task_modifier=faction.other_task_modifier,
            collab_own_modifier=faction.collab_own_modifier,
            collab_other_modifier=faction.collab_other_modifier,
            duel_win_modifier=faction.duel_win_modifier,
            duel_loss_modifier=faction.duel_loss_modifier,
        )
        for faction in CURRENT_ERA.factions.values()
    ]

    return GameConfigOut(
        era_name=CURRENT_ERA.name,
        level_thresholds=list(CURRENT_ERA.level_thresholds),
        max_task_signups=CURRENT_ERA.max_task_signups,
        vote_budget_base=CURRENT_ERA.vote_budget_base,
        vote_budget_multiplier=CURRENT_ERA.vote_budget_multiplier,
        factions=factions,
    )
