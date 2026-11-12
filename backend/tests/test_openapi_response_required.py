"""A response body carries every field it declares, and the schema says so (#1400).

FastAPI derives ``required`` from Pydantic defaults, so ``x: T | None = None``
became ``x?: T | null`` in the client, a shape the wire never sends.
``schemas.base.WireModel`` fixes it in serialization mode only (partial
``PATCH`` bodies stay legal). The second test guards the premise: no route may
drop declared fields. Reads the committed ``openapi.json``
(``test_openapi_dump.py`` proves it current).
"""

import ast
import json
from pathlib import Path
from typing import Any

BACKEND_ROOT = Path(__file__).resolve().parent.parent
COMMITTED_SCHEMA = BACKEND_ROOT / "openapi.json"
ROUTERS_DIRECTORY = BACKEND_ROOT / "routers"

JSON_MEDIA_TYPE = "application/json"

# Every ``response_model_*`` option that can omit a declared field.
FIELD_DROPPING_RESPONSE_OPTIONS = frozenset(
    {
        "response_model_exclude_unset",
        "response_model_exclude_defaults",
        "response_model_exclude_none",
        "response_model_exclude",
        "response_model_include",
    }
)


def _referenced_schema_names(node: Any) -> set[str]:
    names: set[str] = set()

    if isinstance(node, dict):
        reference = node.get("$ref")
        if isinstance(reference, str) and reference.startswith("#/components/schemas/"):
            names.add(reference.rsplit("/", 1)[-1])
        for value in node.values():
            names |= _referenced_schema_names(value)
    elif isinstance(node, list):
        for value in node:
            names |= _referenced_schema_names(value)

    return names


def _response_reachable_schemas(document: dict[str, Any]) -> set[str]:
    """Schemas reachable from any 2xx JSON body. Request bodies are not walked."""
    definitions = document["components"]["schemas"]

    pending: set[str] = set()
    for operations in document["paths"].values():
        for operation in operations.values():
            if not isinstance(operation, dict):
                continue
            for status, response in operation.get("responses", {}).items():
                if not status.startswith("2"):
                    continue
                body = (response.get("content") or {}).get(JSON_MEDIA_TYPE)
                if body is not None:
                    pending |= _referenced_schema_names(body.get("schema", {}))

    reachable: set[str] = set()
    while pending:
        name = pending.pop()
        if name in reachable or name not in definitions:
            continue
        reachable.add(name)
        pending |= _referenced_schema_names(definitions[name])

    return reachable


def _optional_fields_in_response_schemas() -> list[str]:
    document = json.loads(COMMITTED_SCHEMA.read_text(encoding="utf-8"))
    definitions = document["components"]["schemas"]

    offenders: list[str] = []
    for name in _response_reachable_schemas(document):
        definition = definitions[name]
        properties = definition.get("properties")
        if not properties:
            continue
        required = set(definition.get("required", []))
        offenders += [f"{name}.{field}" for field in properties if field not in required]

    return sorted(offenders)


def _route_declaring_sources() -> list[Path]:
    """``routers/`` plus ``main.py`` (``/health`` is declared on the app)."""
    return sorted(ROUTERS_DIRECTORY.glob("*.py")) + [BACKEND_ROOT / "main.py"]


def _routes_that_drop_fields() -> list[str]:
    """AST scan, no app import. ``ponytail:`` misses ``**options`` decorators;
    if one appears, read ``APIRoute.response_model_exclude_*`` off app.routes.
    """
    offenders: list[str] = []

    for source_path in _route_declaring_sources():
        tree = ast.parse(source_path.read_text(encoding="utf-8"), filename=str(source_path))
        for node in ast.walk(tree):
            if not isinstance(node, (ast.FunctionDef, ast.AsyncFunctionDef)):
                continue
            for decorator in node.decorator_list:
                if not isinstance(decorator, ast.Call):
                    continue
                for keyword in decorator.keywords:
                    if keyword.arg in FIELD_DROPPING_RESPONSE_OPTIONS:
                        offenders.append(
                            f"{source_path.name}:{decorator.lineno} {keyword.arg} "
                            f"(on {node.name})"
                        )

    return sorted(offenders)


def test_every_response_field_is_required() -> None:
    offenders = _optional_fields_in_response_schemas()

    assert not offenders, (
        "These response fields are marked optional in the contract, so the "
        "generated frontend client types them `field?: T` and every reader has "
        "to handle an `undefined` the wire never sends (#1400):\n  "
        + "\n  ".join(offenders)
        + "\n\nA response schema is generated in serialization mode, where a "
        "Pydantic default does NOT mean the field may be absent — the serializer "
        "emits every field it declares. Have the model inherit "
        "`schemas.base.WireModel` and run `python scripts/regen_api_client.py`. Do "
        "not relax this test, and do not widen the frontend types to match: the "
        "schema is what is wrong."
    )


def test_no_route_drops_declared_response_fields() -> None:
    offenders = _routes_that_drop_fields()

    assert not offenders, (
        "These routes ask FastAPI to omit fields from a response body, which "
        "breaks the premise the whole generated client rests on (#1400):\n  "
        + "\n  ".join(offenders)
        + "\n\n`test_every_response_field_is_required` marks every field of every "
        "response model as always-sent. A route that excludes fields makes the "
        "schema promise data it does not send, and the compiler will not catch a "
        "single missing one. If a caller genuinely needs a smaller payload, give "
        "it its own response model naming exactly the fields it returns."
    )
