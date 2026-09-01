"""An advertised capability and its enforcement must read the same predicate (#2869).

#1672 is the failure this file exists to catch. The retired-tasks gate was
written in ``character_capabilities`` and enforced *nowhere*, so anonymous
callers could read the archive; the pending-tasks gate was written by level
here and by ``is_admin`` alone in ``list_tasks``, so a level-3 player was
offered a filter tab that always answered nothing. Both sides had unit tests.
Neither side had a test of their **agreement**, and that is the assertion
below.

Since #2868 the two sides largely call the same function, which is exactly why
a naive "call ``compute_capabilities``, call the predicate, compare" suite is
close to worthless on its own — it compares a function to itself and passes
forever. It cannot fail for the reason the next #1672 will happen. So the load
is carried by four checks, three of them **structural**, and each names the
regression it is here to redden:

1. :func:`test_every_capability_field_is_predicate_backed_or_registered` — a
   tenth capability field that is a gate, with no predicate behind it. The
   field list is walked off the ``CharacterCapabilities`` dataclass (#2815's
   derived-list rule), never hand-typed, and the default for an unrecognised
   field is *fail*: a new field must either resolve to a same-named
   ``era_gates`` predicate or be added to :data:`NOT_A_LEVEL_GATE` with a
   reason.
2. :func:`test_compute_capabilities_calls_the_predicate_it_advertises` — a
   field that stops calling the leaf and inlines a comparison again, or is
   wired to the wrong predicate by copy-paste. Read off the AST of the
   ``CharacterCapabilities(...)`` construction, so an inlined ``level >= ...``
   is visible as the absence of a call.
3. :func:`test_advertise_and_enforce_agree_across_the_matrix` — the
   behavioural half the issue asks for, over levels x faction slugs x admin.
   It is *not* circular: the field/predicate pairing comes from the field's
   **name** (``can_x`` -> ``may_x``), not from the AST, so it fails when the
   argument order is mis-wired (``is_admin`` and ``faction_slug`` swapped
   typechecks fine and behaves differently) or when a flag is wired to the
   wrong predicate.
4. :func:`test_no_module_restates_a_gate_threshold` and
   :func:`test_every_gate_predicate_has_an_enforcement_site` — the enforcement
   side. Enforcement lives behind a session, so it cannot be *exercised*
   without a DB, and the acceptance criteria say no DB. What can be asserted
   without one is stronger anyway: nobody outside ``era_gates`` compares
   against a gate threshold at all, and every predicate is imported by
   somebody other than the advertiser. A gate imported *only* by
   ``character_capabilities`` is advertised and unenforced — which is
   precisely the retired-tasks half of #1672.

No DB, no fixtures, no app import: pure AST plus pure functions.
"""
import ast
import dataclasses
from pathlib import Path

import pytest

from game_config import ERA_1
from services import era_gates
from services.character_capabilities import (
    CharacterCapabilities,
    compute_capabilities,
)

BACKEND = Path(__file__).resolve().parents[2]
ERA_GATES = BACKEND / "services" / "era_gates.py"
CAPABILITIES = BACKEND / "services" / "character_capabilities.py"
ADVERTISER = "character_capabilities"

#: Capability fields that are deliberately not era level gates. Each needs a
#: reason, because the *default* for an unlisted field is "must be backed by a
#: named predicate" — that default is what stops a tenth gate slipping in
#: unguarded, and an entry here is the only way to opt out of it.
NOT_A_LEVEL_GATE = {
    "level_jump_reach": (
        "A faction perk allowance (#811), not a level unlock — 0 for everyone "
        "whose faction does not grant it. The rule lives in services.level_jump."
    ),
    "level_jump_available": (
        "Whether that same faction perk is unspent at the current level (#811). "
        "Depends on level_jump_used_at_level, which is character state, not an "
        "era threshold."
    ),
    "task_browse_defaults_to_eligible": (
        "A default, not a gate (#2025): GET /tasks still takes can_sign_up from "
        "the client, so there is no server branch paired with it to enforce. "
        "Level 0 is the bottom of the scale itself, not an era.* value."
    ),
}

#: Ordered comparisons only. ``faction_slug in era.allow_praxis_on_retired_task_``
#: ``factions`` is an ast.Compare too, and membership in a faction set is not the
#: thing #1672 was about — a restated ``level >= era.<threshold>`` is.
ORDERED_OPS = (ast.Lt, ast.LtE, ast.Gt, ast.GtE)


def _era_gates_tree() -> ast.Module:
    return ast.parse(ERA_GATES.read_text(encoding="utf-8"))


