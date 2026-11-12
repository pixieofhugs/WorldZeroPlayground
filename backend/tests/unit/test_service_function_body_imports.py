"""No service may hide more than three ``from services.X import`` in a function body.

SPEC-backend-architecture section 11's tripwire: several deferred imports mean a
structural cycle that wants a leaf module (#2872).
"""

import ast
from pathlib import Path

SERVICES_DIR = Path(__file__).resolve().parents[2] / "services"

MAX_FUNCTION_BODY_SERVICE_IMPORTS = 3


def _deferred_service_imports(source: str) -> list[str]:
    tree = ast.parse(source)
    module_level = {id(node) for node in tree.body}
    found: list[str] = []
    for node in ast.walk(tree):
        if not isinstance(node, ast.ImportFrom) or id(node) in module_level:
            continue
        if node.module and node.module.split(".")[0] == "services":
            found.append((node.lineno, node.module))
    return [f"line {n}: from {module} import ..." for n, module in sorted(found)]


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
