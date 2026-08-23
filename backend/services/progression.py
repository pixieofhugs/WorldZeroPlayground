"""Which rungs of the level ladder a given account is allowed to be told about.

The ladder itself — ranks and the unlocks announced at each level — is era data
(``EraConfig.level_profiles``, values in ``eras/era_N.py``). This module owns the
*visibility* half of it, because era files own values and not who may see them
(#1891). Nothing here changes what a level does; it only changes what a caller
is told about it.
"""

from game_config import CURRENT_ERA, EraConfig, LevelProfile
from models.account import Account
from services.albescent_reveal import is_albescent_revealed

#: The one unlock key that names a secret society.
#:
#: Albescent is hidden until an account is revealed to it (ADR-0027, #390), and
#: ``/game-config`` announced its rung to everyone — including anonymous
#: visitors — which told a player the order exists before anything invited them
#: (#1891).
#:
#: This is announcement copy ONLY. The ability it describes is gated by
#: ``era.albescent_level_required`` through
#: :func:`services.character.can_start_as_albescent`, which reads the character's
#: level and never consults ``level_profiles``. Hiding the rung therefore cannot
#: withhold the ability: an unrevealed account that reaches the level still
#: becomes eligible, it just is not congratulated in the society's name.
#:
#: ponytail: a literal, not a per-faction registry. There is exactly one secret
#: society and exactly one unlock key that says its name. If a second era ever
#: hides a second faction, promote this to a set keyed off the hidden slugs
#: rather than growing a mechanism for a case that does not exist yet.
HIDDEN_UNTIL_REVEALED_UNLOCK_KEY = "join_albescent"


def visible_level_profiles(
    account: Account | None,
    era: EraConfig = CURRENT_ERA,
    *,
    is_admin: bool = False,
) -> list[LevelProfile]:
    """The era's level profiles with rungs this account may not be told about removed.

    Anonymous callers (``account is None``) are unrevealed by definition, so the
    public answer is the filtered one — fail closed.

    ``is_admin`` is passed through to the reveal seam, which treats an admin as
    revealed (#2400). Resolved by the caller: admin status is a DB row, and this
    function stays sync and session-free config filtering.

    Profiles are never dropped, only rungs: a level keeps its rank and its other
    unlocks, so the ladder stays index-aligned with ``era.level_thresholds`` and
    the level-up pop-up still fires at the level it always did.
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
