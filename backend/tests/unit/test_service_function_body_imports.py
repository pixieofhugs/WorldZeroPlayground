"""No service may hide more than three ``from services.X import`` in a function body.

``SPEC-backend-architecture.md`` section 11 makes the count a tripwire: "More than
three ``from services.X import ...`` inside function bodies — indicates real
coupling that a module reshuffle would fix." A deferred import exists only to break
an import cycle, so several of them aimed at one module means the cycle is
structural and wants a leaf module (the ``services/duel_outcome.py`` precedent).

#1391 measured this by hand and #2872 found the same five still there a month
later. This is that measurement, run by a machine, so the next one cannot rot.
"""

import ast
from pathlib import Path

SERVICES_DIR = Path(__file__).resolve().parents[2] / "services"

# Section 11's wording is "more than three", so three is allowed.
MAX_FUNCTION_BODY_SERVICE_IMPORTS = 3


def _deferred_service_imports(source: str) -> list[str]:
    """Every ``from services.X import ...`` that is not at module level."""
    tree = ast.parse(source)
    module_level = {id(node) for node in tree.body}
    found: list[str] = []
    for node in ast.walk(tree):
        if not isinstance(node, ast.ImportFrom) or id(node) in module_level:
            continue
        if node.module and node.module.split(".")[0] == "services":
            found.append((node.lineno, node.module))
    return [f"line {lineno}: from {module} import ..." for lineno, module in sorted(found)]


def test_no_service_exceeds_the_deferred_import_tripwire():
    offenders = {}
    for path in sorted(SERVICES_DIR.glob("*.py")):
        deferred = _deferred_service_imports(path.read_text(encoding="utf-8"))
        if len(deferred) > MAX_FUNCTION_BODY_SERVICE_IMPORTS:
            offenders[path.name] = deferred

    assert not offenders, (
        "SPEC-backend-architecture section 11: more than "
        f"{MAX_FUNCTION_BODY_SERVICE_IMPORTS} function-body service imports in one "
        "module means a real import cycle — extract the shared surface into a leaf "
        "module both sides can import at module level (services/duel_outcome.py and "
        f"services/praxis_duel.py are the precedents). Offenders: {offenders}"
    )
