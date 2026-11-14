"""``account_id`` and ``email`` leave the API only through named routes (#3356).

Walks every response schema in the committed ``openapi.json``, following
``$ref``s. The sibling email-carrier ratchet in
``integration/test_auth_me_account_fields.py`` also covers request bodies.
"""

import json
from pathlib import Path
from typing import Any

COMMITTED_SCHEMA = Path(__file__).resolve().parent.parent / "openapi.json"

PRIVATE_FIELDS = frozenset({"account_id", "email"})

# Each is the caller's own identity or admin-only; anything new is argued in review.
ALLOWED_EXACT = {
    "/auth/me",
    "/auth/dev-login",
    "/factions/choose",
    "/me/active-character",
}
ALLOWED_PREFIX = "/admin/"


def _private_fields_under(
    node: Any, schemas: dict[str, Any], seen: set[str]
) -> set[str]:
    if isinstance(node, list):
        return set().union(*(_private_fields_under(n, schemas, seen) for n in node))
    if not isinstance(node, dict):
        return set()
    found: set[str] = set()
    ref = node.get("$ref")
    if ref:
        name = ref.rsplit("/", 1)[-1]
        if name not in seen:
            seen.add(name)
            found |= _private_fields_under(schemas[name], schemas, seen)
    found |= PRIVATE_FIELDS & set(node.get("properties") or {})
    for value in node.values():
        found |= _private_fields_under(value, schemas, seen)
    return found


def test_private_fields_appear_only_in_allowed_responses() -> None:
    document = json.loads(COMMITTED_SCHEMA.read_text(encoding="utf-8"))
    schemas = document["components"]["schemas"]
    leaks: list[str] = []

    for path, operations in document["paths"].items():
        if path in ALLOWED_EXACT or path.startswith(ALLOWED_PREFIX):
            continue
        for method, operation in operations.items():
            responses = operation.get("responses", {})
            fields = _private_fields_under(responses, schemas, set())
            if fields:
                leaks.append(f"{method.upper()} {path}: {sorted(fields)}")

    assert not leaks, (
        "These responses expose account_id/email outside the allow-list "
        "(CLAUDE.md: never expose them publicly):\n  " + "\n  ".join(sorted(leaks))
    )


def test_allow_list_names_only_paths_that_exist() -> None:
    document = json.loads(COMMITTED_SCHEMA.read_text(encoding="utf-8"))
    stale = ALLOWED_EXACT - set(document["paths"])
    assert not stale, f"allow-list names paths that no longer exist: {sorted(stale)}"
