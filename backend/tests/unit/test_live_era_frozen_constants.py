"""A test module that moves the live era may not lean on a value frozen at import.

#3014, the follow-up to #827 / ADR-0091. ``CURRENT_ERA`` is one stable object
whose fields are refreshed in place when the live era moves, so a read inside a
function body — and an ``era: EraConfig = CURRENT_ERA`` default, which holds the
*object* — follows the move. A value **derived** from it when a module is
imported does not: ``OTHER_FACTION_SLUG = real_faction_slugs(CURRENT_ERA)[1]``
is a string, and it goes on naming the old era's faction after a rollover. So
does ``faction_slug: str = DEFAULT_FACTION_SLUG`` in a factory signature, which
is why a test can go stale without importing a single constant.

Nothing crashes when that happens. The test seats a character in a faction the
new era does not carry and can still pass. Hence a guard rather than a habit.

Nothing here is a list kept by hand. Three things are read off the source:

* **what moves the live era** — every shipped function that reaches
  ``game_config.bind_live_era``, by walking the call graph back from it, plus
  the path of any route among them. ``apply_era_reset`` is *not* one of them: it
  flushes and leaves the binding to its caller, and
  ``test_live_era_binding.py`` pins that. If it ever binds again it joins this
  set by itself, and so does every test module that calls it.
* **what is frozen** — every name assigned outside a function body from an
  expression that reads the live era, or reads another frozen name, followed
  through imports until nothing new turns up.
* **which factory parameters are frozen** — every default written in terms of a
  frozen name, and every function whose body calls one of those and leaves the
  parameter to its default (``make_duel`` builds its task that way).

A move that lands back on the era it started in is harmless, and the source
cannot say which kind a ``reset_era(session, ...)`` is — it re-opens whatever
the latest ``Era`` row names, which is the database's answer. So a module that
moves the era, leans on a frozen value, and is right to, says so itself: it
assigns :data:`SAME_ERA_MARKER` a reason. One module on ``main`` does
(``test_duel_era_resolution.py``). Nothing is skipped silently.
"""

import ast
import functools
from dataclasses import dataclass, field
from pathlib import Path

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

_FUNCTIONS = (ast.FunctionDef, ast.AsyncFunctionDef)
_ASSIGNMENTS = (ast.Assign, ast.AnnAssign, ast.AugAssign)

#: ``(file, name)`` — the one identity a name has across modules.
Symbol = tuple[Path, str]


@dataclass
class ModuleFacts:
    """What one module's source says, resolved as far as its imports allow."""

    tree: ast.Module
    #: Local name -> the symbol it was imported as (``from x import y as z``).
    imported: dict[str, Symbol] = field(default_factory=dict)
    #: Local name -> the file an ``import x`` bound it to.
    modules: dict[str, Path] = field(default_factory=dict)
    #: Top-level functions, by name.
    functions: dict[str, ast.FunctionDef | ast.AsyncFunctionDef] = field(
        default_factory=dict
    )
    #: Names holding the live era *object* — it and its module-level aliases.
    era_objects: set[str] = field(default_factory=lambda: {LIVE_ERA_NAME})
    #: Names assigned at import from the live era or from another frozen name.
    frozen: set[str] = field(default_factory=set)
    #: Function -> the parameters whose default is frozen. A dotted entry
    #: (``make_task.faction_slug``) is one the function leaves unfilled in its
    #: own body, which no caller can fill.
    frozen_parameters: dict[str, set[str]] = field(default_factory=dict)


def _module_file(dotted_name: str | None) -> Path | None:
    """The backend file ``import dotted_name`` loads, or None if not ours."""
    if not dotted_name:
        return None
    base = BACKEND_ROOT.joinpath(*dotted_name.split("."))
    for candidate in (base.with_suffix(".py"), base / "__init__.py"):
        if candidate.exists():
            return candidate
    return None


