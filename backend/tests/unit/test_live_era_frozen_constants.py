"""A test module that moves the live era may not lean on a value frozen at import.

#3014, the follow-up to #827 / ADR-0091. ``CURRENT_ERA`` is one stable object
refreshed in place when the live era moves, so a read inside a function body —
and an ``era: EraConfig = CURRENT_ERA`` default, which holds the *object* —
follows the move. A value **derived** from it at import does not:
``OTHER_FACTION_SLUG = real_faction_slugs(CURRENT_ERA)[1]`` is a string, and so
is ``faction_slug: str = DEFAULT_FACTION_SLUG`` in a factory signature. After a
rollover both still name the old era's faction, and nothing crashes to say so.

Nothing here is a list kept by hand. Three things are read off the source:

* **what moves the live era** — every shipped function that reaches
  ``game_config.bind_live_era``, by walking the call graph back from it. A test
  module moves it by naming one of those, or by making the HTTP call a route
  among them answers, with the path as a literal first argument.
  ``apply_era_reset`` is not one: it leaves the binding to its caller.
* **what is frozen** — every name assigned outside a function body from an
  expression that reads the live era or another frozen name, through imports.
* **which factory parameters are frozen** — every default written in terms of a
  frozen name, and every function whose body calls one of those bare.

A move that lands back on the era it started in is harmless, and the source
cannot say which kind a ``reset_era(session, ...)`` is. A module that moves the
era, leans on a frozen value, and is right to, says so itself by assigning
:data:`SAME_ERA_MARKER` a reason. Nothing is skipped silently.

**Known limits.** This is a static scan, so green is not proof. It cannot see:
a value frozen through a function call (``SLUG = _default()``,
``def f(slug=_default())``); a test-side helper that pulls the lever for
another module; a mover reached by a dotted path
(``services.era.rebind_live_era``), ``getattr`` or ``functools.partial``;
decorators and defaults on test-class methods; a mover URL built from parts or
held in a variable; a pytest fixture that seats rows with a frozen default.
"""

import ast
import functools
from collections.abc import Iterator
from dataclasses import dataclass, field
from pathlib import Path
from typing import NamedTuple

BACKEND_ROOT = Path(__file__).resolve().parents[2]
TESTS_ROOT = BACKEND_ROOT / "tests"

#: The name every module knows the live ruleset by (``game_config``).
LIVE_ERA_NAME = "CURRENT_ERA"
#: The one lever that moves it (ADR-0091). Everything else is found from here.
LIVE_ERA_LEVER = "bind_live_era"

#: A module that moves the live era, but only ever back onto the era it started
#: in, assigns this at module level to a string saying why that is certain::
#:
#:     LIVE_ERA_ONLY_EVER_REBOUND_TO_ITSELF = "re-opens the era the row names"
#:
#: Assigned, not commented, so the exemption is greppable and cannot be left
#: empty. It is a claim this scan cannot check — a reviewer reads the reason.
SAME_ERA_MARKER = "LIVE_ERA_ONLY_EVER_REBOUND_TO_ITSELF"

Function = ast.FunctionDef | ast.AsyncFunctionDef
Assignment = ast.Assign | ast.AnnAssign | ast.AugAssign

#: ``(file, name)`` — the one identity a name has across modules.
Symbol = tuple[Path, str]
#: ``(http method, path)`` of a route that moves the live era.
Route = tuple[str, str]


class Offence(NamedTuple):
    module: str
    moves: str
    leans: list[str]


@dataclass
class ModuleFacts:
    """What one module's source says, resolved as far as its imports allow."""

    tree: ast.Module
    #: Local name -> the symbol it was imported as (``from x import y as z``).
    imported: dict[str, Symbol] = field(default_factory=dict)
    #: Local name -> the file an ``import x`` bound it to.
    modules: dict[str, Path] = field(default_factory=dict)
    #: Top-level functions, by name.
    functions: dict[str, Function] = field(default_factory=dict)
    #: Names holding the live era *object* — it and its module-level aliases.
    era_objects: set[str] = field(default_factory=lambda: {LIVE_ERA_NAME})
    #: Names assigned at import from the live era or from another frozen name.
    frozen: set[str] = field(default_factory=set)
    #: Function -> the parameters whose default is frozen. A dotted entry
    #: (``make_task.faction_slug``) is one the function leaves unfilled in its
    #: own body, which no caller can fill.
    frozen_parameters: dict[str, set[str]] = field(default_factory=dict)


