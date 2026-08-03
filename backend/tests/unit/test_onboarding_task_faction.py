"""The onboarding task pays the same to everyone, in every era (#1619 B5).

Seam under test: ``seed.ONBOARDING_TASK_FACTION_SLUG`` read through
``services.scoring.compute_faction_multiplier``. That pair is the whole rule —
the slug on the one task every brand-new player starts on decides whether an
unaffiliated character is charged ``other_task_modifier`` for it.

Era 1 sets every modifier to 1.0, so the defect is invisible against the live
era. The 1.2/0.8 config below is what a second era looks like; it is built
inline rather than imported so this test keeps failing on the real defect
whatever the era files happen to hold.
"""
from dataclasses import replace

import pytest

from faction_slugs import UNAFFILIATED_FACTION_SLUG
from game_config import ERA_1, EraConfig
from seed import ONBOARDING_TASK_FACTION_SLUG
from services.scoring import compute_faction_multiplier

#: Every faction slug an era knows, including the unaffiliated sentinel.
ALL_FACTION_SLUGS: tuple[str, ...] = tuple(ERA_1.factions)


def _era_with_modifiers(own: float, other: float) -> EraConfig:
    """ERA_1's shape with every faction's solo modifiers pinned to (own, other)."""
    return replace(
        ERA_1,
        factions={
            slug: replace(
                faction, own_task_modifier=own, other_task_modifier=other
            )
            for slug, faction in ERA_1.factions.items()
        },
    )


@pytest.mark.parametrize(
    "own,other",
    [
        (1.0, 1.0),   # Era 1: the defect is silent here
        (1.2, 0.8),   # a second era: the slug starts carrying arithmetic
    ],
)
@pytest.mark.parametrize("character_faction_slug", ALL_FACTION_SLUGS)
def test_onboarding_task_pays_everyone_the_same(
    character_faction_slug: str, own: float, other: float
):
    """No faction — least of all none at all — is penalised for the first act."""
    era = _era_with_modifiers(own, other)
    multiplier = compute_faction_multiplier(
        character_faction_slug=character_faction_slug,
        task_faction_slug=ONBOARDING_TASK_FACTION_SLUG,
        era=era,
    )
    assert multiplier == own


def test_unaffiliated_newcomer_is_not_charged_the_other_faction_modifier():
    """The case that motivated #1619 B5, stated on its own.

    A brand-new character is unaffiliated, and the onboarding task may be the
    only thing on the board the day an era opens. Under a 0.8 other-modifier a
    faction-carrying onboarding task pays them 8 points for a 10-point task.
    """
    era = _era_with_modifiers(own=1.2, other=0.8)
    assert compute_faction_multiplier(
        character_faction_slug=UNAFFILIATED_FACTION_SLUG,
        task_faction_slug=ONBOARDING_TASK_FACTION_SLUG,
        era=era,
    ) != era.factions[UNAFFILIATED_FACTION_SLUG].other_task_modifier