def _read_module(source: str, path: Path) -> ModuleFacts:
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
                submodule = _module_file(f"{dotted}.{alias.name}")
                if submodule:
                    facts.modules[alias.asname or alias.name] = submodule
                elif target := _module_file(dotted):
                    facts.imported[alias.asname or alias.name] = (target, alias.name)
        elif isinstance(node, ast.Import):
            for alias in node.names:
                if alias.asname and (target := _module_file(alias.name)):
                    facts.modules[alias.asname] = target
                elif target := _module_file(alias.name.split(".")[0]):
                    facts.modules[alias.name.split(".")[0]] = target
    for node in tree.body:
        if isinstance(node, _FUNCTIONS):
            facts.functions[node.name] = node
    return facts


def _at_import(node: ast.AST):
    """Every node under ``node`` that runs when the module is imported.

    A function body does not, and neither does a lambda's; a function's
    decorators and its default arguments do.
    """
    for child in ast.iter_child_nodes(node):
        if isinstance(child, ast.Lambda):
            continue
        if isinstance(child, _FUNCTIONS):
            arguments = child.args
            held = [*child.decorator_list, *arguments.defaults, *arguments.kw_defaults]
            for expression in filter(None, held):
                yield expression
                yield from _at_import(expression)
            continue
        yield child
        yield from _at_import(child)


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


def _frozen_reads(
    expression: ast.AST, path: Path, world: dict[Path, ModuleFacts]
) -> list[str]:
    """The frozen things ``expression`` reads when it is evaluated at import.

    Holding the era *object* is not one of them — ``era=CURRENT_ERA`` is the
    shape that follows a move. Reading anything **off** it is.
    """
    facts = world[path]
    if _is_the_era_object(expression, path, facts):
        return []
    found = []
    for node in (expression, *_at_import(expression)):
        symbol = _symbol(node, path, facts)
        if symbol is None:
            continue
        if _is_the_era_object(node, path, facts):
            found.append(f"{LIVE_ERA_NAME} (read at import)")
        elif symbol[0] in world and symbol[1] in world[symbol[0]].frozen:
            found.append(symbol[1])
    return found


def _assigned_names(statement: ast.stmt) -> list[str]:
    targets = statement.targets if isinstance(statement, ast.Assign) else [
        statement.target
    ]
    return [
        node.id
        for target in targets
        for node in ast.walk(target)
        if isinstance(node, ast.Name)
    ]


def _unfilled(
    call: ast.Call, path: Path, world: dict[Path, ModuleFacts]
) -> tuple[str, list[str]] | None:
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


def _settle(world: dict[Path, ModuleFacts], paths: list[Path]) -> None:
    """Derive the frozen names and frozen parameters of ``paths``, to a fixed point.

    A fixed point because both travel: a constant frozen in one module freezes
    whatever another module builds from it, and a factory that leans on a
    frozen default makes a leaner of whatever calls it bare.
    """
    changed = True
    while changed:
        changed = False
        for path in paths:
            facts = world[path]
            before = (
                len(facts.frozen),
                len(facts.era_objects),
                sum(map(len, facts.frozen_parameters.values())),
            )
            for name, (source, original) in facts.imported.items():
                if source in world and original in world[source].frozen:
                    facts.frozen.add(name)
            for node in (*facts.tree.body, *_at_import(facts.tree)):
                if not isinstance(node, _ASSIGNMENTS) or node.value is None:
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
                for node in ast.walk(function):
                    if isinstance(node, ast.Call):
                        inner = _unfilled(node, path, world)
                        if inner and inner[0] != name:
                            parameters.update(
                                # Already dotted means already somebody else's.
                                left if "." in left else f"{inner[0]}.{left}"
                                for left in inner[1]
                            )
            after = (
                len(facts.frozen),
                len(facts.era_objects),
                sum(map(len, facts.frozen_parameters.values())),
            )
            changed = changed or after != before


