"""
Single source of truth for all game rules.

Services import EraConfig instances from this file. The database stores
config_key to record which ruleset was active during each era, but never
owns the rules themselves. Changing CURRENT_ERA is the one lever that
switches all live game mechanics.
"""
from dataclasses import dataclass, field


@dataclass(frozen=True)
class TaskDef:
    """Definition of a single task within an era.

    ``task_type`` distinguishes a standard task from a metatask.
    ``metatask_faction_slug`` is only meaningful when ``task_type == "metatask"``
    and identifies which faction's level-7+ members are permitted to apply it
    (Albescent characters can apply any metatask regardless).
    """
    title: str
    description: str
    faction_slug: str
    level_required: int
    point_value: int
    is_task_vision_eligible: bool = False
    task_type: str = "standard"
    metatask_faction_slug: str | None = None


@dataclass(frozen=True)
class FactionConfig:
    slug: str
    name: str
    description: str
    color: str                       # hex color for UI display (e.g. "#6b6a7a")
    is_selectable: bool              # can players choose this faction at level 3?
    can_always_rejoin: bool          # True for UA Masters and Albescent
    own_task_modifier: float         # solo own-faction task multiplier
    other_task_modifier: float       # solo other-faction task multiplier
    collab_own_modifier: float       # collaborative own-faction task multiplier
    collab_other_modifier: float     # collaborative other-faction task multiplier
    duel_win_modifier: float         # duel win multiplier (applied to base points)
    duel_loss_modifier: float        # duel loss multiplier (applied to base points)


@dataclass(frozen=True)
class EraConfig:
    name: str
    config_key: str                  # matched to Era.config_key in DB for historical record

    # Task rules
    max_task_signups: int            # max concurrent in_progress praxes per character
    max_duel_participants: int       # max members in a duel praxis
    max_collab_participants: int     # max members in a collab praxis

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

    # Task definitions for this era
    tasks: tuple = ()                # tuple[TaskDef, ...]

    # Taunt templates for this era
    taunt_templates: dict = field(default_factory=dict)  # faction slug → trigger → templates


# -- Era configs live in backend/eras/ (one file per era) --------------------
# To create a new era, copy eras/_template.py and fill it in.
#
# Era instances (ERA_1, CURRENT_ERA, etc.) are loaded lazily via __getattr__
# to avoid circular imports with eras/ package files.


def __getattr__(name: str):
    """Lazy-load era instances to avoid circular imports with eras/ package."""
    if name in ("ERA_1", "ERA_1_FACTIONS", "CURRENT_ERA", "TAUNT_TEMPLATES"):
        from eras.era_1 import ERA_1 as _era_1
        from eras.era_1 import ERA_1_FACTIONS as _factions
        globals()["ERA_1"] = _era_1
        globals()["ERA_1_FACTIONS"] = _factions
        globals()["CURRENT_ERA"] = _era_1
        globals()["TAUNT_TEMPLATES"] = _era_1.taunt_templates
        return globals()[name]
    raise AttributeError(f"module {__name__!r} has no attribute {name!r}")