World = dict[Path, ModuleFacts]


def _module_file(dotted_name: str, known: frozenset[Path]) -> Path | None:
    """The backend file ``import dotted_name`` loads, or None if not ours."""
    base = BACKEND_ROOT.joinpath(*dotted_name.split("."))
    candidates = (base.with_suffix(".py"), base / "__init__.py")
    return next((path for path in candidates if path in known), None)


def _read_module(source: str, path: Path, known: frozenset[Path]) -> ModuleFacts:
    tree = ast.parse(source)
    facts = ModuleFacts(tree=tree)
    package = ".".join(path.relative_to(BACKEND_ROOT).parts[:-1])
    for node in ast.walk(tree):
        if isinstance(node, ast.ImportFrom):
            # ``from .factories import x`` is the one relative form in use.
            prefix = package if node.level == 1 else None
            dotted = ".".join(part for part in (prefix, node.module) if part)
            for alias in node.names:
                # ``from tests.integration import factories`` binds a module.
                submodule = _module_file(f"{dotted}.{alias.name}", known)
                if submodule:
                    facts.modules[alias.asname or alias.name] = submodule
                elif target := _module_file(dotted, known):
                    facts.imported[alias.asname or alias.name] = (target, alias.name)
        elif isinstance(node, ast.Import):
            for alias in node.names:
                root = alias.name.split(".")[0]
                if alias.asname and (target := _module_file(alias.name, known)):
                    facts.modules[alias.asname] = target
                elif target := _module_file(root, known):
                    facts.modules[root] = target
    for node in tree.body:
        if isinstance(node, Function):
            facts.functions[node.name] = node
    return facts


def _held(function: Function) -> list[ast.expr]:
    """What a ``def`` evaluates at import: its decorators and its defaults."""
    arguments = function.args
    defaults = [*arguments.defaults, *filter(None, arguments.kw_defaults)]
    return [*function.decorator_list, *defaults]


def _at_import(node: ast.AST) -> Iterator[ast.AST]:
    """Every node under ``node`` that runs when the module is imported.

    A function body does not, and neither does a lambda's; a function's
    decorators and its default arguments do.
    """
    for child in ast.iter_child_nodes(node):
        if isinstance(child, ast.Lambda):
            continue
        for part in _held(child) if isinstance(child, Function) else [child]:
            yield part
            yield from _at_import(part)


def _symbol(node: ast.AST, path: Path, facts: ModuleFacts) -> Symbol | None:
    """What a name or a ``module.attribute`` refers to, across imports."""
    if isinstance(node, ast.Name):
        return facts.imported.get(node.id, (path, node.id))
    if isinstance(node, ast.Attribute) and isinstance(node.value, ast.Name):
        if node.value.id in facts.modules:
            return (facts.modules[node.value.id], node.attr)
    return None


def _is_the_era_object(node: ast.AST, path: Path, facts: ModuleFacts) -> bool:
    symbol = _symbol(node, path, facts)
    if symbol is None:
        return False
    # By its own name anywhere, or by a module-level alias of it in this module.
    return symbol[1] == LIVE_ERA_NAME or (
        symbol[0] == path and symbol[1] in facts.era_objects
    )


def _frozen_reads(expression: ast.AST, path: Path, world: World) -> bool:
    """Whether ``expression`` reads something frozen when evaluated at import.

    Holding the era *object* is not that — ``era=CURRENT_ERA`` is the shape
    that follows a move. Reading anything **off** it is.
    """
    facts = world[path]
    if _is_the_era_object(expression, path, facts):
        return False
    for node in (expression, *_at_import(expression)):
        symbol = _symbol(node, path, facts)
        if symbol is None:
            continue
        if _is_the_era_object(node, path, facts):
            return True
        if symbol[0] in world and symbol[1] in world[symbol[0]].frozen:
            return True
    return False


