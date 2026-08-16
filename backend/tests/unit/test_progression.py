"""The ladder's visibility filter (#1891).

Seam under test: :func:`services.progression.visible_level_profiles` — the one
place that decides which rungs a caller may be told about. The route is a
serializer over it, so everything worth asserting is assertable here without a
database.
"""
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
    """``/game-config`` needs no auth, so ``None`` is the widest audience."""
    assert HIDDEN_UNTIL_REVEALED_UNLOCK_KEY not in _unlock_keys(
        visible_level_profiles(None)
    )


def test_unrevealed_account_is_not_told_either():
    assert HIDDEN_UNTIL_REVEALED_UNLOCK_KEY not in _unlock_keys(
        visible_level_profiles(Account(albescent_revealed=False))
    )


def test_revealed_account_sees_the_whole_ladder_unchanged():
    """A revealed account's answer is the era's own tuple, rung for rung."""
    served = visible_level_profiles(Account(albescent_revealed=True))
    assert served == list(CURRENT_ERA.level_profiles)


def test_the_live_era_really_does_carry_the_rung():
    """Guards the three tests above from passing vacuously.

    If ``era_1`` ever drops ``join_albescent``, the "hidden" assertions would go
    green for the wrong reason and stop testing the filter at all.
    """
    assert HIDDEN_UNTIL_REVEALED_UNLOCK_KEY in _unlock_keys(
        list(CURRENT_ERA.level_profiles)
    )


def test_only_the_rung_goes_never_the_level():
    """Levels are positional: ``LevelUpWatcher`` indexes ``level_profiles[level]``.

    Dropping a profile would re-point every rank above it, so the filter must
    keep the list the same length and every rank_key in place.
    """
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
    """The pop-up must still FIRE at the level — an empty rung list is fine, a
    missing level is not. This is the shape era_1 does not currently have (the
    paragon level pairs the rung with a sense), pinned so a future era that
    isolates the rung does not silently lose a level."""
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
    """Era files own values. This module must project them, not edit them.

    ``EraConfig`` is a module-level constant shared by every request in the
    process, so a filter that mutated in place would hide the rung from the
    revealed account served next.
    """
    before = tuple(CURRENT_ERA.level_profiles)

    visible_level_profiles(None)
    visible_level_profiles(Account(albescent_revealed=True))

    assert CURRENT_ERA.level_profiles == before
    assert HIDDEN_UNTIL_REVEALED_UNLOCK_KEY in _unlock_keys(list(before))
