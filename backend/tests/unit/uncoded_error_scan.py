"""AST inventory of ``HTTPException`` construction sites (#1401), measuring the
shrink-only allowlist in ``uncoded_error_allowlist.py``.

AST, not regex: some sites *return* an ``HTTPException`` for a caller to raise,
so the unit is **construction** (raised, returned, aliased, module attribute,
subclassed), not ``raise``. Re-raising someone else's exception does not count.
"Has a code" means built by ``errors.raise_coded`` / ``errors.coded_error``.
"""

from __future__ import annotations

import ast
from dataclasses import dataclass
from pathlib import Path
from typing import Iterable, Iterator, Optional

BACKEND_ROOT = Path(__file__).resolve().parents[2]

EXCLUDED_DIRECTORIES = frozenset({"tests", "alembic", "scripts", ".venv", "__pycache__"})

#: ``errors.coded_error`` is the one place allowed to build one directly.
EXCLUDED_FILES = frozenset({"errors.py"})

HTTP_EXCEPTION_MODULES = frozenset(
    {"fastapi", "fastapi.exceptions", "starlette.exceptions"}
)

HTTP_EXCEPTION_NAME = "HTTPException"

#: Keys are ``file::scope``, never line numbers (they churn on every edit).
MODULE_SCOPE = "<module>"


@dataclass(frozen=True)
class UncodedSite:
    module_path: str
    #: e.g. ``TaskRouter.get_task``, or :data:`MODULE_SCOPE`.
    scope: str
    #: For failure messages only; never part of the key.
    line: int

    @property
    def key(self) -> str:
        return f"{self.module_path}::{self.scope}"


def shipped_modules(root: Path = BACKEND_ROOT) -> Iterator[Path]:
    for path in sorted(root.rglob("*.py")):
        relative = path.relative_to(root)
        if EXCLUDED_DIRECTORIES.intersection(relative.parts):
            continue
        if relative.as_posix() in EXCLUDED_FILES or relative.name in EXCLUDED_FILES:
            continue
        yield path


def _bound_names(tree: ast.Module) -> set[str]:
    """Local names resolving to ``HTTPException``, to a fixed point over aliases
    and subclasses so a two-step launder does not escape."""
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
    """Attributes match on name alone: a false positive would be worth a look."""
    function = node.func
    if isinstance(function, ast.Name):
        return function.id in bound_names
    if isinstance(function, ast.Attribute):
        return function.attr == HTTP_EXCEPTION_NAME
    return False


class _ScopeWalker(ast.NodeVisitor):

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
    tree = ast.parse(source)
    walker = _ScopeWalker(module_path, _bound_names(tree))
    walker.visit(tree)
    return walker.sites


def scan_backend(root: Path = BACKEND_ROOT) -> list[UncodedSite]:
    sites: list[UncodedSite] = []
    for path in shipped_modules(root):
        module_path = path.relative_to(root).as_posix()
        sites.extend(scan_source(path.read_text(encoding="utf-8"), module_path))
    return sites


def tally(sites: Iterable[UncodedSite]) -> dict[str, int]:
    counts: dict[str, int] = {}
    for site in sites:
        counts[site.key] = counts.get(site.key, 0) + 1
    return counts


CODED_CONSTRUCTORS = frozenset({"raise_coded", "coded_error"})


@dataclass(frozen=True)
class CodedSite:
    module_path: str
    line: int
    #: ErrorCode *member name* (not value); None if the AST cannot resolve it.
    code_member: Optional[str]
    has_message: bool
    #: Excludes the :data:`errors.DETAIL_CONTEXT_PARAM` discriminator.
    param_names: frozenset[str] = frozenset()
    #: Drives the ``<CODE>_<context>`` sibling lookup in the catalog guard.
    context: Optional[str] = None


def _read_params(node: ast.Call) -> tuple[frozenset[str], Optional[str]]:
    """(placeholders, context). Only a dict literal is readable, which keeps the
    catalog-coverage guard honest."""
    params: Optional[ast.expr] = None
    if len(node.args) >= 4:
        params = node.args[3]
    else:
        for keyword in node.keywords:
            if keyword.arg == "params":
                params = keyword.value
    if not isinstance(params, ast.Dict):
        return frozenset(), None

    names: set[str] = set()
    context: Optional[str] = None
    for key, value in zip(params.keys, params.values):
        is_context = (isinstance(key, ast.Name) and key.id == "DETAIL_CONTEXT_PARAM") or (
            isinstance(key, ast.Constant) and key.value == "context"
        )
        if is_context:
            if isinstance(value, ast.Constant) and isinstance(value.value, str):
                context = value.value
            continue
        if isinstance(key, ast.Constant) and isinstance(key.value, str):
            names.add(key.value)
    return frozenset(names), context


def scan_coded_source(source: str, module_path: str) -> list[CodedSite]:
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
        param_names, context = _read_params(node)
        sites.append(
            CodedSite(
                module_path=module_path,
                line=node.lineno,
                code_member=code_member,
                has_message=len(node.args) >= 3
                or any(keyword.arg == "message" for keyword in node.keywords),
                param_names=param_names,
                context=context,
            )
        )
    return sites


def scan_coded_backend(root: Path = BACKEND_ROOT) -> list[CodedSite]:
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