@functools.cache
def _era_movers() -> tuple[set[Symbol], set[str]]:
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
    changed = True
    while changed:
        changed = False
        for path, facts in world.items():
            for name, function in facts.functions.items():
                if (path, name) in movers:
                    continue
                if any(
                    isinstance(node, ast.Call)
                    and _symbol(node.func, path, facts) in movers
                    for node in ast.walk(function)
                ):
                    movers.add((path, name))
                    changed = True
    routes = set()
    for path, name in movers:
        for decorator in world[path].functions[name].decorator_list:
            if isinstance(decorator, ast.Call) and decorator.args:
                route = decorator.args[0]
                if isinstance(route, ast.Constant) and isinstance(route.value, str):
                    if route.value.startswith("/"):
                        routes.add(route.value)
    return movers, routes


def _how_it_moves_the_era(
    path: Path, world: dict[Path, ModuleFacts], movers: set[Symbol], routes: set[str]
) -> str | None:
    """What in this module moves the live era, or None if nothing does."""
    facts = world[path]
    for node in ast.walk(facts.tree):
        symbol = _symbol(node, path, facts)
        if symbol in movers and symbol[0] != path:
            return f"{symbol[1]}()"
        if isinstance(node, ast.Constant) and isinstance(node.value, str):
            # The router prefix is not in the decorator, so match the tail.
            for route in routes:
                if node.value.endswith(route):
                    return f"the {route} route"
    # Its own functions count too: a fixture that pulls the lever directly.
    for name in facts.functions:
        if (path, name) in movers:
            return f"{name}()"
    return None


def _marker_reason(facts: ModuleFacts) -> str | None:
    for statement in facts.tree.body:
        if isinstance(statement, ast.Assign) and SAME_ERA_MARKER in _assigned_names(
            statement
        ):
            value = statement.value
            if isinstance(value, ast.Constant) and isinstance(value.value, str):
                return value.value.strip() or None
    return None


def _frozen_dependencies(path: Path, world: dict[Path, ModuleFacts]) -> list[str]:
    """Every way the module at ``path`` leans on a value frozen at import."""
    facts = world[path]
    found = set()
    for node in ast.walk(facts.tree):
        if isinstance(node, (ast.ImportFrom, ast.Import)):
            for alias in node.names:
                local = alias.asname or alias.name
                if local in facts.imported and local in facts.frozen:
                    found.add(
                        f"line {node.lineno}: imports {alias.name}, which was "
                        "derived from the live era when its module was imported"
                    )
        elif isinstance(node, ast.Attribute):
            symbol = _symbol(node, path, facts)
            if symbol and symbol[0] != path and symbol[0] in world:
                if symbol[1] in world[symbol[0]].frozen:
                    found.add(
                        f"line {node.lineno}: reads {node.value.id}.{node.attr}, "
                        "which was derived from the live era at import"
                    )
        elif isinstance(node, ast.Call):
            unfilled = _unfilled(node, path, world)
            if unfilled:
                found.add(
                    f"line {node.lineno}: {unfilled[0]}(...) leaves "
                    f"{', '.join(unfilled[1])} to a default frozen at import"
                )
    held_by_functions = [
        expression
        for function in facts.functions.values()
        for expression in (
            *function.decorator_list,
            *function.args.defaults,
            *function.args.kw_defaults,
        )
        if expression is not None
    ]
    for node in (*_at_import(facts.tree), *held_by_functions):
        if isinstance(node, _ASSIGNMENTS) and node.value is not None:
            reads, what = node.value, f"assigns {', '.join(_assigned_names(node))}"
        elif node in held_by_functions:
            reads, what = node, "a decorator or default argument is built"
        else:
            continue
        if _frozen_reads(reads, path, world):
            found.add(
                f"line {node.lineno}: {what} from the live era outside a "
                "function body, so the value is fixed at import"
            )
    return sorted(found, key=lambda entry: int(entry.split(":")[0].split()[1]))


@functools.cache
def _backend() -> dict[Path, ModuleFacts]:
    """Every backend module on disk, parsed and settled. Read-only once built."""
    world = {
        path: _read_module(path.read_text(encoding="utf-8"), path)
        for path in BACKEND_ROOT.rglob("*.py")
        if not {".venv", "alembic"} & set(path.parts)
    }
    _settle(world, list(world))
    return world


def _is_a_test_module(path: Path) -> bool:
    return TESTS_ROOT in path.parents


