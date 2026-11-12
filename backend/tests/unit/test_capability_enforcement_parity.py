"""An advertised capability and its enforcement read the same predicate (#2869).

Guards #1672 (a gate advertised but never enforced). Both sides mostly call
the same function, so a naive compare is circular; the load is carried by
structural checks: every field is predicate-backed or registered, the
construction calls the predicate, field/predicate pairing comes from the
field's name, no module restates a threshold, every predicate has a reader
besides the advertiser. No DB: pure AST plus pure functions.
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

#: The only opt-out from "must be backed by a named predicate"; give a reason.
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

#: Ordered only: faction-set membership is a Compare too, but not a threshold.
ORDERED_OPS = (ast.Lt, ast.LtE, ast.Gt, ast.GtE)


def _era_gates_tree() -> ast.Module:
    return ast.parse(ERA_GATES.read_text(encoding="utf-8"))


def gate_predicate_names() -> list[str]:
    return [
        node.name
        for node in _era_gates_tree().body
        if isinstance(node, ast.FunctionDef) and not node.name.startswith("_")
    ]


def gate_threshold_fields() -> set[str]:
    """Every ``era.<field>`` in an ordered comparison inside ``era_gates``."""
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
    """Derived, never hand-typed (#2815)."""
    return [f.name for f in dataclasses.fields(CharacterCapabilities)]


def predicate_name_for(field: str) -> str:
    """From the name, not the AST call, or the matrix test is circular."""
    return "may_" + field.removeprefix("can_")


def gate_fields() -> list[str]:
    return [f for f in capability_fields() if f not in NOT_A_LEVEL_GATE]


def _python_modules() -> list[Path]:
    return sorted(
        [*(BACKEND / "services").glob("*.py"), *(BACKEND / "routers").glob("*.py")]
    )


def constructed_capability_calls() -> dict[str, str | None]:
    """Keyword -> called function name; ``None`` if not a plain call."""
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


# 1. derived list

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
    stale = sorted(set(NOT_A_LEVEL_GATE) - set(capability_fields()))
    assert not stale, (
        f"NOT_A_LEVEL_GATE names fields CharacterCapabilities no longer has: "
        f"{stale}. Drop them — an entry left behind exempts the next field to "
        "take that name."
    )


# 2. call the predicate, don't restate it

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
    missing = sorted(set(capability_fields()) - set(constructed_capability_calls()))
    assert not missing, (
        f"CharacterCapabilities fields not passed by keyword in "
        f"compute_capabilities: {missing}. Pass them explicitly — a field this "
        "guard cannot see in the construction is a field it cannot check."
    )


# 3. behavioural matrix

def _levels() -> list[int | None]:
    top = max(getattr(ERA_1, field) for field in gate_threshold_fields())
    return [None, *range(0, top + 2)]


def _faction_slugs() -> list[str | None]:
    # An unknown slug must fall through to the level, not raise.
    return [None, *sorted(ERA_1.factions), "no-such-faction"]


MATRIX = [
    (level, slug, is_admin)
    for level in _levels()
    for slug in _faction_slugs()
    for is_admin in (False, True)
]


@pytest.mark.parametrize("field", gate_fields())
def test_advertise_and_enforce_agree_across_the_matrix(field: str) -> None:
    predicate = getattr(era_gates, predicate_name_for(field), None)
    if predicate is None:
        pytest.fail(
            f"No services.era_gates.{predicate_name_for(field)} to compare "
            f"{field} against — see "
            "test_every_capability_field_is_predicate_backed_or_registered."
        )
    disagreements = [
        (level, slug, is_admin, advertised, enforced)
        for level, slug, is_admin in MATRIX
        if (
            advertised := getattr(
                # only ``can_vote`` reads peak_level (#3102)
                compute_capabilities(
                    level, is_admin, ERA_1, slug, peak_level=level
                ),
                field,
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


# 4. enforcement side, structurally

def test_no_module_restates_a_gate_threshold() -> None:
    """Only the comparison is reserved; naming a threshold elsewhere is fine."""
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
