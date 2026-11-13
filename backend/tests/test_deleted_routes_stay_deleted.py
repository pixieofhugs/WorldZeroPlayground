"""Endpoints deleted on purpose stay deleted (#1667, #1743, #2021).

Reads the committed ``openapi.json``. The generated client catches a surviving
caller, but nothing catches a re-addition. Groups: task-status duplicates of
``PUT /admin/tasks/{id}/status``; admin ops moved to scripts (#1666); duplicates
with no caller; edge-addressed block doors (ADR-0077); ``PUT /praxes/{id}``,
since rooms are the one write path (ADR-0073; a second path caused #1692).
Want one back? Add a new route with a caller, don't revert this list.
"""

import json
from pathlib import Path

BACKEND_ROOT = Path(__file__).resolve().parent.parent
COMMITTED_SCHEMA = BACKEND_ROOT / "openapi.json"

#: Lowercase methods, as OpenAPI path items key them.
DELETED_OPERATIONS: frozenset[tuple[str, str]] = frozenset(
    {
        # #1743
        ("put", "/praxes/{praxis_id}"),
        ("put", "/admin/tasks/{task_id}/approve"),
        ("put", "/admin/tasks/{task_id}/retire"),
        ("post", "/admin/tasks/{task_id}/reactivate"),
        # #1666: scripts
        ("put", "/admin/era/reset"),
        ("post", "/admin/characters/backfill-stats"),
        ("post", "/admin/characters/backfill-vote-budget"),
        ("post", "/admin/accounts/{account_id}/role"),
        # #2021
        ("put", "/relationships/{relationship_id}"),
        ("post", "/relationships/{relationship_id}/unblock"),
        ("post", "/admin/characters"),
        ("post", "/admin/tasks"),
        ("post", "/admin/factions"),
        ("get", "/characters/{character_id}/praxes"),
        ("get", "/characters/{character_id}/stats/votes-received"),
        ("put", "/tasks/{task_id}"),
    }
)

#: What each deleted duplicate collapsed into. These must survive.
SURVIVING_REPLACEMENTS: frozenset[tuple[str, str]] = frozenset(
    {
        ("put", "/admin/tasks/{task_id}/status"),  # absorbed approve/retire/reactivate
        ("patch", "/admin/tasks/{task_id}"),  # absorbed PUT /tasks/{task_id}
        ("get", "/praxes"),  # ?character_id= absorbed /characters/{id}/praxes
        ("post", "/relationships/blocks"),  # absorbed PUT /relationships/{id}
        # absorbed POST /relationships/{id}/unblock
        ("delete", "/relationships/blocks/{character_id}"),
    }
)

#: Unreachable but kept by owner ruling; a dead-endpoint sweep should skip them.
KEPT_THOUGH_UNREACHABLE: frozenset[tuple[str, str]] = frozenset(
    {
        ("patch", "/admin/characters/{character_id}/stats"),
        # #1262/#1386: a plausible future surface; the client's getTaskSignups
        # stays too.
        ("get", "/tasks/{task_id}/signups"),
    }
)

#: Script (relative to ``backend/``) replacing each deleted admin route.
REPLACED_BY_A_SCRIPT: dict[str, str] = {
    "/admin/era/reset": "scripts/era_reset.py",
    "/admin/characters/backfill-stats": "scripts/backfill_character_stats.py",
    "/admin/characters/backfill-vote-budget": "scripts/backfill_vote_budget.py",
    "/admin/accounts/{account_id}/role": "elevate_admin.py",
}

HTTP_METHODS = frozenset({"get", "put", "post", "delete", "patch", "head", "options", "trace"})


def _published_operations() -> set[tuple[str, str]]:
    document = json.loads(COMMITTED_SCHEMA.read_text(encoding="utf-8"))
    return {
        (method, path)
        for path, item in document["paths"].items()
        for method in item
        if method in HTTP_METHODS
    }


def test_deleted_routes_are_absent_from_the_contract() -> None:
    resurrected = sorted(DELETED_OPERATIONS & _published_operations())

    assert not resurrected, (
        "These operations were deleted on purpose and are published again:\n  "
        + "\n  ".join(f"{method.upper()} {path}" for method, path in resurrected)
        + "\n\nEach one had a live replacement at the time it was removed — read "
        "this module's docstring for which. If the replacement genuinely no "
        "longer covers the case, add a route with a caller in the same PR and "
        "drop it from DELETED_OPERATIONS deliberately, with a reason."
    )


def test_the_replacements_the_deletions_relied_on_survive() -> None:
    published = _published_operations()
    missing = sorted((SURVIVING_REPLACEMENTS | KEPT_THOUGH_UNREACHABLE) - published)

    assert not missing, (
        "#1667 deleted thirteen operations on the grounds that these still "
        "cover the ground; they are gone:\n  "
        + "\n  ".join(f"{method.upper()} {path}" for method, path in missing)
        + "\n\nRemoving one of these is not a cleanup — it drops a capability "
        "that a previous cleanup pointed at."
    )


def test_each_replaced_capability_still_has_its_script() -> None:
    missing = sorted(
        f"{route} -> {script}"
        for route, script in REPLACED_BY_A_SCRIPT.items()
        if not (BACKEND_ROOT / script).is_file()
    )

    assert not missing, (
        "#1666 moved these admin operations to a shell entry point so #1667 "
        "could delete their routes without losing the capability. The script is "
        "gone and the route is not coming back:\n  " + "\n  ".join(missing)
    )
