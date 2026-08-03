"""Every success body in the contract is a named shape, or there is no body (#1400).

A committed schema and a CI drift gate (``test_openapi_dump.py``) make the
frontend's types *track* the backend. They do not make those types **say**
anything. A route that returns a hand-built ``dict`` regenerates perfectly
cleanly and lands in ``schema.d.ts`` as ``unknown`` — the gate is green, the
codegen is honest, and the caller is back to guessing. Twelve routes were in
exactly that state before this test existed.

So this is the other half of the gate, and it is a ratchet rather than a
one-time sweep: it fails the moment a *new* route reaches the wire with an
undescribed success body.

WHAT COUNTS AS DESCRIBED
------------------------
A 2xx response passes if it is one of:

- **No content at all.** The seven ``204`` deletes and the two OAuth ``302``
  redirects. Forcing a ``response_model`` onto a no-body status would document
  a body that is never sent, which is worse than silence, not better. This is
  why the rule is written against *content* rather than against
  ``response_model``.
- **A ``$ref``**, or an array of ``$ref``s — a named Pydantic model.
- **An array of a declared primitive**, e.g. ``list[str]``. ``string[]`` is
  fully checkable by the generated client; a wrapper model would add a name
  and no information.

Everything else fails, and the two shapes that actually occur are worth naming:
``{}`` (an unannotated handler → ``unknown``) and an object carrying only
``additionalProperties`` (``dict`` / ``dict[str, int]`` → an index signature).
Both type a *bag*, not a response.

It reads the committed ``openapi.json`` rather than importing the app, so it
needs no environment; ``test_openapi_dump.py`` is what proves that file is the
one the app serves.
"""

import json
from pathlib import Path
from typing import Any

BACKEND_ROOT = Path(__file__).resolve().parent.parent
COMMITTED_SCHEMA = BACKEND_ROOT / "openapi.json"

# Response media type the rule applies to. A future binary/stream route would
# carry its own media type and is deliberately not this test's business.
JSON_MEDIA_TYPE = "application/json"

PRIMITIVE_TYPES = frozenset({"boolean", "integer", "number", "string"})


def _describes_a_shape(schema: dict[str, Any]) -> bool:
    """True when this success schema tells a client what it is getting."""
    if "$ref" in schema:
        return True
    if schema.get("type") == "array":
        items = schema.get("items")
        if not isinstance(items, dict):
            return False
        return "$ref" in items or items.get("type") in PRIMITIVE_TYPES
    return schema.get("type") in PRIMITIVE_TYPES


def _undescribed_success_bodies() -> list[str]:
    """Return one ``METHOD /path -> status`` line per offending response."""
    document = json.loads(COMMITTED_SCHEMA.read_text(encoding="utf-8"))
    offenders: list[str] = []

    for path, operations in document["paths"].items():
        for method, operation in operations.items():
            for status, response in operation.get("responses", {}).items():
                if not status.startswith("2"):
                    continue
                content = response.get("content")
                if not content:
                    continue  # 204 / 302 — no body by definition.
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