def _assigned_names(statement: Assignment) -> list[str]:
    targets = (
        statement.targets if isinstance(statement, ast.Assign) else [statement.target]
    )
    return [
        node.id
        for target in targets
        for node in ast.walk(target)
        if isinstance(node, ast.Name)
    ]


def _unfilled(call: ast.Call, path: Path, world: World) -> tuple[str, list[str]] | None:
    """``(function, [frozen parameters this call leaves to their default])``."""
    symbol = _symbol(call.func, path, world[path])
    if symbol is None or symbol[0] not in world:
        return None
    owner = world[symbol[0]]
    frozen = owner.frozen_parameters.get(symbol[1])
    if not frozen:
        return None
    # ponytail: a ``*args`` / ``**kwargs`` call is taken as filling everything,
    # since what it carries is not in the source. No test splats a factory
    # today; resolve the splat if one ever does.
    splatted = any(isinstance(argument, ast.Starred) for argument in call.args)
    if splatted or any(keyword.arg is None for keyword in call.keywords):
        return None
    arguments = owner.functions[symbol[1]].args
    positional = [argument.arg for argument in arguments.posonlyargs + arguments.args]
    filled = set(positional[: len(call.args)])
    filled.update(keyword.arg for keyword in call.keywords)
    left = sorted(frozen - filled)
    return (symbol[1], left) if left else None


def _derive(path: Path, world: World) -> None:
    """One pass over one module: what its source adds to what is known so far."""
    facts = world[path]
    for name, (source, original) in facts.imported.items():
        if source in world and original in world[source].frozen:
            facts.frozen.add(name)
    for node in _at_import(facts.tree):
        if not isinstance(node, Assignment) or node.value is None:
            continue
        if _is_the_era_object(node.value, path, facts):
            facts.era_objects.update(_assigned_names(node))
        elif _frozen_reads(node.value, path, world):
            facts.frozen.update(_assigned_names(node))
    for name, function in facts.functions.items():
        parameters = facts.frozen_parameters.setdefault(name, set())
        arguments = function.args
        positional = arguments.posonlyargs + arguments.args
        defaults = arguments.defaults
        pairs = [
            *zip(positional[len(positional) - len(defaults) :], defaults),
            *zip(arguments.kwonlyargs, arguments.kw_defaults),
        ]
        for parameter, default in pairs:
            if default is not None and _frozen_reads(default, path, world):
                parameters.add(parameter.arg)
        # A factory that calls another bare leans on its default (``make_duel``
        # builds its task that way). Already dotted is already somebody else's.
        for node in ast.walk(function):
            inner = _unfilled(node, path, world) if isinstance(node, ast.Call) else None
            if inner and inner[0] != name:
                parameters.update(
                    left if "." in left else f"{inner[0]}.{left}" for left in inner[1]
                )


def _settle(world: World, paths: list[Path]) -> None:
    """Derive the frozen names and parameters of ``paths``, to a fixed point.

    A fixed point because both travel: a constant frozen in one module freezes
    whatever another module builds from it, and a factory that leans on a
    frozen default makes a leaner of whatever calls it bare.
    """

    def known() -> int:
        return sum(
            len(facts.frozen)
            + len(facts.era_objects)
            + sum(map(len, facts.frozen_parameters.values()))
            for facts in map(world.get, paths)
        )

    before = -1
    while before != known():
        before = known()
        for path in paths:
            _derive(path, world)


def _is_a_test_module(path: Path) -> bool:
    return TESTS_ROOT in path.parents


@functools.cache
def _backend() -> World:
    """Every backend module on disk, parsed and settled. Read-only once built."""
    paths = frozenset(
        path
        for path in BACKEND_ROOT.rglob("*.py")
        if not {".venv", "alembic"} & set(path.parts)
    )
    world = {
        path: _read_module(path.read_text(encoding="utf-8"), path, paths)
        for path in paths
    }
    _settle(world, list(world))
    return world


