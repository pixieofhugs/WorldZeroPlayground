"""
Single source of truth for all game rules.

Services import EraConfig instances from this file. The database stores
config_key to record which ruleset was active during each era, but never
owns the rules themselves. Changing CURRENT_ERA is the one lever that
switches all live game mechanics.
"""
from dataclasses import dataclass, field


@dataclass(frozen=True)
class FactionConfig:
    slug: str
    name: str
    description: str
    color: str                       # hex color for UI display (e.g. "#6b6a7a")
    point_multiplier: float          # applied to all task earnings
    duel_bonus_multiplier: float     # extra % on duel wins (0.0 if not applicable)
    is_selectable: bool              # can players choose this faction at level 3?
    own_faction_multiplier: float    # some factions get a bonus on in-faction tasks
    other_faction_multiplier: float  # and a penalty on out-of-faction tasks


@dataclass(frozen=True)
class EraConfig:
    name: str
    config_key: str                  # matched to Era.config_key in DB for historical record

    # Task rules
    max_task_signups: int            # max active CharacterTask rows per character
    task_submit_level_gap: int       # how many levels above your own you can submit praxis

    # Vote budget: available = base + (multiplier x score)
    vote_budget_base: int
    vote_budget_multiplier: float

    # Level thresholds -- index = level number, value = points required to reach it
    # level_thresholds[0] = 0 (everyone starts at level 0)
    # level_thresholds[1] = 10 (reach level 1 at 10 points), etc.
    level_thresholds: tuple

    # Era reset behaviour -- what happens to characters when a new era begins
    reset_score: bool
    reset_level: bool
    reset_faction: bool
    reset_vote_budget: bool
    reset_all_time_score: bool       # almost always False

    # Faction configs, keyed by slug
    factions: dict


# -- Faction definitions for Era 1 ------------------------------------------

ERA_1_FACTIONS = {
    "ua": FactionConfig(
        slug="ua",
        name="UA",
        description="The default starting faction. Full points on all tasks. Must leave at level 3.",
        color="#6b6a7a",
        point_multiplier=1.0,
        duel_bonus_multiplier=0.0,
        is_selectable=False,          # assigned automatically; not a choosable destination
        own_faction_multiplier=1.0,
        other_faction_multiplier=1.0,
    ),
    "ua_masters": FactionConfig(
        slug="ua_masters",
        name="UA Masters",
        description="Veterans who aged out of UA. Can sign up for any task at reduced points.",
        color="#555555",
        point_multiplier=0.8,
        duel_bonus_multiplier=0.0,
        is_selectable=True,
        own_faction_multiplier=0.8,
        other_faction_multiplier=0.8,
    ),
    "snide": FactionConfig(
        slug="snide",
        name="S.N.I.D.E.",
        description="Specialists in one-on-one competition. Bonus points for winning duels.",
        color="#8a6a20",
        point_multiplier=1.0,
        duel_bonus_multiplier=0.1,    # +10% on duel wins
        is_selectable=True,
        own_faction_multiplier=1.0,
        other_faction_multiplier=1.0,
    ),
    "gestalt": FactionConfig(
        slug="gestalt",
        name="Gestalt",
        description="Collective-minded. Excel at their own faction's tasks; reduced elsewhere.",
        color="#14532d",
        point_multiplier=1.0,
        duel_bonus_multiplier=0.0,
        is_selectable=True,
        own_faction_multiplier=1.1,   # +10% on own-faction tasks
        other_faction_multiplier=0.7, # -30% on other-faction tasks
    ),
    "journeymen": FactionConfig(
        slug="journeymen",
        name="Journeymen",
        description="Explorers with access to select retired tasks (Task Vision ability).",
        color="#c49a3a",
        point_multiplier=1.0,
        duel_bonus_multiplier=0.0,
        is_selectable=True,
        own_faction_multiplier=1.0,
        other_faction_multiplier=1.0,
    ),
    "analog": FactionConfig(
        slug="analog",
        name="Analog",
        description="Depth over breadth. Can repeat one task per level for points (Double Dipper).",
        color="#15803d",
        point_multiplier=1.0,
        duel_bonus_multiplier=0.0,
        is_selectable=True,
        own_faction_multiplier=1.0,
        other_faction_multiplier=1.0,
    ),
    "singularity": FactionConfig(
        slug="singularity",
        name="Singularity",
        description="TBD",
        color="#7c3aed",
        point_multiplier=1.0,
        duel_bonus_multiplier=0.0,
        is_selectable=True,
        own_faction_multiplier=1.0,
        other_faction_multiplier=1.0,
    ),
    "albescent": FactionConfig(
        slug="albescent",
        name="/Albescent",
        description="Full points and any meta tasks from any group. Unlock-only.",
        color="#6b6a7a",
        point_multiplier=1.0,
        duel_bonus_multiplier=0.0,
        is_selectable=False,          # only available as additional character unlock
        own_faction_multiplier=1.0,
        other_faction_multiplier=1.0,
    ),
    "aged_out": FactionConfig(
        slug="aged_out",
        name="AgedOutOfUA",
        description="Placeholder faction for characters who hit level 3 while offline.",
        color="#6b6a7a",
        point_multiplier=1.0,
        duel_bonus_multiplier=0.0,
        is_selectable=False,
        own_faction_multiplier=1.0,
        other_faction_multiplier=1.0,
    ),
    "na": FactionConfig(
        slug="na",
        name="None",
        description="Sentinel value for tasks with no specific faction affiliation.",
        color="#a9a9a9",
        point_multiplier=1.0,
        duel_bonus_multiplier=0.0,
        is_selectable=False,
        own_faction_multiplier=1.0,
        other_faction_multiplier=1.0,
    ),
}


