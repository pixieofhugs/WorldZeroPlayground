"""Every success body is a named shape, or there is no body (#1400).

A hand-built ``dict`` lands in ``schema.d.ts`` as ``unknown``. Passes: no
content (204/302; the rule is on content, not ``response_model``), a ``$ref``
or array of them, or an array of a primitive. Reads the committed
``openapi.json`` (``test_openapi_dump.py`` proves it current).
"""

import json
from pathlib import Path
from typing import Any

BACKEND_ROOT = Path(__file__).resolve().parent.parent
COMMITTED_SCHEMA = BACKEND_ROOT / "openapi.json"

# Binary/stream routes carry their own media type and are out of scope.
JSON_MEDIA_TYPE = "application/json"

PRIMITIVE_TYPES = frozenset({"boolean", "integer", "number", "string"})


def _describes_a_shape(schema: dict[str, Any]) -> bool:
    if "$ref" in schema:
        return True
    if schema.get("type") == "array":
        items = schema.get("items")
        if not isinstance(items, dict):
            return False
        return "$ref" in items or items.get("type") in PRIMITIVE_TYPES
    return schema.get("type") in PRIMITIVE_TYPES


def _undescribed_success_bodies() -> list[str]:
    document = json.loads(COMMITTED_SCHEMA.read_text(encoding="utf-8"))
    offenders: list[str] = []

    for path, operations in document["paths"].items():
        for method, operation in operations.items():
            for status, response in operation.get("responses", {}).items():
                if not status.startswith("2"):
                    continue
                content = response.get("content")
                if not content:
                    continue
                body = content.get(JSON_MEDIA_TYPE)
                if body is None:
                    continue
                if not _describes_a_shape(body.get("schema", {})):
                    offenders.append(f"{method.upper()} {path} -> {status}")

    return sorted(offenders)


def test_every_success_body_is_a_named_shape() -> None:
    offenders = _undescribed_success_bodies()

    assert not offenders, (
        "These routes answer with an undescribed success body, so the generated "
        "frontend client sees `unknown` or an index signature and the compiler "
        "cannot check a single field of them (#1400):\n  "
        + "\n  ".join(offenders)
        + "\n\nGive each one a Pydantic model in backend/schemas/ and declare it "
        "as `response_model=`, then run `python scripts/regen_api_client.py`. "
        "If the route genuinely has no body, give it a no-content status "
        "(204) or an explicit `response_class` — do NOT invent a model for it, "
        "and do not relax this test."
    )
