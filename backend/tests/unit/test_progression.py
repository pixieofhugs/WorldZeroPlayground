"""The ladder's visibility filter, ``visible_level_profiles`` (#1891)."""
from game_config import CURRENT_ERA, LevelProfile, LevelUnlock, LevelUnlockKind
from models.account import Account
from services.progression import (
    HIDDEN_UNTIL_REVEALED_UNLOCK_KEY,
    visible_level_profiles,
)


def _unlock_keys(profiles: list[LevelProfile]) -> set[str]:
    return {unlock.key for profile in profiles for unlock in profile.unlocks}


def _era_with(profiles: tuple[LevelProfile, ...]):
    from dataclasses import replace

    return replace(CURRENT_ERA, level_profiles=profiles)


def test_anonymous_caller_is_not_told_the_society_exists():
    assert HIDDEN_UNTIL_REVEALED_UNLOCK_KEY not in _unlock_keys(
        visible_level_profiles(None)
    )


def test_unrevealed_account_is_not_told_either():
    assert HIDDEN_UNTIL_REVEALED_UNLOCK_KEY not in _unlock_keys(
        visible_level_profiles(Account(albescent_revealed=False))
    )


def test_revealed_account_sees_the_whole_ladder_unchanged():
    served = visible_level_profiles(Account(albescent_revealed=True))
    assert served == list(CURRENT_ERA.level_profiles)


def test_the_live_era_really_does_carry_the_rung():
    """Guards the three tests above from passing vacuously."""
    assert HIDDEN_UNTIL_REVEALED_UNLOCK_KEY in _unlock_keys(
        list(CURRENT_ERA.level_profiles)
    )


def test_only_the_rung_goes_never_the_level():
    """Levels are positional: ``LevelUpWatcher`` indexes ``level_profiles[level]``."""
    served = visible_level_profiles(None)

    assert len(served) == len(CURRENT_ERA.level_profiles)
    for got, configured in zip(served, CURRENT_ERA.level_profiles):
        assert got.rank_key == configured.rank_key
        assert [unlock.key for unlock in got.unlocks] == [
            unlock.key
            for unlock in configured.unlocks
            if unlock.key != HIDDEN_UNTIL_REVEALED_UNLOCK_KEY
        ]


def test_a_level_whose_only_rung_is_hidden_still_announces_its_rank():
    """The pop-up must still fire. era_1 lacks this shape; a future era may not."""
    era = _era_with(
        (
            LevelProfile(rank_key="novice", unlocks=()),
            LevelProfile(
                rank_key="paragon",
                unlocks=(
                    LevelUnlock(
                        LevelUnlockKind.ability, HIDDEN_UNTIL_REVEALED_UNLOCK_KEY
                    ),
                ),
            ),
        )
    )

    served = visible_level_profiles(None, era)

    assert len(served) == 2
    assert served[1].rank_key == "paragon"
    assert served[1].unlocks == ()


def test_filtering_does_not_mutate_the_era():
    """The era is shared across requests; mutation would leak to the next one."""
    before = tuple(CURRENT_ERA.level_profiles)

    visible_level_profiles(None)
    visible_level_profiles(Account(albescent_revealed=True))

    assert CURRENT_ERA.level_profiles == before
    assert HIDDEN_UNTIL_REVEALED_UNLOCK_KEY in _unlock_keys(list(before))
