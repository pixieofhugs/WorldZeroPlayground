"""Endpoints deleted on purpose stay deleted.

Thirteen unreachable ones went in #1667; ``PUT /praxes/{praxis_id}`` went in
#1743 for a different reason — it was very much reachable, and that was the
problem.

THE SEAM
--------
The route table. "Is this endpoint reachable?" is decided in exactly one place —
the set of operations FastAPI publishes — and this file reads it from the
committed ``openapi.json`` (``test_openapi_dump.py`` is what proves that file is
the one the app serves, so this needs no environment and no DB).

Deleting a route is not the kind of change a type checker can protect. The
frontend's generated client makes a *surviving caller* a compile error, which is
why the deletion is safe going out; nothing makes a *re-addition* an error, and
a re-added route is indistinguishable from a new one by the time anyone reads
it. Six months from now the argument for `PUT /admin/tasks/{id}/approve` — "a
one-line route that sets one status" — is exactly as convincing as it was the
first time, and it is wrong for the same reason: `PUT /admin/tasks/{id}/status`
already takes the status as an argument.

WHAT EACH GROUP WAS
-------------------
* **The four-way task-status duplicate.** ``/approve``, ``/retire`` and
  ``/reactivate`` each passed a different ``TaskStatus`` to the same
  ``update_task_status`` call that ``/status`` takes as a parameter. Collapsing
  them needed no frontend change: the admin UI's "Reactivate" button already
  called ``/status``.
* **Four operations that became scripts (#1666).** Era reset, the two backfills
  and the role grant were unreachable from the UI but were real capabilities.
  They moved to ``backend/scripts/`` and ``elevate_admin.py --revoke`` FIRST,
  which is the whole reason #1666 blocked #1667. Deleting the route is not
  deleting the capability — see :data:`REPLACED_BY_A_SCRIPT`.
* **Six with no caller and no capability to keep.** Duplicate reads
  (``/characters/{id}/praxes`` duplicates ``GET /praxes?character_id=``),
  creates that ``seed.py`` or another route already does, and a task update the
  admin ``PATCH`` supersedes.

* **One write path, deleted so there is only one** (#1743). ``PUT /praxes/{id}``
  took a title and a body and was the composer's debounced autosave. Every
  praxis is now written in a *room* (ADR-0073) — a server-held CRDT the composer
  binds to — and the room server flushes that document into ``praxis.title`` and
  ``praxis.body_text``. Keeping the ``PUT`` as a fallback was considered and
  refused: it is the second write path wearing a different hat, and it would
  need a reconciliation rule for a ``PUT`` landing behind the room's document.
  A rule stated twice and never reconciled is what shipped three production bugs
  in #1692.

If you are here because you want one of these back, the honest move is a new
route with a new name and a caller in the same PR — not a revert of this list.
"""

import json
from pathlib import Path

BACKEND_ROOT = Path(__file__).resolve().parent.parent
COMMITTED_SCHEMA = BACKEND_ROOT / "openapi.json"

#: ``(method, path)`` for every operation deliberately removed. Methods are
#: lowercase because that is how an OpenAPI path item keys them.
DELETED_OPERATIONS: frozenset[tuple[str, str]] = frozenset(
    {
        # #1743: the composer's debounced autosave. The room is the write path.
        ("put", "/praxes/{praxis_id}"),
        # The four-way task-status duplicate, minus the one that survived.
        ("put", "/admin/tasks/{task_id}/approve"),
        ("put", "/admin/tasks/{task_id}/retire"),
        ("post", "/admin/tasks/{task_id}/reactivate"),
        # Replaced by a script in #1666.
        ("put", "/admin/era/reset"),
        ("post", "/admin/characters/backfill-stats"),
        ("post", "/admin/characters/backfill-vote-budget"),
        ("post", "/admin/accounts/{account_id}/role"),
        # No caller, no capability lost.
        ("post", "/admin/characters"),
        ("post", "/admin/tasks"),
        ("post", "/admin/factions"),
        ("get", "/characters/{character_id}/praxes"),
        ("get", "/characters/{character_id}/stats/votes-received"),
        ("put", "/tasks/{task_id}"),
    }
)

#: The operation each deleted duplicate collapsed into. These MUST survive — a
#: sweep that took the survivor too would read as "the count went down", which
#: is why the count is not the only thing asserted.
SURVIVING_REPLACEMENTS: frozenset[tuple[str, str]] = frozenset(
    {
        ("put", "/admin/tasks/{task_id}/status"),  # absorbed approve/retire/reactivate
        ("patch", "/admin/tasks/{task_id}"),  # absorbed PUT /tasks/{task_id}
        ("get", "/praxes"),  # ?character_id= absorbed /characters/{id}/praxes
    }
)

#: Deliberately unreachable and deliberately kept — owner's call. The first two
#: are recorded in #1667's "Explicitly NOT this issue"; the third is not, and
#: that omission is exactly why it is here (see its comment). A later
#: dead-endpoint sweep will find all three again; this is the note that says
#: it already looked, and that the answer was no.
KEPT_THOUGH_UNREACHABLE: frozenset[tuple[str, str]] = frozenset(
    {
        ("patch", "/admin/characters/{character_id}/stats"),
        ("put", "/relationships/{relationship_id}"),
        # #1262 (2026-07-28), reaffirmed in #1386 and again when #1667 was
        # built: "who signed up for this task" is a plausible future surface
        # and costs nothing at rest. #1386 was explicit that the ruling covers
        # the CLIENT too, so frontend/src/api/tasks.ts::getTaskSignups stays
        # with it. #1667 listed this route for deletion without acknowledging
        # either ruling; that was the error, and this line is the correction.
        ("get", "/tasks/{task_id}/signups"),
    }
)

#: Shell entry point for each capability whose route was deleted, relative to
#: ``backend/``. Asserted to exist so "we replaced it with a script" cannot decay
#: into "we deleted it" the day someone tidies ``scripts/``.
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