@functools.cache
def _era_movers() -> tuple[set[Symbol], set[Route]]:
    """Every shipped function that reaches the lever, and the routes among them."""
    world = {
        path: facts
        for path, facts in _backend().items()
        if not _is_a_test_module(path)
    }
    movers: set[Symbol] = {
        (path, LIVE_ERA_LEVER)
        for path, facts in world.items()
        if LIVE_ERA_LEVER in facts.functions
    }
    before = 0
    while before != len(movers):
        before = len(movers)
        for path, facts in world.items():
            for name, function in facts.functions.items():
                if any(
                    isinstance(node, ast.Call)
                    and _symbol(node.func, path, facts) in movers
                    for node in ast.walk(function)
                ):
                    movers.add((path, name))
    routes: set[Route] = set()
    for path, name in movers:
        # ``@router.put("/eras/live", ...)`` -> ("put", "/eras/live").
        for decorator in world[path].functions[name].decorator_list:
            if isinstance(decorator, ast.Call) and decorator.args:
                route = decorator.args[0]
                if isinstance(decorator.func, ast.Attribute) and isinstance(
                    route, ast.Constant
                ):
                    if str(route.value).startswith("/"):
                        routes.add((decorator.func.attr, route.value))
    return movers, routes


def _how_it_moves_the_era(path: Path, world: World) -> str | None:
    """What in this module moves the live era, or None if nothing does."""
    movers, routes = _era_movers()
    facts = world[path]
    for node in ast.walk(facts.tree):
        symbol = _symbol(node, path, facts)
        if symbol in movers:
            return f"{symbol[1]}()"
        if not (isinstance(node, ast.Call) and node.args):
            continue
        # ``client.put("/admin/eras/live", ...)``: the router prefix is not in
        # the decorator, so match the tail — and the method, so a GET does not.
        called, url = node.func, node.args[0]
        for method, route in routes:
            if isinstance(called, ast.Attribute) and called.attr == method:
                if isinstance(url, ast.Constant) and str(url.value).endswith(route):
                    return f"{method.upper()} {route}"
    return None


def _marker_reason(facts: ModuleFacts) -> str | None:
    for statement in facts.tree.body:
        if isinstance(
            statement, ast.Assign | ast.AnnAssign
        ) and SAME_ERA_MARKER in _assigned_names(statement):
            value = statement.value
            if isinstance(value, ast.Constant) and isinstance(value.value, str):
                return value.value.strip() or None
    return None


def _frozen_dependencies(path: Path, world: World) -> list[str]:
    """Every way the module at ``path`` leans on a value frozen at import."""
    facts = world[path]
    found: set[tuple[int, str]] = set()
    for node in ast.walk(facts.tree):
        if isinstance(node, ast.ImportFrom | ast.Import):
            for alias in node.names:
                local = alias.asname or alias.name
                if local in facts.imported and local in facts.frozen:
                    what = f"imports {alias.name}, which was derived from the live era"
                    found.add((node.lineno, f"{what} when its module was imported"))
        elif isinstance(node, ast.Attribute):
            symbol = _symbol(node, path, facts)
            if symbol and symbol[0] in world and symbol[1] in world[symbol[0]].frozen:
                what = f"reads {ast.unparse(node)}, which was derived from"
                found.add((node.lineno, f"{what} the live era at import"))
        elif isinstance(node, ast.Call) and (unfilled := _unfilled(node, path, world)):
            what = f"{unfilled[0]}(...) leaves {', '.join(unfilled[1])}"
            found.add((node.lineno, f"{what} to a default frozen at import"))
    # The module's own derivations, with no import involved.
    built = [
        (node.value, f"assigns {', '.join(_assigned_names(node))}")
        for node in _at_import(facts.tree)
        if isinstance(node, Assignment) and node.value is not None
    ]
    built += [
        (expression, "builds a decorator or default argument")
        for function in facts.functions.values()
        for expression in _held(function)
    ]
    for expression, what in built:
        if _frozen_reads(expression, path, world):
            what += " from the live era outside a function body"
            found.add((expression.lineno, f"{what}, so the value is fixed at import"))
    return [f"line {line}: {text}" for line, text in sorted(found)]


