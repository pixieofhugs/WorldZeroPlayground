"""
Single source of truth for all game rules.

Services import EraConfig instances from this file. The database stores
config_key to record which ruleset was active during each era, but never
owns the rules themselves. Changing CURRENT_ERA is the one lever that
switches all live game mechanics.
"""
from dataclasses import dataclass, field
from enum import Enum


class LevelUnlockKind(str, Enum):
    """Whether a level unlock is a rules-backed capability or pure flavor."""
    ability = "ability"   # rules-backed capability, must match a real gate constant
    sense = "sense"        # whimsical flavor, no mechanics


@dataclass(frozen=True)
class LevelUnlock:
    kind: LevelUnlockKind
    name: str
    desc: str


@dataclass(frozen=True)
class LevelProfile:
    """Rank title + unlocks announced by the level-up pop-up at a given level."""
    rank: str
    unlocks: tuple[LevelUnlock, ...]


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

    # Vote budget: available = base + (multiplier x score)
    vote_budget_base: int
    vote_budget_multiplier: float

    # Level thresholds -- index = level number, value = points required to reach it
    # level_thresholds[0] = 0 (everyone starts at level 0)
    # level_thresholds[1] = 10 (reach level 1 at 10 points), etc.
    level_thresholds: tuple

    # Capability level gates. Surface as boolean flags on /auth/me
    # (services.character_capabilities) so the frontend gates UI off flags
    # instead of hardcoding integers.
    level_to_propose_task: int
    level_to_propose_metatask: int
    level_to_see_metatasks: int
    level_to_see_retired_tasks: int
    level_to_see_pending_tasks: int

    # Praxis / moderation / metatask gates (enforced in services/praxis.py)
    duel_level_required: int              # min level to create a duel praxis
    collaboration_level_required: int     # min level to create a collab praxis
    collab_auto_submit_days: int          # pending-publish window: silence-is-consent days (ADR-0012)
    metatask_apply_level: int             # min level to apply a metatask (non-Albescent)
    flag_level_required: int              # min level to flag a praxis for moderation

    # Comment gates (ADR-0006; enforced in services/comment.py). comment_level_required
    # is surfaced on /auth/me like the other capability gates; the flag threshold is
    # service-only.
    comment_level_required: int           # min level to post a comment
    comment_flag_review_threshold: int    # flags before a comment hits the review queue

    # Character account / faction gates (enforced in services/character.py and faction_service.py)
    second_character_level_required: int  # min level on an existing char to create another
    albescent_level_required: int         # min level on an existing char to start a new Albescent
    faction_graduation_level: int         # DORMANT — old level gate, retired by ADR-0022
    # ADR-0022 invitation delivery: a character earns faction X's invite once it has
    # >= invitation_task_threshold completed tasks for X AND >= invitation_point_threshold
    # points from X's tasks (both per-character, faction-scoped, era-scoped).
    invitation_point_threshold: int       # min points from a faction's tasks to earn its invite

    # Era reset behaviour -- what happens to characters when a new era begins
    reset_score: bool
    reset_level: bool
    reset_faction: bool
    reset_vote_budget: bool
    reset_all_time_score: bool       # almost always False

    # Faction configs, keyed by slug
    factions: dict

    # ADR-0022: completed-task count (per faction) required to earn that faction's invite.
    # Defaulted so existing EraConfig constructions stay valid.
    invitation_task_threshold: int = 2

    # Task definitions for this era
    tasks: tuple = ()                # tuple[TaskDef, ...]

    # Rank + unlocks shown by the level-up pop-up, indexed by level like
    # level_thresholds (index 0 = start state, never shown).
    level_profiles: tuple = ()       # tuple[LevelProfile, ...]

    # Taunt templates for this era
    taunt_templates: dict = field(default_factory=dict)  # faction slug → trigger → templates

    # Faction slugs allowed to create praxes for retired / pending tasks respectively.
    # Kept separate because granting access to pending (admin-review) tasks is a
    # categorically different — and much rarer — permission than granting Task Vision
    # access to retired ones. Mirrors the level_to_see_retired/pending_tasks split.
    allow_praxis_on_retired_task_factions: frozenset = field(default=frozenset())
    allow_praxis_on_pending_task_factions: frozenset = field(default=frozenset())


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
