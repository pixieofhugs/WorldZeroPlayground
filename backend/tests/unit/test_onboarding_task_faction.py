"""The onboarding task pays the same to everyone, in every era (#1619 B5).

Era 1 is all 1.0, so the 1.2/0.8 era is built inline to keep the defect visible
whatever the era files hold.
"""
from dataclasses import replace

import pytest

from faction_slugs import UNAFFILIATED_FACTION_SLUG
from game_config import ERA_1, EraConfig
from seed import ONBOARDING_TASK_FACTION_SLUG
from services.scoring import compute_faction_multiplier

ALL_FACTION_SLUGS: tuple[str, ...] = tuple(ERA_1.factions)


def _era_with_modifiers(own: float, other: float) -> EraConfig:
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
        (1.0, 1.0),
        (1.2, 0.8),
    ],
)
@pytest.mark.parametrize("character_faction_slug", ALL_FACTION_SLUGS)
def test_onboarding_task_pays_everyone_the_same(
    character_faction_slug: str, own: float, other: float
):
    era = _era_with_modifiers(own, other)
    multiplier = compute_faction_multiplier(
        character_faction_slug=character_faction_slug,
        task_faction_slug=ONBOARDING_TASK_FACTION_SLUG,
        era=era,
    )
    assert multiplier == own


def test_unaffiliated_newcomer_is_not_charged_the_other_faction_modifier():
    """The #1619 B5 case: a newcomer would get 8 points for a 10-point task."""
    era = _era_with_modifiers(own=1.2, other=0.8)
    assert compute_faction_multiplier(
        character_faction_slug=UNAFFILIATED_FACTION_SLUG,
        task_faction_slug=ONBOARDING_TASK_FACTION_SLUG,
        era=era,
    ) != era.factions[UNAFFILIATED_FACTION_SLUG].other_task_modifier
