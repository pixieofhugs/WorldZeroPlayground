"""AST inventory of ``HTTPException`` construction sites (#1401, phase 2).

This is the measuring instrument behind the shrink-only allowlist in
``uncoded_error_allowlist.py``. It answers exactly one question about the
shipped backend: **where is an ``HTTPException`` still built without a code?**

WHY AST AND NOT A REGEX
-----------------------
The repo has been here before. The frontend style ratchet was defeated five
separate ways by patterns that a text scan could not see, and the same shapes
exist here today: ``git grep -c "raise HTTPException"`` over ``routers/`` +
``services/`` reports 190, while this scan reports 201 over the same files. The
nine it cannot see are not raised at all at the point they are built —
``services/praxis.py::_signup_denial_to_http`` and ``services/nudge.py::_refuse``
*return* an ``HTTPException`` for a caller to raise or to report per-item. A
scan that matched the word ``raise`` would have declared those nine already
clean. (The other two are ``dependencies.py``, which the grep above simply did
not cover.)

So the unit of measurement is **construction**, not raising:

* ``raise HTTPException(...)``                      — the common shape
* ``exception = HTTPException(...); raise exception`` — built, then raised
* ``def _refuse(...) -> HTTPException: return HTTPException(...)`` — returned
* ``from fastapi import HTTPException as Http`` + ``Http(...)`` — aliased
* ``import fastapi`` + ``fastapi.HTTPException(...)``  — module attribute
* ``class Denied(HTTPException)`` + ``Denied(...)``    — subclassed

all count. A bare ``raise exception`` with no construction does not: re-raising
an exception someone else built is not a new error.

"Has a code" is definitionally "was built by ``errors.raise_coded`` /
``errors.coded_error``", because those are the only two functions that put a
``code`` into ``detail``. That makes the inventory a pure structural property —
no prose, no status codes, nothing a refactor can launder.
"""

from __future__ import annotations

import ast
from dataclasses import dataclass
from pathlib import Path
from typing import Iterable, Iterator, Optional

#: ``backend/``. The scan root, resolved from this file rather than the cwd so
#: it does not matter where pytest was invoked from.
BACKEND_ROOT = Path(__file__).resolve().parents[2]

#: Directories under ``backend/`` that ship no HTTP surface, plus the tests
#: themselves — a test that asserts on an ``HTTPException`` has to build one.
EXCLUDED_DIRECTORIES = frozenset({"tests", "alembic", "scripts", ".venv", "__pycache__"})

#: ``errors.py`` is the blessed constructor: ``coded_error`` is the one place in
#: the shipped backend allowed to call ``HTTPException(...)`` directly.
EXCLUDED_FILES = frozenset({"errors.py"})

#: Modules whose ``HTTPException`` export is the same class.
HTTP_EXCEPTION_MODULES = frozenset(
    {"fastapi", "fastapi.exceptions", "starlette.exceptions"}
)

HTTP_EXCEPTION_NAME = "HTTPException"

#: What an entry in the allowlist is keyed on: the file, then the qualified name
#: of the enclosing function. Line numbers are deliberately *not* part of the
#: key — they churn on every edit above the raise, which would make the
#: allowlist a merge-conflict generator rather than a ratchet.
MODULE_SCOPE = "<module>"


@dataclass(frozen=True)
class UncodedSite:
    """One ``HTTPException(...)`` construction that carries no error code."""

    #: POSIX-style path relative to ``backend/``, e.g. ``services/praxis.py``.
    module_path: str
    #: Qualified name of the enclosing function, e.g. ``TaskRouter.get_task``,
    #: or :data:`MODULE_SCOPE` for a construction at import time.
    scope: str
    #: 1-based line of the construction. Reported in failure messages so a
    #: developer can find it; never part of the allowlist key.
    line: int

    @property
    def key(self) -> str:
        return f"{self.module_path}::{self.scope}"


def shipped_modules(root: Path = BACKEND_ROOT) -> Iterator[Path]:
    """Every ``.py`` file in the shipped backend, sorted for stable output."""
    for path in sorted(root.rglob("*.py")):
        relative = path.relative_to(root)
        if EXCLUDED_DIRECTORIES.intersection(relative.parts):
            continue
        if relative.as_posix() in EXCLUDED_FILES or relative.name in EXCLUDED_FILES:
            continue
        yield path


def _bound_names(tree: ast.Module) -> set[str]:
    """Every local name in this module that resolves to ``HTTPException``.

    Covers the import spellings, plain aliasing (``Denied = HTTPException``) and
    subclassing (``class Denied(HTTPException)``). Subclass and alias chains are
    resolved to a fixed point so a two-step launder does not escape.
    """
    names: set[str] = set()
    for node in ast.walk(tree):
        if isinstance(node, ast.ImportFrom) and node.module in HTTP_EXCEPTION_MODULES:
            for alias in node.names:
                if alias.name == HTTP_EXCEPTION_NAME:
                    names.add(alias.asname or alias.name)

    changed = True
    while changed:
        changed = False
        for node in ast.walk(tree):
            derived: set[str] = set()
            if isinstance(node, ast.ClassDef):
                bases = {base.id for base in node.bases if isinstance(base, ast.Name)}
                if bases & names:
                    derived.add(node.name)
            elif isinstance(node, ast.Assign) and isinstance(node.value, ast.Name):
                if node.value.id in names:
                    derived.update(
                        target.id
                        for target in node.targets
                        if isinstance(target, ast.Name)
                    )
            if derived - names:
                names |= derived
                changed = True
    return names