# -- Era definitions ---------------------------------------------------------

ERA_1 = EraConfig(
    name="Era 1",
    config_key="era_1",
    max_task_signups=20,
    task_submit_level_gap=2,
    vote_budget_base=100,
    vote_budget_multiplier=2.0,
    level_thresholds=(0, 10, 70, 170, 330, 610, 1090, 1840, 3040),
    reset_score=True,
    reset_level=True,
    reset_faction=True,
    reset_vote_budget=True,
    reset_all_time_score=False,
    factions=ERA_1_FACTIONS,
)

# Future era example -- different mechanics, same structure
# ERA_2 = EraConfig(
#     name="Foo Era",
#     config_key="era_2",
#     max_task_signups=3,
#     vote_budget_base=20,
#     vote_budget_multiplier=3.0,
#     ...
# )

# -- The one lever that controls live game mechanics -------------------------
CURRENT_ERA: EraConfig = ERA_1


# -- Taunt templates ---------------------------------------------------------
# Keyed by faction slug → trigger type → list of template strings.
# Use {from_name} and {to_name} as placeholders.
# A generic "default" key provides fallbacks for factions without custom taunts.

TAUNT_TEMPLATES: dict[str, dict[str, list[str]]] = {
    "default": {
        "score_overtake": [
            "{from_name} just passed {to_name} on the leaderboard. Awkward.",
            "{to_name}, meet {from_name}'s dust.",
            "{from_name} overtook {to_name}. The scoreboard doesn't lie.",
        ],
        "level_up": [
            "{from_name} leveled up while {to_name} was napping.",
            "{from_name} hit a new level. {to_name} remains where they are.",
        ],
        "submission_complete": [
            "{from_name} just completed a task. {to_name} is still thinking about it.",
            "{from_name} submitted praxis. {to_name}... did not.",
        ],
    },
    "snide": {
        "score_overtake": [
            "{from_name} danced past {to_name} on the scoreboard. Elegant, really.",
            "Oh, {to_name}. {from_name} just made you look silly.",
            "{from_name} sends their regards from above {to_name} on the leaderboard.",
        ],
        "level_up": [
            "{from_name} ascended. {to_name} can see them from down there.",
        ],
        "submission_complete": [
            "{from_name} finished what {to_name} couldn't start.",
        ],
    },
    "gestalt": {
        "score_overtake": [
            "The collective lifts {from_name} above {to_name}. Together, always.",
            "{from_name} rose past {to_name}. The whole is greater than the parts.",
        ],
        "level_up": [
            "{from_name} grew stronger through community. {to_name} walks alone.",
        ],
        "submission_complete": [
            "{from_name} contributed to the whole. {to_name} remained apart.",
        ],
    },
    "journeymen": {
        "score_overtake": [
            "{from_name} found a path past {to_name}. The road provides.",
            "{from_name} wandered ahead of {to_name}. Not all who wander are lost.",
        ],
        "level_up": [
            "{from_name} discovered a new horizon. {to_name} hasn't packed yet.",
        ],
        "submission_complete": [
            "{from_name} returned from the journey with proof. {to_name} stayed home.",
        ],
    },
    "analog": {
        "score_overtake": [
            "{from_name} carved past {to_name} by hand. No shortcuts.",
            "{from_name} overtook {to_name} the old-fashioned way.",
        ],
        "level_up": [
            "{from_name} leveled up through repetition. {to_name} got bored.",
        ],
        "submission_complete": [
            "{from_name} made something real. {to_name} is still scrolling.",
        ],
    },
    "singularity": {
        "score_overtake": [
            "{from_name} computed a path past {to_name}. Inevitable.",
            "{from_name} surpassed {to_name}. The algorithm does not care.",
        ],
        "level_up": [
            "{from_name} optimized beyond {to_name}'s level.",
        ],
        "submission_complete": [
            "{from_name} executed. {to_name} is still in the queue.",
        ],
    },
}