def gate_predicate_names() -> list[str]:
    """Every public predicate defined in ``services.era_gates``, off the AST."""
    return [
        node.name
        for node in _era_gates_tree().body
        if isinstance(node, ast.FunctionDef) and not node.name.startswith("_")
    ]


def gate_threshold_fields() -> set[str]:
    """The ``EraConfig`` fields ``era_gates`` owns the comparison of.

    Derived, not listed: every ``era.<field>`` that appears in an ordered
    comparison inside the leaf. Nine predicates, nine fields — and if a tenth
    predicate arrives, its threshold joins this set for free.
    """
    fields: set[str] = set()
    for node in ast.walk(_era_gates_tree()):
        if not isinstance(node, ast.Compare):
            continue
        if not any(isinstance(op, ORDERED_OPS) for op in node.ops):
            continue
        for side in [node.left, *node.comparators]:
            if (
                isinstance(side, ast.Attribute)
                and isinstance(side.value, ast.Name)
                and side.value.id == "era"
            ):
                fields.add(side.attr)
    return fields


def capability_fields() -> list[str]:
    """Walked off the dataclass — the derived list #2815 asks for."""
    return [f.name for f in dataclasses.fields(CharacterCapabilities)]


def predicate_name_for(field: str) -> str:
    """``can_see_pending_tasks`` -> ``may_see_pending_tasks``.

    The pairing is the field's own name, deliberately: deriving it from the
    call in ``compute_capabilities`` instead would make
    :func:`test_advertise_and_enforce_agree_across_the_matrix` compare a
    function to itself.
    """
    return "may_" + field.removeprefix("can_")


def gate_fields() -> list[str]:
    return [f for f in capability_fields() if f not in NOT_A_LEVEL_GATE]


def _python_modules() -> list[Path]:
    return sorted(
        [*(BACKEND / "services").glob("*.py"), *(BACKEND / "routers").glob("*.py")]
    )


def constructed_capability_calls() -> dict[str, str | None]:
    """Map each ``CharacterCapabilities(...)`` keyword to the function it calls.

    ``None`` where the keyword's value is not a plain function call — an
    inlined ``level >= era.x``, a local variable, a literal.
    """
    tree = ast.parse(CAPABILITIES.read_text(encoding="utf-8"))
    for node in ast.walk(tree):
        if (
            isinstance(node, ast.Call)
            and isinstance(node.func, ast.Name)
            and node.func.id == CharacterCapabilities.__name__
        ):
            return {
                kw.arg: (
                    kw.value.func.id
                    if isinstance(kw.value, ast.Call)
                    and isinstance(kw.value.func, ast.Name)
                    else None
                )
                for kw in node.keywords
                if kw.arg is not None
            }
    raise AssertionError(
        f"No {CharacterCapabilities.__name__}(...) construction found in "
        f"{CAPABILITIES.name}; this guard reads that call to see which "
        "capability flags are predicate-backed."
    )


# --- 1. the derived list: no tenth gate can be omitted -----------------------

def test_every_capability_field_is_predicate_backed_or_registered() -> None:
    unbacked = [
        field
        for field in gate_fields()
        if getattr(era_gates, predicate_name_for(field), None) is None
    ]
    assert not unbacked, (
        "Every CharacterCapabilities field is either a level gate with a "
        "same-named predicate in services.era_gates, or registered in "
        f"NOT_A_LEVEL_GATE with a reason. Neither is true of: {unbacked}. "
        "If it is a gate, name the predicate "
        f"{[predicate_name_for(f) for f in unbacked]} and state the threshold "
        "there once; if it is not, add it to NOT_A_LEVEL_GATE saying why."
    )


def test_registered_non_gates_are_still_real_fields() -> None:
    """A stale NOT_A_LEVEL_GATE entry would silently exempt a future field."""
    stale = sorted(set(NOT_A_LEVEL_GATE) - set(capability_fields()))
    assert not stale, (
        f"NOT_A_LEVEL_GATE names fields CharacterCapabilities no longer has: "
        f"{stale}. Drop them — an entry left behind exempts the next field to "
        "take that name."
    )


# --- 2. it must CALL the predicate, not restate it ---------------------------

