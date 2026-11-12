"""Which rungs of the era's level ladder an account may be told about (#1891).

Visibility only; what a level does is era data.
"""

from game_config import CURRENT_ERA, EraConfig, LevelProfile
from models.account import Account
from services.albescent_reveal import is_albescent_revealed

#: The unlock key naming Albescent, hidden until revealed (ADR-0027). Copy only:
#: the ability is gated by ``can_start_as_albescent``, which ignores
#: ``level_profiles``, so hiding the rung never withholds it.
#:
#: ponytail: a literal, not a per-faction registry. There is exactly one secret
#: society; make it a set keyed off hidden slugs if a second one appears.
HIDDEN_UNTIL_REVEALED_UNLOCK_KEY = "join_albescent"


def visible_level_profiles(
    account: Account | None,
    era: EraConfig = CURRENT_ERA,
    *,
    is_admin: bool = False,
) -> list[LevelProfile]:
    """The era's level profiles minus rungs this account may not be told about.

    Anonymous is unrevealed (fail closed); admins count as revealed (#2400).
    Only unlocks are dropped, never profiles, so the list stays index-aligned
    with ``era.level_thresholds``.
    """
    if is_albescent_revealed(account, is_admin=is_admin):
        return list(era.level_profiles)

    return [
        LevelProfile(
            rank_key=profile.rank_key,
            unlocks=tuple(
                unlock
                for unlock in profile.unlocks
                if unlock.key != HIDDEN_UNTIL_REVEALED_UNLOCK_KEY
            ),
        )
        for profile in era.level_profiles
    ]
