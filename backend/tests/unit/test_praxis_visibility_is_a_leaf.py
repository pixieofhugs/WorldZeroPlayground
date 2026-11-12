"""``services/praxis_visibility.py`` must import nothing from ``services`` (#1391).

A leaf, so read surfaces get the predicate without the praxis lifecycle's fan-out
(SPEC-backend-architecture section 11).
"""

import ast
from pathlib import Path

MODULE = (
    Path(__file__).resolve().parents[2] / "services" / "praxis_visibility.py"
)


def test_praxis_visibility_imports_no_service():
    tree = ast.parse(MODULE.read_text(encoding="utf-8"))
    service_imports = [
        f"line {node.lineno}: from {node.module} import ..."
        for node in ast.walk(tree)
        if isinstance(node, ast.ImportFrom)
        and node.module
        and node.module.split(".")[0] == "services"
    ]

    assert not service_imports, (
        "services/praxis_visibility.py is a leaf every read surface imports for "
        "the visibility predicate alone; a services.* dependency here is inherited "
        f"by all of them. Found: {service_imports}"
    )
