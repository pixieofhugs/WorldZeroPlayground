"""``services/praxis_visibility.py`` must import nothing from ``services``.

The point of #1391 cut 4 is that a read surface can ask "may this viewer see this
praxis row" without importing the praxis *lifecycle* module to get the answer.
``services/activity_feed.py`` used to do exactly that — one ``from services.praxis
import praxis_visibility_condition`` dragging in create/submit/moderate/media and
their whole dependency fan-out for a single SQL predicate.

That only stays true while the predicate module has no service dependencies of its
own: the moment it grows one, every consumer inherits it transitively and the
extraction has bought nothing. Same leaf property as ``services/duel_outcome.py``
and ``services/praxis_duel.py`` (SPEC-backend-architecture section 11), asserted
here because nothing else would notice it eroding.
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