def test_compute_capabilities_calls_the_predicate_it_advertises() -> None:
    calls = constructed_capability_calls()
    wrong = {
        field: calls.get(field)
        for field in gate_fields()
        if calls.get(field) != predicate_name_for(field)
    }
    assert not wrong, (
        "compute_capabilities must advertise each gate by calling its named "
        "predicate, so the flag and the enforcement site cannot come to mean "
        "different numbers (#1672). Expected field -> call "
        f"{ {f: predicate_name_for(f) for f in wrong} }, found {wrong} "
        "(None means the flag is computed some other way — an inlined "
        "comparison is exactly the regression this catches)."
    )


def test_construction_covers_every_capability_field() -> None:
    """A field defaulted rather than passed would dodge the check above."""
    missing = sorted(set(capability_fields()) - set(constructed_capability_calls()))
    assert not missing, (
        f"CharacterCapabilities fields not passed by keyword in "
        f"compute_capabilities: {missing}. Pass them explicitly — a field this "
        "guard cannot see in the construction is a field it cannot check."
    )


# --- 3. the behavioural matrix ----------------------------------------------

def _levels() -> list[int | None]:
    """Every level either side of every threshold, read off the era, plus None."""
    top = max(getattr(ERA_1, field) for field in gate_threshold_fields())
    return [None, *range(0, top + 2)]


def _faction_slugs() -> list[str | None]:
    # "no-such-faction" is not paranoia: may_apply_metatask and
    # may_see_retired_tasks both look a slug up, and an unknown one must fall
    # through to the level rather than raise.
    return [None, *sorted(ERA_1.factions), "no-such-faction"]


MATRIX = [
    (level, slug, is_admin)
    for level in _levels()
    for slug in _faction_slugs()
    for is_admin in (False, True)
]


@pytest.mark.parametrize("field", gate_fields())
def test_advertise_and_enforce_agree_across_the_matrix(field: str) -> None:
    predicate = getattr(era_gates, predicate_name_for(field))
    disagreements = [
        (level, slug, is_admin, advertised, enforced)
        for level, slug, is_admin in MATRIX
        if (
            advertised := getattr(
                compute_capabilities(level, is_admin, ERA_1, slug), field
            )
        )
        != (enforced := predicate(level, slug, is_admin, ERA_1))
    ]
    assert not disagreements, (
        f"/auth/me advertises {field} differently from "
        f"services.era_gates.{predicate_name_for(field)}, which every "
        "enforcement site reads. (level, faction_slug, is_admin, advertised, "
        f"predicate): {disagreements[:8]}"
    )


# --- 4. the enforcement side, structurally -----------------------------------

def test_no_module_restates_a_gate_threshold() -> None:
    """The nine thresholds are compared in ``era_gates`` and nowhere else.

    An enforcement site that writes ``stats.level < era.duel_level_required``
    for itself is a second statement of the gate, and a second statement is
    what drifts. Naming the threshold in an error message or a response field
    is fine and common — only the *comparison* is reserved.
    """
    fields = gate_threshold_fields()
    restatements = []
    for path in _python_modules():
        if path == ERA_GATES:
            continue
        tree = ast.parse(path.read_text(encoding="utf-8"))
        for node in ast.walk(tree):
            if not isinstance(node, ast.Compare):
                continue
            if not any(isinstance(op, ORDERED_OPS) for op in node.ops):
                continue
            for side in [node.left, *node.comparators]:
                if isinstance(side, ast.Attribute) and side.attr in fields:
                    restatements.append(
                        f"{path.name}:{node.lineno}: {ast.unparse(node)}"
                    )
    assert not restatements, (
        "These compare against a threshold services.era_gates owns, instead of "
        "asking the predicate that states it once. That is how the advertised "
        f"flag and the enforced rule drift apart (#1672): {restatements}"
    )


def test_every_gate_predicate_has_an_enforcement_site() -> None:
    """A predicate only the advertiser imports is a flag nothing enforces."""
    importers: dict[str, set[str]] = {name: set() for name in gate_predicate_names()}
    for path in _python_modules():
        if path == ERA_GATES:
            continue
        tree = ast.parse(path.read_text(encoding="utf-8"))
        for node in ast.walk(tree):
            if isinstance(node, ast.ImportFrom) and node.module == "services.era_gates":
                for alias in node.names:
                    if alias.name in importers:
                        importers[alias.name].add(path.stem)

    unenforced = {
        name: sorted(mods)
        for name, mods in importers.items()
        if not (mods - {ADVERTISER})
    }
    assert not unenforced, (
        "Every era gate needs a reader other than the /auth/me advertiser — a "
        "predicate only character_capabilities imports is a capability the UI "
        "offers and the API does not enforce, which is the retired-tasks half "
        f"of #1672 exactly. Importers found: {unenforced}"
    )