def frozen_era_offences(overrides: dict[Path, str] | None = None) -> list[Offence]:
    """Test modules that move the live era and lean on a frozen value.

    ``overrides`` lets a caller put synthetic source at a path, which is how the
    tests below show the guard failing without adding a bad module to the suite.
    """
    # ponytail: overrides are settled against the disk and each other, and the
    # disk is not re-settled against them — so they must be modules nothing on
    # disk imports. True of every synthetic case below.
    overrides = overrides or {}
    world = dict(_backend())
    known = frozenset(world) | overrides.keys()
    for path, source in overrides.items():
        world[path] = _read_module(source, path, known)
    _settle(world, list(overrides))
    offences = []
    for path in sorted(filter(_is_a_test_module, world)):
        moves = _how_it_moves_the_era(path, world)
        leans = _frozen_dependencies(path, world) if moves else []
        if moves and leans and not _marker_reason(world[path]):
            module = str(path.relative_to(BACKEND_ROOT))
            offences.append(Offence(module, moves, leans))
    return offences


def _format(offences: list[Offence]) -> str:
    lines = [
        "A test module that moves the live era must not depend on a value "
        "frozen at import (#3014, ADR-0091). After the move it still names "
        "the old era's faction, and nothing crashes to say so.",
        "",
        "The fix: read it off the era at call time, inside the test — e.g. "
        "`faction_slug=real_faction_slugs(CURRENT_ERA)[0]` passed to the "
        "factory — instead of importing the constant or taking the factory's "
        "default. Do NOT turn the constant into a function call in a default "
        "argument: a default is evaluated at import too.",
        "",
        "A dotted entry (`make_task.faction_slug`) is a default the factory "
        "takes inside its own body, which no argument of yours fills: build "
        "those rows with the single-row factories instead.",
        "",
        "If the module only ever rebinds the era it started in, say so: "
        f'`{SAME_ERA_MARKER} = "<why that is certain>"` at module level.',
    ]
    for offence in offences:
        lines += ["", f"{offence.module} — moves the live era via {offence.moves}:"]
        lines += [f"  {lean}" for lean in offence.leans]
    return "\n".join(lines)


def test_no_module_that_moves_the_live_era_depends_on_a_frozen_value() -> None:
    offences = frozen_era_offences()
    assert not offences, _format(offences)


# ---------------------------------------------------------------------------
# The guard itself, against source that does not exist on disk — its own
# factories included, so no edit to the real suite turns these red.
# ---------------------------------------------------------------------------

_FACTORIES = TESTS_ROOT / "integration" / "synthetic_3014_factories.py"
_DOWNSTREAM = TESTS_ROOT / "integration" / "synthetic_3014_downstream.py"
_MODULE = TESTS_ROOT / "integration" / "test_synthetic_3014.py"

_SYNTHETIC_SUITE = {
    _FACTORIES: (
        "from game_config import CURRENT_ERA\n"
        "FIRST_SLUG = sorted(CURRENT_ERA.factions)[0]\n"
        "def make_row(era=CURRENT_ERA, slug: str = FIRST_SLUG): ...\n"
        "def make_pair(left: str = FIRST_SLUG):\n"
        "    make_row(slug=left)\n"
        "    make_row()\n"
    ),
    _DOWNSTREAM: (
        f"from tests.integration.{_FACTORIES.stem} import FIRST_SLUG\n"
        "OTHER_SLUG = FIRST_SLUG.upper()\n"
    ),
}
_HEAD = (
    "from game_config import CURRENT_ERA, bind_live_era\n"
    f"from tests.integration.{_FACTORIES.stem} import make_pair, make_row\n"
)
_MOVE = "def test_it():\n    bind_live_era(CURRENT_ERA)\n"