def frozen_era_offences(overrides: dict[Path, str] | None = None) -> dict[str, dict]:
    """Test modules that move the live era and lean on a frozen value.

    ``overrides`` lets a caller put synthetic source at a path, which is how the
    tests below show the guard failing without adding a bad module to the suite.

    Returns ``{module: {"moves": how, "leans": [...]}}``.
    """
    # ponytail: an override is settled against the disk, and the disk is not
    # re-settled against it — so it must be a module nothing else imports. True
    # of every synthetic case below; re-settle the lot if that ever changes.
    world = dict(_backend())
    for path, source in (overrides or {}).items():
        world[path] = _read_module(source, path)
    _settle(world, list(overrides or {}))
    movers, routes = _era_movers()
    offences = {}
    for path in sorted(world):
        if not _is_a_test_module(path):
            continue
        moves = _how_it_moves_the_era(path, world, movers, routes)
        leans = _frozen_dependencies(path, world) if moves else []
        if leans and not _marker_reason(world[path]):
            offences[str(path.relative_to(BACKEND_ROOT))] = {
                "moves": moves,
                "leans": leans,
            }
    return offences


def _format(offences: dict[str, dict]) -> str:
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
    for module, offence in offences.items():
        lines += ["", f"{module} — moves the live era via {offence['moves']}:"]
        lines += [f"  {lean}" for lean in offence["leans"]]
    return "\n".join(lines)


def test_no_module_that_moves_the_live_era_depends_on_a_frozen_value():
    offences = frozen_era_offences()
    assert not offences, _format(offences)


# ---------------------------------------------------------------------------
# The guard itself, against source that does not exist on disk
# ---------------------------------------------------------------------------

_SYNTHETIC = TESTS_ROOT / "integration" / "test_synthetic_for_issue_3014.py"
_SYNTHETIC_NAME = str(_SYNTHETIC.relative_to(BACKEND_ROOT))

_ROLLS_INTO_ANOTHER_ERA = '''
async def test_it(client, auth_headers, db_session, test_era):
    await client.put(
        "/admin/eras/live", json={"config_key": "era_2"}, headers=auth_headers
    )
'''


def _offence(source: str) -> dict | None:
    return frozen_era_offences({_SYNTHETIC: source}).get(_SYNTHETIC_NAME)


def test_the_scan_finds_the_frozen_set_and_the_factories_frozen_parameters():
    """Derived, not listed: these are what the source says today."""
    world = _backend()
    factories = world[TESTS_ROOT / "integration" / "factories.py"]
    assert "DEFAULT_FACTION_SLUG" in factories.frozen
    assert factories.frozen_parameters["make_character"] == {"faction_slug"}
    assert factories.frozen_parameters["make_task"] == {"faction_slug"}
    # Its own two, and the task it builds bare — which no caller can fill.
    assert factories.frozen_parameters["make_duel"] == {
        "challenger_faction",
        "opponent_faction",
        "make_character.faction_slug",
        "make_task.faction_slug",
    }
    # The era object as a default is the shape that follows a move.
    assert not factories.frozen_parameters["make_account"]
    downstream = [path for path, facts in world.items() if facts.frozen]
    assert len(downstream) > 1, "the frozen set should travel through imports"


def test_the_scan_finds_what_moves_the_live_era():
    movers, routes = _era_movers()
    names = {name for _, name in movers}
    assert {"rebind_live_era", "commit_and_bind_live_era", "roll_into_era"} <= names
    assert "reset_era" in names
    assert "/eras/live" in routes
    # It flushes and leaves the binding to its caller (test_live_era_binding).
    assert "apply_era_reset" not in names


def test_importing_a_frozen_constant_into_a_module_that_moves_the_era_fails():
    offence = _offence(
        "from tests.integration.factories import DEFAULT_FACTION_SLUG, "
        "make_character\n"
        + _ROLLS_INTO_ANOTHER_ERA
        + "    await make_character(db_session, test_era, username='a',"
        " faction_slug=DEFAULT_FACTION_SLUG)\n"
    )
    assert offence and "the /eras/live route" in offence["moves"]
    assert any("imports DEFAULT_FACTION_SLUG" in lean for lean in offence["leans"])
    assert "read it off the era at call time" in _format({_SYNTHETIC_NAME: offence})


