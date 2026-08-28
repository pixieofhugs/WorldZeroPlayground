from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from db import get_db
from dependencies import account_has_admin_role, get_current_account_optional
from game_config import CURRENT_ERA
from models.account import Account
from schemas.game_config import (
    FactionConfigOut,
    GameConfigOut,
    LevelProfileOut,
    LevelUnlockOut,
)
from services.progression import visible_level_profiles

router = APIRouter()


@router.get("", response_model=GameConfigOut)
async def get_game_config(
    account: Account | None = Depends(get_current_account_optional),
    session: AsyncSession = Depends(get_db),
) -> GameConfigOut:
    # NOTE — this docstring ships verbatim to the PUBLIC ``/openapi.json``, so
    # it says what the route does without naming what it hides. The reason lives
    # in ``services.progression``, which does not ship (#1891).
    """Return current era game configuration.

    Optional auth — anonymous callers stay anonymous and get the public answer.
    The account is read only to decide which level-ladder rungs this caller may
    be told about (``services.progression.visible_level_profiles``).
    """
    # Deliberately outside the docstring, per the NOTE above: the reason a
    # moderation role is read here is #2400, and naming it publicly would name
    # what it unhides. `services.albescent_reveal` holds the reason.
    is_admin = account is not None and await account_has_admin_role(
        account.id, session
    )
    factions = [
        FactionConfigOut(
            slug=faction.slug,
            own_task_modifier=faction.own_task_modifier,
            other_task_modifier=faction.other_task_modifier,
            collab_own_modifier=faction.collab_own_modifier,
            collab_other_modifier=faction.collab_other_modifier,
            duel_win_modifier=faction.duel_win_modifier,
            duel_loss_modifier=faction.duel_loss_modifier,
            reads_the_array=faction.reads_the_array,
            takes_duel_ties=faction.takes_duel_ties,
        )
        for faction in CURRENT_ERA.factions.values()
    ]

    level_profiles = [
        LevelProfileOut(
            rank_key=profile.rank_key,
            unlocks=[
                LevelUnlockOut(kind=unlock.kind.value, key=unlock.key)
                for unlock in profile.unlocks
            ],
        )
        for profile in visible_level_profiles(account, is_admin=is_admin)
    ]

    return GameConfigOut(
        era_name=CURRENT_ERA.name,
        level_thresholds=list(CURRENT_ERA.level_thresholds),
        duel_level_required=CURRENT_ERA.duel_level_required,
        collab_auto_submit_days=CURRENT_ERA.collab_auto_submit_days,
        pending_task_admin_review_hours=CURRENT_ERA.pending_task_admin_review_hours,
        max_task_signups=CURRENT_ERA.max_task_signups,
        factions=factions,
        level_profiles=level_profiles,
    )
