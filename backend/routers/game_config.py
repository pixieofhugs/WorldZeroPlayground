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
            color=faction.color,
            is_selectable=faction.is_selectable,
            point_multiplier=faction.point_multiplier,
            own_faction_multiplier=faction.own_faction_multiplier,
            other_faction_multiplier=faction.other_faction_multiplier,
            duel_bonus_multiplier=faction.duel_bonus_multiplier,
        )
        for faction in CURRENT_ERA.factions.values()
    ]

    return GameConfigOut(
        era_name=CURRENT_ERA.name,
        level_thresholds=list(CURRENT_ERA.level_thresholds),
        max_task_signups=CURRENT_ERA.max_task_signups,
        vote_budget_base=CURRENT_ERA.vote_budget_base,
        vote_budget_multiplier=CURRENT_ERA.vote_budget_multiplier,
        task_submit_level_gap=CURRENT_ERA.task_submit_level_gap,
        factions=factions,
    )