def _is_http_exception_call(node: ast.Call, bound_names: set[str]) -> bool:
    """Does this call construct an ``HTTPException``?

    ``ast.Attribute`` is matched on the attribute name alone (``fastapi.HTTPException``,
    ``exceptions.HTTPException``, ``starlette.exceptions.HTTPException``) rather
    than by resolving the module: the name is distinctive enough that a false
    positive would itself be a thing worth looking at.
    """
    function = node.func
    if isinstance(function, ast.Name):
        return function.id in bound_names
    if isinstance(function, ast.Attribute):
        return function.attr == HTTP_EXCEPTION_NAME
    return False


class _ScopeWalker(ast.NodeVisitor):
    """Walks a module tracking the qualified name of the enclosing scope."""

    def __init__(self, module_path: str, bound_names: set[str]) -> None:
        self.module_path = module_path
        self.bound_names = bound_names
        self.sites: list[UncodedSite] = []
        self._scope: list[str] = []

    def _current_scope(self) -> str:
        return ".".join(self._scope) if self._scope else MODULE_SCOPE

    def _visit_scoped(self, node: ast.AST, name: str) -> None:
        self._scope.append(name)
        self.generic_visit(node)
        self._scope.pop()

    def visit_FunctionDef(self, node: ast.FunctionDef) -> None:
        self._visit_scoped(node, node.name)

    def visit_AsyncFunctionDef(self, node: ast.AsyncFunctionDef) -> None:
        self._visit_scoped(node, node.name)

    def visit_ClassDef(self, node: ast.ClassDef) -> None:
        self._visit_scoped(node, node.name)

    def visit_Call(self, node: ast.Call) -> None:
        if _is_http_exception_call(node, self.bound_names):
            self.sites.append(
                UncodedSite(
                    module_path=self.module_path,
                    scope=self._current_scope(),
                    line=node.lineno,
                )
            )
        self.generic_visit(node)


def scan_source(source: str, module_path: str) -> list[UncodedSite]:
    """Inventory one module's source. Exposed so the scanner can be tested."""
    tree = ast.parse(source)
    walker = _ScopeWalker(module_path, _bound_names(tree))
    walker.visit(tree)
    return walker.sites


def scan_backend(root: Path = BACKEND_ROOT) -> list[UncodedSite]:
    """Inventory every shipped backend module."""
    sites: list[UncodedSite] = []
    for path in shipped_modules(root):
        module_path = path.relative_to(root).as_posix()
        sites.extend(scan_source(path.read_text(encoding="utf-8"), module_path))
    return sites


def tally(sites: Iterable[UncodedSite]) -> dict[str, int]:
    """Collapse sites into the allowlist's ``"file::scope" -> count`` shape."""
    counts: dict[str, int] = {}
    for site in sites:
        counts[site.key] = counts.get(site.key, 0) + 1
    return counts


#: The two blessed constructors in ``errors.py``. A call to either is what "has
#: a code" means.
CODED_CONSTRUCTORS = frozenset({"raise_coded", "coded_error"})


@dataclass(frozen=True)
class CodedSite:
    """One ``raise_coded`` / ``coded_error`` call in the shipped backend."""

    module_path: str
    line: int
    #: The :class:`errors.ErrorCode` *member name* (not its value) this site
    #: passes, or ``None`` if it passes something the AST cannot resolve.
    code_member: Optional[str]
    #: Whether a third positional argument (the prose ``message``) was supplied.
    has_message: bool


def scan_coded_source(source: str, module_path: str) -> list[CodedSite]:
    """Find the coded raises in one module."""
    sites: list[CodedSite] = []
    for node in ast.walk(ast.parse(source)):
        if not isinstance(node, ast.Call):
            continue
        function = node.func
        name = (
            function.id
            if isinstance(function, ast.Name)
            else function.attr if isinstance(function, ast.Attribute) else None
        )
        if name not in CODED_CONSTRUCTORS:
            continue
        code_member: Optional[str] = None
        if len(node.args) >= 2:
            code_argument = node.args[1]
            if (
                isinstance(code_argument, ast.Attribute)
                and isinstance(code_argument.value, ast.Name)
                and code_argument.value.id == "ErrorCode"
            ):
                code_member = code_argument.attr
        sites.append(
            CodedSite(
                module_path=module_path,
                line=node.lineno,
                code_member=code_member,
                has_message=len(node.args) >= 3
                or any(keyword.arg == "message" for keyword in node.keywords),
            )
        )
    return sites


def scan_coded_backend(root: Path = BACKEND_ROOT) -> list[CodedSite]:
    """Find every coded raise in the shipped backend."""
    sites: list[CodedSite] = []
    for path in shipped_modules(root):
        module_path = path.relative_to(root).as_posix()
        sites.extend(scan_coded_source(path.read_text(encoding="utf-8"), module_path))
    return sites


__all__ = [
    "CODED_CONSTRUCTORS",
    "CodedSite",
    "scan_coded_backend",
    "scan_coded_source",
    "BACKEND_ROOT",
    "EXCLUDED_DIRECTORIES",
    "EXCLUDED_FILES",
    "MODULE_SCOPE",
    "UncodedSite",
    "scan_backend",
    "scan_source",
    "shipped_modules",
    "tally",
]