def _offence(source: str) -> Offence | None:
    offences = frozen_era_offences({**_SYNTHETIC_SUITE, _MODULE: source})
    return next((one for one in offences if one.module.endswith(_MODULE.name)), None)


def test_the_scan_finds_what_moves_the_live_era() -> None:
    """Shipped code, not the suite: an empty mover set would pass everything."""
    movers, routes = _era_movers()
    names = {name for _, name in movers}
    assert len(names) > 1 and routes
    # It flushes and leaves the binding to its caller (test_live_era_binding).
    assert "apply_era_reset" not in names


def test_importing_a_frozen_constant_into_a_module_that_moves_the_era_fails() -> None:
    offence = _offence(
        f"from tests.integration.{_FACTORIES.stem} import FIRST_SLUG\n" + _HEAD + _MOVE
    )
    assert offence and offence.moves == f"{LIVE_ERA_LEVER}()"
    assert "imports FIRST_SLUG" in offence.leans[0]
    assert "read it off the era at call time" in _format([offence])


def test_a_constant_derived_from_an_imported_frozen_one_is_frozen_too() -> None:
    offence = _offence(
        f"from tests.integration import {_DOWNSTREAM.stem}\n"
        + _HEAD
        + _MOVE
        + f"    make_row(slug={_DOWNSTREAM.stem}.OTHER_SLUG)\n"
    )
    assert offence and f"reads {_DOWNSTREAM.stem}.OTHER_SLUG" in offence.leans[0]


def test_taking_a_factory_s_frozen_default_fails_and_filling_it_passes() -> None:
    offence = _offence(_HEAD + _MOVE + "    make_row()\n")
    assert offence and offence.leans == [
        "line 5: make_row(...) leaves slug to a default frozen at import"
    ]
    read_at_call_time = "    make_row(slug=sorted(CURRENT_ERA.factions)[0])\n"
    assert not _offence(_HEAD + _MOVE + read_at_call_time)


def test_a_factory_that_takes_a_frozen_default_inside_itself_fails_too() -> None:
    offence = _offence(_HEAD + _MOVE + "    make_pair(left='x')\n")
    assert offence and "make_pair(...) leaves make_row.slug" in offence.leans[0]


def test_deriving_from_the_live_era_at_module_level_fails_without_an_import() -> None:
    offence = _offence(
        "import pytest\n"
        + _HEAD
        + "MINE = sorted(CURRENT_ERA.factions)[0]\n"
        + "@pytest.mark.parametrize('slug', CURRENT_ERA.factions)\n"
        + _MOVE
    )
    assert offence and [lean.split(" from ")[0] for lean in offence.leans] == [
        "line 4: assigns MINE",
        "line 5: builds a decorator or default argument",
    ]


def test_the_era_object_as_a_default_argument_passes() -> None:
    """``era=CURRENT_ERA`` holds the object, which is refreshed in place."""
    assert not _offence(
        _HEAD + "def read(era=CURRENT_ERA): ...\n" + _MOVE + "    read()\n"
    )


def test_a_module_that_never_moves_the_era_may_use_frozen_values() -> None:
    assert not _offence(_HEAD + "def test_it():\n    make_row()\n")


def test_only_the_mutating_call_to_a_mover_route_counts() -> None:
    method, route = sorted(_era_movers()[1])[0]
    source = _HEAD + "def test_it(client):\n    client.{}('/admin{}')\n    make_row()\n"
    offence = _offence(source.format(method, route))
    assert offence and offence.moves == f"{method.upper()} {route}"
    assert not _offence(source.format("options", route))


def test_the_same_era_marker_exempts_a_module_only_with_a_reason() -> None:
    leaning = _HEAD + _MOVE + "    make_row()\n"
    assert _offence(leaning)
    assert _offence(f'{SAME_ERA_MARKER} = ""\n' + leaning)
    assert not _offence(f'{SAME_ERA_MARKER} = "the row names era_1"\n' + leaning)
    assert not _offence(f'{SAME_ERA_MARKER}: str = "the row names era_1"\n' + leaning)