def test_a_constant_derived_from_a_frozen_one_is_frozen_too():
    """The downstream shape nineteen modules use, imported from one of them."""
    offence = _offence(
        "from tests.integration.test_tasks import OTHER_FACTION_SLUG\n"
        + _ROLLS_INTO_ANOTHER_ERA
    )
    assert offence, "test_tasks.OTHER_FACTION_SLUG should have joined the set"


def test_taking_a_factory_s_frozen_default_in_a_module_that_moves_the_era_fails():
    offence = _offence(
        "from tests.integration.factories import make_character\n"
        + _ROLLS_INTO_ANOTHER_ERA
        + "    await make_character(db_session, test_era, username='a')\n"
    )
    assert offence
    assert offence["leans"] == [
        "line 7: make_character(...) leaves faction_slug to a default frozen "
        "at import"
    ]


def test_a_factory_that_takes_a_frozen_default_inside_itself_fails_too():
    offence = _offence(
        "from tests.integration.factories import make_duel\n"
        + _ROLLS_INTO_ANOTHER_ERA
        + "    await make_duel(db_session, test_era, label='a',"
        " challenger_faction='x', opponent_faction='x')\n"
    )
    assert offence and "make_task.faction_slug" in offence["leans"][0]


def test_deriving_from_the_live_era_at_module_level_fails_without_any_import():
    offence = _offence(
        "from faction_slugs import real_faction_slugs\n"
        "from game_config import CURRENT_ERA\n"
        "SOME_FACTION = real_faction_slugs(CURRENT_ERA)[0]\n"
        + _ROLLS_INTO_ANOTHER_ERA
    )
    assert offence["leans"] == [
        "line 3: assigns SOME_FACTION from the live era outside a function "
        "body, so the value is fixed at import"
    ]


def test_reading_the_faction_off_the_era_at_call_time_passes():
    assert not _offence(
        "from faction_slugs import real_faction_slugs\n"
        "from game_config import CURRENT_ERA\n"
        "from tests.integration.factories import make_character, make_task\n"
        + _ROLLS_INTO_ANOTHER_ERA
        + "    slug = real_faction_slugs(CURRENT_ERA)[0]\n"
        "    author = await make_character(\n"
        "        db_session, test_era, username='a', faction_slug=slug\n"
        "    )\n"
        "    await make_task(db_session, author, faction_slug=slug)\n"
    )


def test_the_era_object_as_a_default_argument_passes():
    """``era=CURRENT_ERA`` holds the object, which is refreshed in place."""
    assert not _offence(
        "from game_config import CURRENT_ERA, bind_live_era\n"
        "def read(era=CURRENT_ERA):\n"
        "    return era.config_key\n"
        "def test_it():\n"
        "    bind_live_era(CURRENT_ERA)\n"
        "    assert read()\n"
    )


def test_a_module_that_never_moves_the_era_may_use_frozen_values():
    """``apply_era_reset`` alone moves nothing — the four #3014 worried about."""
    assert not _offence(
        "from services.era import apply_era_reset\n"
        "from tests.integration.factories import DEFAULT_FACTION_SLUG, "
        "make_character\n"
        "async def test_it(db_session, test_era):\n"
        "    await make_character(db_session, test_era, username='a')\n"
        "    await apply_era_reset([], test_era, db_session)\n"
    )


def test_the_same_era_marker_exempts_a_module_only_with_a_reason():
    leaning = (
        "from services.era import rebind_live_era\n"
        "from tests.integration.factories import make_character\n"
        "async def test_it(db_session, test_era):\n"
        "    await rebind_live_era(db_session)\n"
        "    await make_character(db_session, test_era, username='a')\n"
    )
    assert _offence(leaning)
    assert _offence(f'{SAME_ERA_MARKER} = ""\n' + leaning)
    assert not _offence(f'{SAME_ERA_MARKER} = "the row names era_1"\n' + leaning)
