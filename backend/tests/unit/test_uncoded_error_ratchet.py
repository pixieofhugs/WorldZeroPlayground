"""The ratchet: uncoded ``HTTPException`` raises may only shrink (#1401, phase 2).

Two halves, and both matter.

:func:`test_uncoded_raises_match_the_allowlist` is the ratchet proper. It scans
the shipped backend and compares the inventory to ``uncoded_error_allowlist``
in **both directions**, because a one-directional check is not a ratchet:

* the code grew a raise the allowlist does not know about — a regression;
* the allowlist claims raises the code no longer has — the pawl slipped, and
  "phase 1 shrank the list by N" stops being a fact about the code.

The rest of the file tests the *instrument*. The frontend style ratchet was
defeated five separate ways by patterns a text scan could not see, and this
codebase already contains the same class of pattern: nine ``HTTPException``s
that are built and **returned** rather than raised. So the shapes below are
pinned as fixtures — if the scanner ever stops seeing one of them, the ratchet
silently under-reports and a "clean" file may not be clean at all.
"""

from __future__ import annotations

from tests.unit.uncoded_error_allowlist import (
    UNCODED_RAISE_ALLOWLIST,
    UNCODED_RAISE_TOTAL,
)
from tests.unit.uncoded_error_scan import (
    MODULE_SCOPE,
    scan_backend,
    scan_source,
    tally,
)


# ---------------------------------------------------------------------------
# The ratchet
# ---------------------------------------------------------------------------


def test_allowlist_total_matches_its_entries() -> None:
    """The headline number is the sum of the entries, not a separate claim."""
    assert UNCODED_RAISE_TOTAL == sum(UNCODED_RAISE_ALLOWLIST.values())


def test_uncoded_raises_match_the_allowlist() -> None:
    actual = tally(scan_backend())

    appeared = sorted(set(actual) - set(UNCODED_RAISE_ALLOWLIST))
    assert not appeared, (
        "New uncoded HTTPException raises in scopes the allowlist does not cover:\n  "
        + "\n  ".join(appeared)
        + "\n\nRaise these with `errors.raise_coded(status, ErrorCode.x, message)`"
        " instead of adding them to tests/unit/uncoded_error_allowlist.py — the"
        " allowlist only shrinks."
    )

    grew = sorted(
        f"{key}: {UNCODED_RAISE_ALLOWLIST[key]} allowed, {count} found"
        for key, count in actual.items()
        if count > UNCODED_RAISE_ALLOWLIST[key]
    )
    assert not grew, (
        "Uncoded HTTPException raises increased:\n  "
        + "\n  ".join(grew)
        + "\n\nUse `errors.raise_coded` for the new one. The allowlist only shrinks."
    )

    shrank = sorted(
        f"{key}: {allowed} allowed, {actual.get(key, 0)} found"
        for key, allowed in UNCODED_RAISE_ALLOWLIST.items()
        if actual.get(key, 0) < allowed
    )
    assert not shrank, (
        "The allowlist is stale — these raises are coded (or gone) now:\n  "
        + "\n  ".join(shrank)
        + "\n\nLower or delete the entries in tests/unit/uncoded_error_allowlist.py"
        " and update UNCODED_RAISE_TOTAL. Shrinking it is the point; leaving it"
        " oversized is what makes 'the list got smaller by N' stop meaning anything."
    )


def test_scan_covers_the_routers_and_services_layers() -> None:
    """A smoke test on the scan's reach, so an exclusion bug cannot read as progress.

    If someone widened ``EXCLUDED_DIRECTORIES`` the inventory would drop and the
    ratchet would look like it had been ratcheted.
    """
    scanned = {site.module_path.split("/")[0] for site in scan_backend()}
    assert "routers" in scanned
    assert "services" in scanned


# ---------------------------------------------------------------------------
# The instrument: launderable shapes the scanner must still see
# ---------------------------------------------------------------------------

DIRECT_RAISE = """
from fastapi import HTTPException

def gate():
    raise HTTPException(status_code=403, detail="no")
"""

BUILT_THEN_RAISED = """
from fastapi import HTTPException

def gate():
    exception = HTTPException(status_code=403, detail="no")
    raise exception
"""

RETURNED_FROM_HELPER = """
from fastapi import HTTPException

def _refuse():
    return HTTPException(status_code=403, detail="no")
"""

ALIASED_IMPORT = """
from fastapi import HTTPException as Boom

def gate():
    raise Boom(status_code=403, detail="no")
"""

MODULE_ATTRIBUTE = """
import fastapi

def gate():
    raise fastapi.HTTPException(status_code=403, detail="no")
"""

SUBCLASSED = """
from fastapi import HTTPException

class Denied(HTTPException):
    pass

def gate():
    raise Denied(status_code=403, detail="no")
"""

REBOUND_NAME = """
from fastapi import HTTPException

Denied = HTTPException

def gate():
    raise Denied(status_code=403, detail="no")
"""

STARLETTE_IMPORT = """
from starlette.exceptions import HTTPException

def gate():
    raise HTTPException(status_code=403, detail="no")
"""


def test_scanner_sees_every_launderable_shape() -> None:
    launderings = {
        "direct raise": DIRECT_RAISE,
        "built then raised": BUILT_THEN_RAISED,
        "returned from a helper": RETURNED_FROM_HELPER,
        "aliased import": ALIASED_IMPORT,
        "module attribute": MODULE_ATTRIBUTE,
        "subclassed": SUBCLASSED,
        "rebound name": REBOUND_NAME,
        "starlette import": STARLETTE_IMPORT,
    }
    for label, source in launderings.items():
        sites = scan_source(source, "fixture.py")
        assert len(sites) == 1, f"scanner missed the {label} shape"
        assert sites[0].scope == "gate" or sites[0].scope == "_refuse"


def test_bare_reraise_is_not_a_new_raise() -> None:
    """Re-raising something someone else built is not a new uncoded error."""
    source = """
from fastapi import HTTPException

def gate():
    try:
        work()
    except HTTPException:
        raise
"""
    assert scan_source(source, "fixture.py") == []


def test_coded_helper_calls_are_invisible_to_the_scan() -> None:
    """`raise_coded` is the conversion: a converted site leaves the inventory."""
    source = """
from errors import ErrorCode, raise_coded

def gate():
    raise_coded(403, ErrorCode.vote_budget_exhausted, "no")
"""
    assert scan_source(source, "fixture.py") == []


def test_scope_is_the_innermost_function_and_names_its_class() -> None:
    source = """
from fastapi import HTTPException

class Gate:
    def check(self):
        raise HTTPException(status_code=403, detail="no")

raise HTTPException(status_code=500, detail="at import")
"""
    scopes = [site.scope for site in scan_source(source, "fixture.py")]
    assert scopes == ["Gate.check", MODULE_SCOPE]
