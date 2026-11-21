"""#3707: the see gate is lifted by the apply-at-any-level perk, read from era.*."""

from dataclasses import replace

from game_config import CURRENT_ERA
from services.meta_task import character_sees_metatasks

# See and apply levels set apart so the test never leans on a tie.
ERA = replace(CURRENT_ERA, level_to_see_metatasks=7, metatask_apply_level=3)


def test_perk_faction_sees_below_the_see_level():
    assert character_sees_metatasks(0, "albescent", ERA)


def test_other_faction_and_no_faction_do_not():
    assert not character_sees_metatasks(6, "wow", ERA)
    assert not character_sees_metatasks(6, None, ERA)
    assert character_sees_metatasks(7, "wow", ERA)
