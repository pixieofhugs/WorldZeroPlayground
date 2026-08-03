"""A response body carries every field it declares, and the schema says so (#1400).

``test_openapi_response_shapes.py`` proves each success body is a *named* shape.
This file proves that name is not lying about which fields turn up.

THE DEFECT THESE TESTS RATCHET
------------------------------
FastAPI derives a response schema's ``required`` list from Pydantic FIELD
DEFAULTS, not from what the serializer emits. A field written
``submitted_at: datetime | None = None`` therefore landed outside ``required``,
and ``openapi-typescript`` faithfully rendered it ``submitted_at?: string |
null`` — a shape the wire cannot produce. Every reader then had to either
``?? null`` a case that never happens or launder the type. The frontend grew a
``wireSent`` helper whose entire job was stripping that phantom ``?``; deleting
it is what these tests protect.

The fix is ``json_schema_serialization_defaults_required`` on ``schemas.base.WireModel``,
which marks default-carrying fields required in the SERIALIZATION schema — the
mode FastAPI generates response models in. Request bodies generate in VALIDATION
mode and are untouched, which is what keeps a partial ``PATCH`` body legal.

WHY BOTH TESTS, AND WHY NEITHER IS ENOUGH ALONE
----------------------------------------------
The first checks the artifact: every field of every response-reachable schema is
required. It catches model #91 forgetting ``WireModel``, whatever mechanism a
future maintainer reaches for.

The second checks the *premise the first one rests on*. "Every declared field is
serialized" is only true while no route asks FastAPI to drop fields. Add
``response_model_exclude_none=True`` to one route and the schema keeps promising
fields that route no longer sends — the generated types would assert an absent
field into existence, silently, everywhere. Nothing else in the repo pins this.

The first reads the committed ``openapi.json`` rather than importing the app, so
it needs no environment; ``test_openapi_dump.py`` is what proves that file is the
one the app serves.
"""

import ast
import json
from pathlib import Path
from typing import Any

BACKEND_ROOT = Path(__file__).resolve().parent.parent
COMMITTED_SCHEMA = BACKEND_ROOT / "openapi.json"
ROUTERS_DIRECTORY = BACKEND_ROOT / "routers"

JSON_MEDIA_TYPE = "application/json"

# Every ``response_model_*`` option that can make a declared field ABSENT from
# the payload. ``by_alias`` renames rather than removes and is not this test's
# business. Guarding the whole family rather than the two options that prompted
# this costs nothing and closes the same hole from four more directions.
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
    """Every ``#/components/schemas/X`` name appearing anywhere beneath ``node``."""
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
    """Schema names reachable from any 2xx JSON body, following ``$ref`` transitively.

    Request-body schemas are deliberately NOT walked. They generate in validation
    mode, where a default still means optional, and requiring them would break
    every partial update.
    """
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
    """Return one ``Schema.field`` line per response field the schema calls optional."""
    document = json.loads(COMMITTED_SCHEMA.read_text(encoding="utf-8"))
    definitions = document["components"]["schemas"]

    offenders: list[str] = []
    for name in _response_reachable_schemas(document):
        definition = definitions[name]
        properties = definition.get("properties")
        if not properties:
            continue  # Enums and free-form objects declare no fields to require.
        required = set(definition.get("required", []))
        offenders += [f"{name}.{field}" for field in properties if field not in required]

    return sorted(offenders)


def _routes_that_drop_fields() -> list[str]:
    """Return one ``file:line option`` per route decorator that can omit a field.

    Reads the router sources with ``ast`` rather than importing the app, so this
    stays a unit test with no environment. ``ponytail:`` a decorator built
    dynamically — ``**options`` spread into ``router.get(...)`` — would slip past
    this. No route is written that way; if one ever is, read the resolved
    ``APIRoute.response_model_exclude_*`` attributes off ``app.routes`` instead.
    """
    offenders: list[str] = []

    for source_path in sorted(ROUTERS_DIRECTORY.glob("*.py")):
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
