"""
Single source of truth for all game rules.

This file owns the *rules*; the latest DB ``Era`` row's ``config_key`` chooses
which ruleset is live, via ``services.era.rebind_live_era`` (ADR-0091).
CURRENT_ERA is a stable object identity — see "The live era binding" below.
"""
from dataclasses import dataclass, field, replace
from enum import Enum

from faction_slugs import ALBESCENT_FACTION_SLUG, UNAFFILIATED_FACTION_SLUG


class LevelUnlockKind(str, Enum):
    ability = "ability"   # must match a real gate constant
    sense = "sense"        # flavor, no mechanics


@dataclass(frozen=True)
class LevelUnlock:
    # ADR-0031: a copy KEY; wording in progression.json unlocks.<key>.
    kind: LevelUnlockKind
    key: str


@dataclass(frozen=True)
class LevelProfile:
    """Rank + unlocks for the level-up pop-up; ``rank_key`` is a copy key (ADR-0031)."""
    rank_key: str
    unlocks: tuple[LevelUnlock, ...]


@dataclass(frozen=True)
class TaskDef:
    """A task within an era.

    ``metatask_faction_slug`` (metatasks only) names the faction whose level-7+
    members may apply it.
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
    # Name/description wording lives in factions.json (ADR-0038).
    # Perk fields below: read each via its services.* reader, never branch on a slug.
    slug: str
    can_always_rejoin: bool
    own_task_modifier: float         # solo
    other_task_modifier: float       # solo
    collab_own_modifier: float
    collab_other_modifier: float
    duel_win_modifier: float         # applied to base points
    duel_loss_modifier: float        # applied to base points
    # Levels above own a member may sign up for, once per level (#811).
    level_jump_reach: int = 0
    # May hold more than one active membership on the SAME task (#1359).
    # services.praxis.multi_membership_faction_slugs feeds both the Python gate
    # and the browse SQL so they cannot drift.
    can_hold_multiple_memberships: bool = False
    # Flat points on a praxis sealed within ``EraConfig.habit_window_days`` of
    # another (#1617). Stamped at seal time; services.habit_bonus argues why.
    habit_bonus_points: int = 0
    can_apply_metatask_at_any_level: bool = False
    # "The array" (#1869): not an authorisation check — /game-config already
    # ships to every client. No services. reader by design.
    reads_the_array: bool = False
    # On a tied duel, the SOLE holder takes the win rate (#2664); two holders
    # cancel. Not inheritable — see _NON_INHERITED_PERK_FIELDS.
    takes_duel_ties: bool = False
    # Holds every other faction's perk, resolved in EraConfig.__post_init__ (#1871).
    inherits_faction_perks: bool = False


#: Perk axes where higher is better, each inherited on its own.
_MAX_PERK_FIELDS: tuple[str, ...] = (
    "own_task_modifier",
    "other_task_modifier",
    "collab_own_modifier",
    "collab_other_modifier",
    "level_jump_reach",
    "habit_bonus_points",
)

_ANY_PERK_FIELDS: tuple[str, ...] = (
    "can_always_rejoin",
    "can_hold_multiple_memberships",
    "can_apply_metatask_at_any_level",
    "reads_the_array",
)

#: Not inherited. ``takes_duel_ties`` is self-cancelling: a second holder
#: destroys the first's ability, so a union would change banked points.
_NON_INHERITED_PERK_FIELDS: tuple[str, ...] = ("takes_duel_ties",)

#: Inherited TOGETHER, never field by field.
_DUEL_PERK_FIELDS: tuple[str, ...] = (
    "duel_win_modifier",
    "duel_loss_modifier",
)


def _inherited_faction_config(
    inheritor: FactionConfig, factions: dict
) -> FactionConfig:
    """``inheritor`` widened to the best perk any faction in the era holds.

    The duel pair is the exception (#1871): a per-axis max would give an
    upside-only gamble (win high, loss 0.5). It comes as a pair from the faction
    with the highest ``duel_win_modifier``, ties broken by slug.
    """
    values = {
        name: max(getattr(faction, name) for faction in factions.values())
        for name in _MAX_PERK_FIELDS
    }
    values.update(
        {
            name: any(getattr(faction, name) for faction in factions.values())
            for name in _ANY_PERK_FIELDS
        }
    )
    duel_donor = min(
        factions.values(), key=lambda faction: (-faction.duel_win_modifier, faction.slug)
    )
    values.update(
        {name: getattr(duel_donor, name) for name in _DUEL_PERK_FIELDS}
    )
    return replace(inheritor, **values)


def _inherited_perk_slugs(slugs: frozenset, inheritors: frozenset) -> frozenset:
    """An ``EraConfig`` perk frozenset with the inheritors added — if anyone else is in it.

    Perks live in two places: FactionConfig fields and these era frozensets.
    An empty set stays empty: the inheritor does not conjure a perk nobody holds.
    """
    others = frozenset(slugs) - inheritors
    if not others:
        return frozenset(slugs)
    return frozenset(slugs) | inheritors


#: Slugs every era must configure, and the role each carries (ADR-0087).
_STRUCTURAL_FACTION_ROLES: dict[str, str] = {
    UNAFFILIATED_FACTION_SLUG: (
        "the neutral faction — the FK target for the born-unaffiliated state "
        "(ADR-0019/ADR-0030) and for cross-faction tasks"
    ),
    ALBESCENT_FACTION_SLUG: (
        "the endgame faction (ADR-0080); its gate stays era-tunable, its "
        "existence does not"
    ),
}


@dataclass(frozen=True)
class EraConfig:
    name: str
    config_key: str                  # matched to Era.config_key in DB

    max_task_signups: int            # max concurrent in_progress praxes per character

    # available = base + (multiplier x score)
    vote_budget_base: int
    vote_budget_multiplier: float

    # index = level, value = points required to reach it; [0] = 0
    level_thresholds: tuple

    # Surfaced as flags on /auth/me (services.character_capabilities).
    level_to_propose_task: int
    level_to_propose_metatask: int
    level_to_see_metatasks: int
    level_to_see_retired_tasks: int
    level_to_see_pending_tasks: int
    # Not a level: hours a new proposal stays admin-only before the level gate
    # applies (#1695). Enforced per-row in services.task.list_tasks.
    pending_task_admin_review_hours: int

    # Enforced in services/praxis.py
    duel_level_required: int
    collaboration_level_required: int
    collab_auto_submit_days: int          # silence-is-consent days (ADR-0012)
    metatask_apply_level: int             # non-Albescent
    flag_level_required: int
    # Checked against Character.peak_level: a reset_level rollover keeps it (#3102).
    vote_level_required: int

    # ADR-0006; services/comment.py. The flag threshold is service-only.
    comment_level_required: int
    comment_flag_review_threshold: int    # flags before review queue

    second_character_level_required: int  # on an existing char
    albescent_level_required: int         # on an existing char
    # ADR-0022: invite needs this AND invitation_task_threshold, per faction.
    invitation_point_threshold: int

    reset_score: bool
    reset_level: bool
    reset_faction: bool
    reset_vote_budget: bool
    reset_all_time_score: bool       # almost always False

    factions: dict                   # keyed by slug

    invitation_task_threshold: int = 2

    # Era files state it explicitly: the cadence is the era's (#1617).
    habit_window_days: int = 7

    # PINNED to `na` in every era (ADR-0087), validated in __post_init__ rather
    # than deleted so the rule is explained where someone tries to break it.
    # Kept separate from reset_faction_slug on purpose (#1559, #1580).
    starting_faction_slug: str = UNAFFILIATED_FACTION_SLUG

    # Where `reset_faction` drops characters; read from the era being opened,
    # which both rollover doors pass explicitly. Also pinned to `na` (ADR-0087).
    reset_faction_slug: str = UNAFFILIATED_FACTION_SLUG

    # Cap is base until the applier reaches max_level, then max. See
    # services/meta_task.py::metatask_cap_for_level.
    metatasks_per_praxis_base: int = 1
    metatasks_per_praxis_max: int = 3
    metatasks_per_praxis_max_level: int = 7

    # FLOOR on perceiving Albescent (#2770, amends ADR-0082); albescent_level_required
    # is the ceiling on joining. Stamped per ACCOUNT (Account.albescent_glimpsed)
    # so it doesn't blink with the character switcher. Must move with the era's
    # level_profiles rung.
    albescent_glimpse_level: int = 6

    tasks: tuple = ()                # tuple[TaskDef, ...]

    # Indexed by level like level_thresholds (index 0 never shown).
    level_profiles: tuple = ()       # tuple[LevelProfile, ...]

    # Taunt wording is not config-owned (ADR-0031): see taunts.json.

    # Pending access is a much rarer permission than retired (Task Vision).
    # These are PERKS too (#1871); _inherited_perk_slugs covers them.
    allow_praxis_on_retired_task_factions: frozenset = field(default=frozenset())
    allow_praxis_on_pending_task_factions: frozenset = field(default=frozenset())

    # Collab-invite carve-outs (#1511, owner ruling): an invitee may submit on a
    # task they could not claim. Enforced in invite_to_praxis (level, faction)
    # and respond_to_invite (task bank, charged on accept). Duels don't use these.
    collab_invite_bypasses_level: bool = True
    collab_invite_bypasses_faction: bool = True
    collab_invite_bypasses_task_bank: bool = False

    def __post_init__(self) -> None:
        """Enforce ADR-0087's structural clause, then resolve perk inheritance (#1871).

        Validating here makes a malformed era file fail at import, not as an FK
        violation at first character creation. Inheritors derive from the
        DECLARED dict so two inheritors stay order-independent.
        """
        for slug, role in _STRUCTURAL_FACTION_ROLES.items():
            if slug not in self.factions:
                raise ValueError(
                    f"{self.config_key or 'this era'}: {slug!r} is missing from "
                    f"era.factions. It is {role} in EVERY era (ADR-0087) — the "
                    f"rest of the roster is yours to choose, this slug is not."
                )
        for field_name in ("starting_faction_slug", "reset_faction_slug"):
            value = getattr(self, field_name)
            if value != UNAFFILIATED_FACTION_SLUG:
                raise ValueError(
                    f"{self.config_key or 'this era'}: {field_name}="
                    f"{value!r} is not allowed — both faction slugs are pinned "
                    f"to {UNAFFILIATED_FACTION_SLUG!r} (ADR-0087, which amends "
                    f"ADR-0042's 'the era doc wins' for these two fields and no "
                    f"others). Characters are born unaffiliated and a rollover "
                    f"returns them there; an era pre-sorting its players is the "
                    f"seam #1559 opened and ADR-0087 closed."
                )

        inheritors = frozenset(
            slug
            for slug, faction in self.factions.items()
            if faction.inherits_faction_perks
        )
        if not inheritors:
            return
        object.__setattr__(
            self,
            "factions",
            {
                slug: (
                    _inherited_faction_config(faction, self.factions)
                    if slug in inheritors
                    else faction
                )
                for slug, faction in self.factions.items()
            },
        )
        for field_name in (
            "allow_praxis_on_retired_task_factions",
            "allow_praxis_on_pending_task_factions",
        ):
            object.__setattr__(
                self,
                field_name,
                _inherited_perk_slugs(getattr(self, field_name), inheritors),
            )


# Era configs live in backend/eras/ (copy eras/_template.py for a new one),
# loaded lazily via __getattr__ to avoid circular imports.


def __getattr__(name: str):
    """Lazy-load era instances.

    ``ERA_N_FACTIONS`` is ``ERA_N.factions`` (post-inheritance), not the era
    file's declared dict.
    """
    if name == "CURRENT_ERA":
        # Own branch: resolving ERA_1 must not (re)bind CURRENT_ERA, or
        # era_config_for_key on a past era's key would undo a flip (#2708).
        live = _new_live_era(era_config_for_key(COMPILE_TIME_ERA_CONFIG_KEY))
        globals()["CURRENT_ERA"] = live
        return live
    if name in ("ERA_1", "ERA_1_FACTIONS"):
        from eras.era_1 import ERA_1 as _era_1
        globals()["ERA_1"] = _era_1
        globals()["ERA_1_FACTIONS"] = _era_1.factions
        return globals()[name]
    if name in ("ERA_2", "ERA_2_FACTIONS"):
        # Resolving does not make Era 2 live; only bind_live_era does.
        from eras.era_2 import ERA_2 as _era_2
        globals()["ERA_2"] = _era_2
        globals()["ERA_2_FACTIONS"] = _era_2.factions
        return globals()[name]
    raise AttributeError(f"module {__name__!r} has no attribute {name!r}")


# config_key -> attribute NAME (not EraConfig) so module load stays lazy; a unit
# test asserts they agree. Insertion order is era order (admin selector): append.
_ERA_ATTRIBUTE_BY_CONFIG_KEY: dict[str, str] = {
    "era_1": "ERA_1",
    "era_2": "ERA_2",
}

#: Fallback only, for a fresh DB with no ``Era`` row (ADR-0091). Not "the live era".
COMPILE_TIME_ERA_CONFIG_KEY = "era_1"


def registered_era_config_keys() -> tuple[str, ...]:
    """Every ``config_key`` an ``Era`` row may name, in era order."""
    return tuple(_ERA_ATTRIBUTE_BY_CONFIG_KEY)


def era_config_for_key(config_key: str) -> EraConfig | None:
    """The EraConfig an ``Era.config_key`` names, or ``None`` (caller owns fallback)."""
    attribute_name = _ERA_ATTRIBUTE_BY_CONFIG_KEY.get(config_key)
    if attribute_name is None:
        return None
    return globals().get(attribute_name) or __getattr__(attribute_name)


# -- The live era binding (ADR-0091) -----------------------------------------
# CURRENT_ERA is a stable object identity, refreshed in place. Services bind it
# as a default argument at def time, so reassigning the name would half-flip
# the process. Writing through the frozen dataclass is deliberate.


def _new_live_era(source: EraConfig) -> EraConfig:
    """A distinct ``EraConfig`` carrying ``source``'s fields.

    Distinct so a flip never overwrites ERA_1 itself. Skips ``__post_init__``
    because perk inheritance is not idempotent.
    """
    live = object.__new__(EraConfig)
    live.__dict__.update(source.__dict__)
    return live


def bind_live_era(era: EraConfig) -> EraConfig:
    """Point the live ruleset at ``era``. THE one lever (ADR-0091).

    Call via :func:`services.era.rebind_live_era` (test_live_era_binding.py
    pins that). Returns the same live instance every time.

    Per-key overwrite, never clear-then-update: threadpool readers would hit an
    empty object mid-refresh. Readers see the old or new value per field, never
    a missing one.
    """
    live = globals().get("CURRENT_ERA") or __getattr__("CURRENT_ERA")
    if era is live:
        return live
    live.__dict__.update(era.__dict__)
    for stale in set(live.__dict__) - set(era.__dict__):
        del live.__dict__[stale]
    return live
