"""
Single source of truth for all game rules.

Services import EraConfig instances from this file. The database stores
config_key to record which ruleset was active during each era, but never
owns the rules themselves. Changing CURRENT_ERA is the one lever that
switches all live game mechanics.
"""
from dataclasses import dataclass, field, replace
from enum import Enum

from faction_slugs import UNAFFILIATED_FACTION_SLUG


class LevelUnlockKind(str, Enum):
    """Whether a level unlock is a rules-backed capability or pure flavor."""
    ability = "ability"   # rules-backed capability, must match a real gate constant
    sense = "sense"        # whimsical flavor, no mechanics


@dataclass(frozen=True)
class LevelUnlock:
    # ADR-0031: the backend emits a copy KEY, not prose. The frontend
    # progression.json catalog owns the name/desc words:
    # t('progression:unlocks.<key>.name' | '.desc').
    kind: LevelUnlockKind
    key: str


@dataclass(frozen=True)
class LevelProfile:
    """Rank + unlocks announced by the level-up pop-up at a given level.

    ADR-0031: ``rank_key`` is a copy KEY, not prose — the frontend resolves
    ``t('progression:ranks.<rank_key>')``.
    """
    rank_key: str
    unlocks: tuple[LevelUnlock, ...]


@dataclass(frozen=True)
class TaskDef:
    """Definition of a single task within an era.

    ``task_type`` distinguishes a standard task from a metatask.
    ``metatask_faction_slug`` is only meaningful when ``task_type == "metatask"``
    and identifies which faction's level-7+ members are permitted to apply it
    (a faction carrying ``FactionConfig.can_apply_metatask_at_any_level`` may
    apply any metatask regardless of level).
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
    # Faction name/description prose is NOT config-owned (ADR-0038): the English
    # words live in frontend/src/locales/en/factions.json (names.<slug>,
    # descriptions.<slug>). Config owns which factions exist + their mechanics;
    # the DB Faction row carries slug + status only.
    slug: str
    can_always_rejoin: bool          # True for Albescent (the only one in Era 1)
    own_task_modifier: float         # solo own-faction task multiplier
    other_task_modifier: float       # solo other-faction task multiplier
    collab_own_modifier: float       # collaborative own-faction task multiplier
    collab_other_modifier: float     # collaborative other-faction task multiplier
    duel_win_modifier: float         # duel win multiplier (applied to base points)
    duel_loss_modifier: float        # duel loss multiplier (applied to base points)
    # Levels ABOVE the character's own level that a member may reach when signing
    # up for a task, once per level (#811). 0 = no such ability (the baseline for
    # every faction); 1 = may claim a single task exactly one level up per level.
    # Read via services.level_jump — never branch on a faction slug in a service.
    # Defaulted so existing/new era files only state it where it is non-zero.
    level_jump_reach: int = 0
    # "Double Dipper" (#1359): may the member hold more than one active praxis
    # membership on the SAME task? False (the baseline) means a task already in
    # hand is neither claimable again nor listed in that character's browse.
    # Read via services.praxis.multi_membership_faction_slugs — never branch on
    # a faction slug in a service. Both halves of the membership gate (the
    # Python predicate and the SQL the browse filters with) read that one
    # function, so they cannot drift.
    can_hold_multiple_memberships: bool = False
    # The habit bonus (#1617): flat points a member earns on a praxis sealed
    # within ``EraConfig.habit_window_days`` of another praxis of their own. It
    # rewards showing up — tasking habitually, even when the tasks themselves
    # are less impressive. 0 (the baseline) means the faction grants no such
    # ability. Read via services.habit_bonus — never branch on a faction slug in
    # a service. Stamped at seal time onto ``PraxisMember.habit_bonus_points``
    # rather than derived on read; that module argues why.
    habit_bonus_points: int = 0
    # May a member apply a metatask below ``EraConfig.metatask_apply_level``?
    # False (the baseline) means the level gate applies. Read via
    # services.meta_task.faction_bypasses_metatask_level — never branch on a
    # faction slug in a service. Until #1871 this WAS a slug branch inside
    # ``services.praxis_metatask``, which no era could re-tune.
    can_apply_metatask_at_any_level: bool = False
    # "The array" (#1869): may a member read the era's configuration in the
    # browser console? The one perk with no server-side door, because nothing is
    # withheld — ``/game-config`` already ships to every client, and the UI
    # merely never renders it as numbers. So this flag is not an authorisation
    # check; it is the client's own answer to "am I the faction that looks?",
    # read out of the very payload the perk prints. There is deliberately no
    # ``services.`` reader to pair with it and no enforcement to add.
    reads_the_array: bool = False
    # Albescent's charter (#1871): this faction holds every OTHER faction's perk
    # in its era. Declared here, resolved by ``EraConfig.__post_init__`` — the
    # era file states the faction's own floor and the union is computed, so a
    # faction added later arrives with its perk already mirrored. See
    # :func:`_inherited_faction_config` for the one axis that is not a per-field
    # maximum.
    inherits_faction_perks: bool = False


#: Perk axes where a HIGHER value is the better deal and each axis is inherited
#: on its own. ``other_task_modifier``/``collab_other_modifier`` are here for
#: completeness; Era 1 flattens both to 1.0 (#452).
_MAX_PERK_FIELDS: tuple[str, ...] = (
    "own_task_modifier",
    "other_task_modifier",
    "collab_own_modifier",
    "collab_other_modifier",
    "level_jump_reach",
    "habit_bonus_points",
)

#: Perk axes that are simply held or not held.
_ANY_PERK_FIELDS: tuple[str, ...] = (
    "can_always_rejoin",
    "can_hold_multiple_memberships",
    "can_apply_metatask_at_any_level",
    "reads_the_array",
)

#: The duel pair — inherited TOGETHER, never field by field. See
#: :func:`_inherited_faction_config`.
_DUEL_PERK_FIELDS: tuple[str, ...] = (
    "duel_win_modifier",
    "duel_loss_modifier",
)


def _inherited_faction_config(
    inheritor: FactionConfig, factions: dict
) -> FactionConfig:
    """``inheritor`` widened to the best perk any faction in the era holds.

    Every axis in :data:`_MAX_PERK_FIELDS` takes the era-wide maximum and every
    axis in :data:`_ANY_PERK_FIELDS` is held if anyone holds it — the inheritor
    included, so a perk it alone declares survives the union.

    **The duel pair is the exception, and it is the one axis a naive derivation
    gets wrong (#1871, Ruling 1).** Higher is better on both duel fields, so a
    plain per-axis maximum yields ``max(0.5, 0.0) = 0.5`` on the loss side and
    quietly hands the inheritor an upside-only version of a gamble that is
    strictly better than the gamble itself. So the pair travels together, from
    the faction with the highest ``duel_win_modifier``; ties break by slug order
    so the result is deterministic. A future era with two aggressive duellists
    must not silently cherry-pick across them.
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

    The second half of #1871's real finding: **perks live in TWO places.** Six
    are ``FactionConfig`` fields; Task Vision is
    ``allow_praxis_on_retired_task_factions``, a frozenset of slugs on
    ``EraConfig``. A fix covering only the dataclass fields would silently miss
    this half, and so would the next audit.

    "At least as good as the best other faction" — and no better: an empty set
    means nobody holds the perk, so the inheritor does not conjure it. Era 2 has
    no Ephemerists and its retired-task set stays empty for exactly that reason.
    """
    others = frozenset(slugs) - inheritors
    if not others:
        return frozenset(slugs)
    return frozenset(slugs) | inheritors


@dataclass(frozen=True)
class EraConfig:
    name: str
    config_key: str                  # matched to Era.config_key in DB for historical record

    # Task rules
    max_task_signups: int            # max concurrent in_progress praxes per character

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
    # The companion to the gate above, and NOT a level: how long a freshly
    # proposed task stays admin-only before the level gate can reach it (#1695).
    # `level_to_see_pending_tasks` says WHO may watch the review queue; this says
    # WHEN, so an admin gets the first look at a proposal and can edit or reject
    # it before other players read it. Admins are exempt — the window exists for
    # them. Enforced per-ROW in `services.task.list_tasks`; surfaced on
    # /game-config so the two copy surfaces that promise it can say the number.
    pending_task_admin_review_hours: int

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

    # How recently a member must have sealed another praxis for the next one to
    # carry ``FactionConfig.habit_bonus_points`` (#1617). The *cadence* is the
    # era's to set, so a later era can tighten or loosen "habitually" without
    # touching a single faction's ability. Defaulted, but era files state it
    # explicitly: an era owning its own cadence is the point of the field.
    habit_window_days: int = 7

    # The faction a character is born into when creation names none (#1559).
    # ADR-0019 makes characters born unaffiliated and ADR-0030 makes `na` the
    # site-wide answer, so the default below is already right for every era so
    # far — an era file declares this ONLY when it wants players pre-sorted into
    # a real faction. That is ADR-0042's shape: the era doc wins where it
    # speaks, and stays silent about the obvious.
    #
    # Deliberately NOT the era-*reset* faction (reset_faction_slug, below). They
    # hold the same value today and are arguably one knob, but an era may
    # reasonably want players born unaffiliated and *reset* into something else,
    # so #1559 left them apart rather than silently unify them — a ruling #1580
    # upheld.
    starting_faction_slug: str = UNAFFILIATED_FACTION_SLUG

    # The faction a character is dropped into when `reset_faction` fires (#1580).
    # Being *born* into a faction and being *returned* to one at era close are
    # different questions an era may want to answer differently — players born
    # unaffiliated but reset into a starter faction, say. Today both answer
    # UNAFFILIATED_FACTION_SLUG, which is why the two are easy to mistake for one
    # knob; they are kept apart on purpose. Same constraint as above: whatever an
    # era names must be a slug that era actually configures, since it is an FK
    # onto a Faction row.
    #
    # Read from the era being *opened*: apply_era_reset takes `era: EraConfig =
    # CURRENT_ERA` and scripts/era_reset.py leaves that default in place, the
    # rollover procedure being "point CURRENT_ERA at the next era, then run the
    # script". So this is the incoming era's answer to where the outgoing era's
    # players land — consistent with reset_score/reset_level/reset_faction.
    reset_faction_slug: str = UNAFFILIATED_FACTION_SLUG

    # Metatask-per-praxis cap (defaulted so bare EraConfig constructions stay valid).
    # A praxis holds metatasks_per_praxis_base metatasks until the applying character
    # reaches metatasks_per_praxis_max_level, from which the cap rises to
    # metatasks_per_praxis_max. Level-based only; enforced in
    # services/praxis.py::apply_metatask via services/meta_task.py::metatask_cap_for_level.
    metatasks_per_praxis_base: int = 1
    metatasks_per_praxis_max: int = 3
    metatasks_per_praxis_max_level: int = 7

    # Task definitions for this era
    tasks: tuple = ()                # tuple[TaskDef, ...]

    # Rank + unlocks shown by the level-up pop-up, indexed by level like
    # level_thresholds (index 0 = start state, never shown).
    level_profiles: tuple = ()       # tuple[LevelProfile, ...]

    # NOTE: taunt copy is no longer config-owned. Per ADR-0031 the taunt
    # template strings live in frontend/src/locales/en/taunts.json; the backend
    # persists a structured (faction_slug, trigger_type) reference and the
    # frontend catalog resolves the words. There is no taunt_templates field.

    # Faction slugs allowed to create praxes for retired / pending tasks respectively.
    # Kept separate because granting access to pending (admin-review) tasks is a
    # categorically different — and much rarer — permission than granting Task Vision
    # access to retired ones. Mirrors the level_to_see_retired/pending_tasks split.
    #
    # ** These two are PERKS, and they are the half an audit forgets (#1871). **
    # Every other faction ability is a FactionConfig field; these two are era-level
    # frozensets of slugs. Anything that reasons about "which perks does faction X
    # hold" must read BOTH places — `_inherited_perk_slugs` is why the inheriting
    # faction below does not have to be listed here by hand.
    allow_praxis_on_retired_task_factions: frozenset = field(default=frozenset())
    allow_praxis_on_pending_task_factions: frozenset = field(default=frozenset())

    # The collab door's eligibility carve-outs (#1511). Sign-up eligibility and the
    # ability to submit a praxis are different questions: a character who could never
    # claim a task themselves — too low a level, wrong faction — may be *invited* into
    # a collab on it and submit. That is deliberate (owner ruling, 2026-08-01): an
    # Easter egg encouraging collaboration across factions and character levels.
    #
    # It used to be enforced by absence — services.praxis.invite_to_praxis simply
    # never checked — which is a rule nothing can grep and no test can defend. These
    # make it explicit and tunable per era; the values below are Era 1's behaviour
    # exactly. Enforcement lives in invite_to_praxis (level, faction) and
    # respond_to_invite (task bank, charged on accept, not on invite).
    #
    # The duel door has the same shape and its own home (era.duel_level_required,
    # ADR-0051) — these flags do not govern it.
    collab_invite_bypasses_level: bool = True
    collab_invite_bypasses_faction: bool = True
    collab_invite_bypasses_task_bank: bool = False

    def __post_init__(self) -> None:
        """Resolve ``FactionConfig.inherits_faction_perks`` (#1871).

        An era file DECLARES factions; this computes the one derived thing about
        them, so that every read site keeps reading ``era.factions[slug].<field>``
        and ``era.allow_praxis_on_*`` with no branch of its own. Doing it here
        rather than in each era file is what makes the derivation cover **both**
        homes a perk can live in — the dataclass fields and the era's frozensets.

        Inheritors derive from the DECLARED dict, not from each other's resolved
        values, so two inheritors in one era stay order-independent. A frozen
        dataclass is still frozen afterwards; ``object.__setattr__`` is the
        documented way to finish initialising one.
        """
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


# -- Era configs live in backend/eras/ (one file per era) --------------------
# To create a new era, copy eras/_template.py and fill it in.
#
# Era instances (ERA_1, CURRENT_ERA, etc.) are loaded lazily via __getattr__
# to avoid circular imports with eras/ package files.


def __getattr__(name: str):
    """Lazy-load era instances to avoid circular imports with eras/ package.

    ``ERA_N_FACTIONS`` resolves to ``ERA_N.factions``, NOT to the era file's
    literal dict of the same name. The two differ by exactly one thing —
    ``__post_init__``'s perk inheritance (#1871) — and a consumer reading the
    declared dict would see an Albescent that has not inherited yet. Era files
    keep their module-level dict for authoring; every importer gets the resolved
    one.
    """
    if name in ("ERA_1", "ERA_1_FACTIONS", "CURRENT_ERA"):
        from eras.era_1 import ERA_1 as _era_1
        globals()["ERA_1"] = _era_1
        globals()["ERA_1_FACTIONS"] = _era_1.factions
        globals()["CURRENT_ERA"] = _era_1
        return globals()[name]
    if name in ("ERA_2", "ERA_2_FACTIONS"):
        # Era 2 (Metamorphosis) is authored, not activated: CURRENT_ERA stays
        # Era 1 above.
        from eras.era_2 import ERA_2 as _era_2
        globals()["ERA_2"] = _era_2
        globals()["ERA_2_FACTIONS"] = _era_2.factions
        return globals()[name]
    raise AttributeError(f"module {__name__!r} has no attribute {name!r}")


# The config_key -> EraConfig registry (#1623). A stored ``Era`` row records
# which ruleset governed it via ``Era.config_key``; this is the only way back
# from that key to the rules, and the reason the era announcement can label a
# *past* era correctly instead of relabelling it with whatever CURRENT_ERA is.
#
# Deliberately a key -> ATTRIBUTE-NAME map rather than key -> EraConfig: reading
# the config_key off an era file means importing every era file at module load,
# which is exactly the eager import the __getattr__ above exists to avoid. The
# duplication is one string per era, and a unit test asserts the two agree.
_ERA_ATTRIBUTE_BY_CONFIG_KEY: dict[str, str] = {
    "era_1": "ERA_1",
    "era_2": "ERA_2",
}


def era_config_for_key(config_key: str) -> EraConfig | None:
    """The EraConfig a stored ``Era.config_key`` names, or ``None`` if unknown.

    ``None`` for an era whose config file has been deleted, or for a row written
    by a newer version of the app. Callers own the fallback; the era announcement
    falls back to the ``Era.name`` recorded on the row.
    """
    attribute_name = _ERA_ATTRIBUTE_BY_CONFIG_KEY.get(config_key)
    if attribute_name is None:
        return None
    return globals().get(attribute_name) or __getattr__(attribute_name)
