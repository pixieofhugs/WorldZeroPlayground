"""Machine-readable error codes for API failures (#1401).

## The shape

FastAPI's envelope is unchanged — a failure is still ``{"detail": ...}`` with an
HTTP status. What changes is ``detail``: instead of a bare prose string it
becomes an object::

    {"detail": {"code": "VOTE_BUDGET_EXHAUSTED",
                "message": "No votes remaining in your budget."}}

``code`` is the stable machine-readable identifier — the thing a client may
branch on. ``message`` is **exactly the prose that raise site has always
emitted**, kept as a fallback so no player-visible copy changes when a raise is
converted. ``frontend/src/utils/errors.ts::extractError`` reads ``message`` for
display and deliberately shows nothing for a bare ``code``, so the two halves
can be adopted independently.

The i18n catalog lookup (``code`` -> ``errors.json``, the ADR-0031 emit-keys
half of #1401) is a **later slice**. Nothing here reads a catalog.

## Why a helper and not an exception hierarchy

``SPEC-backend-architecture.md`` §5 blesses ``HTTPException`` raised straight
from services, and ADR-0045 explains why this codebase does not carry a parallel
domain-exception hierarchy with a router-side translator. :func:`raise_coded` is
the smallest thing that adds a code without disturbing that posture: same
exception type, same status codes, same call site.

## The ratchet

``tests/unit/test_uncoded_error_ratchet.py`` inventories every remaining
``HTTPException(...)`` construction in the shipped backend against a shrink-only
allowlist. This module is the one place allowed to construct one directly — it
is the blessed constructor, so it is excluded from the scan. Everywhere else,
"has a code" is definitionally "went through :func:`raise_coded` or
:func:`coded_error`".
"""

from __future__ import annotations

import enum
from typing import Any, Mapping, NoReturn, Optional

from fastapi import HTTPException


class ErrorCode(str, enum.Enum):
    """Stable identifiers for the failures a client may want to branch on.

    A member's **value** is the wire contract: renaming one is a breaking change
    for any client (or, later, any ``errors.json`` key) that matches on it. The
    member *name* is internal and may be refactored freely.

    Grouped by the gate that raises it. Phase 1 (#1401) covers the errors
    players actually hit: the vote budget, level gates, signup caps,
    collab/duel eligibility, and media limits.
    """

    # -- Voting -------------------------------------------------------------
    vote_budget_exhausted = "VOTE_BUDGET_EXHAUSTED"

    # -- Level gates --------------------------------------------------------
    task_level_too_low = "TASK_LEVEL_TOO_LOW"
    collaboration_level_too_low = "COLLABORATION_LEVEL_TOO_LOW"
    duel_level_too_low = "DUEL_LEVEL_TOO_LOW"
    flag_level_too_low = "FLAG_LEVEL_TOO_LOW"
    comment_level_too_low = "COMMENT_LEVEL_TOO_LOW"
    task_proposal_level_too_low = "TASK_PROPOSAL_LEVEL_TOO_LOW"
    metatask_proposal_level_too_low = "METATASK_PROPOSAL_LEVEL_TOO_LOW"
    second_character_level_too_low = "SECOND_CHARACTER_LEVEL_TOO_LOW"
    praxis_mode_unavailable = "PRAXIS_MODE_UNAVAILABLE"

    # -- Signup caps and task-signup eligibility ----------------------------
    task_bank_full = "TASK_BANK_FULL"
    task_already_active_member = "TASK_ALREADY_ACTIVE_MEMBER"
    task_not_open_for_signup = "TASK_NOT_OPEN_FOR_SIGNUP"
    task_is_metatask = "TASK_IS_METATASK"

    # -- Duel eligibility ---------------------------------------------------
    duel_self_challenge = "DUEL_SELF_CHALLENGE"
    duel_requires_solo_praxis = "DUEL_REQUIRES_SOLO_PRAXIS"
    duel_requires_in_progress_praxis = "DUEL_REQUIRES_IN_PROGRESS_PRAXIS"
    duel_already_exists = "DUEL_ALREADY_EXISTS"
    duel_opponent_has_active_praxis = "DUEL_OPPONENT_HAS_ACTIVE_PRAXIS"

    # -- Collab-invite eligibility ------------------------------------------
    invite_self = "INVITE_SELF"
    invite_already_member = "INVITE_ALREADY_MEMBER"
    invite_already_pending = "INVITE_ALREADY_PENDING"
    invite_target_has_active_praxis = "INVITE_TARGET_HAS_ACTIVE_PRAXIS"
    invite_faction_not_permitted = "INVITE_FACTION_NOT_PERMITTED"
    invite_praxis_submitted = "INVITE_PRAXIS_SUBMITTED"

    # -- Media limits -------------------------------------------------------
    media_type_unsupported = "MEDIA_TYPE_UNSUPPORTED"
    media_too_large = "MEDIA_TOO_LARGE"
    avatar_must_be_image = "AVATAR_MUST_BE_IMAGE"
    avatar_too_large = "AVATAR_TOO_LARGE"


#: The two keys of a coded ``detail`` body. Named so the frontend contract is
#: greppable from Python and no raise site spells them as bare literals.
DETAIL_CODE_KEY = "code"
DETAIL_MESSAGE_KEY = "message"


def coded_detail(code: ErrorCode, message: str) -> dict[str, str]:
    """Build the ``detail`` body for a coded failure."""
    return {DETAIL_CODE_KEY: code.value, DETAIL_MESSAGE_KEY: message}


def coded_error(
    status_code: int,
    code: ErrorCode,
    message: str,
    headers: Optional[dict[str, str]] = None,
) -> HTTPException:
    """Build — but do not raise — a coded :class:`HTTPException`.

    Most call sites want :func:`raise_coded`. This exists for the two helpers
    that *return* an exception for a caller to raise or to report per-item:
    ``services.praxis._signup_denial_to_http`` and ``services.nudge._refuse``.
    Those are exactly the shapes a ``raise HTTPException`` regex cannot see,
    which is why the ratchet's scan is AST-based and matches construction.
    """
    return HTTPException(
        status_code=status_code, detail=coded_detail(code, message), headers=headers
    )


def raise_coded(
    status_code: int,
    code: ErrorCode,
    message: str,
    headers: Optional[dict[str, str]] = None,
) -> NoReturn:
    """Raise a coded failure. The blessed replacement for ``raise HTTPException``.

    ``message`` stays the prose the raise site already emitted — this helper
    adds a code, it does not rewrite copy.
    """
    raise coded_error(status_code, code, message, headers=headers)


def detail_message(detail: Any) -> str:
    """The displayable prose of any ``detail``, coded or not.

    Two endpoints flatten a per-item :class:`HTTPException` into a plain string
    field rather than returning it as the response body — the batch media upload
    (``schemas.praxis.MediaUploadResultOut.error``) and the crew nudge
    (``schemas.nudge.NudgeResultOut.error``). Both used to call ``str(detail)``,
    which on a coded detail would render the *dict repr* into a field a player
    reads. They call this instead, so those two envelopes keep carrying prose
    exactly as before while the raise sites behind them gain codes.
    """
    if isinstance(detail, Mapping):
        message = detail.get(DETAIL_MESSAGE_KEY)
        if isinstance(message, str):
            return message
    return str(detail)


def detail_code(detail: Any) -> Optional[str]:
    """The :class:`ErrorCode` value carried by a ``detail``, or ``None``.

    The read side of :func:`coded_detail`, for tests and for any caller that
    wants to branch on a code without knowing the body's shape.
    """
    if isinstance(detail, Mapping):
        code = detail.get(DETAIL_CODE_KEY)
        if isinstance(code, str):
            return code
    return None


__all__ = [
    "DETAIL_CODE_KEY",
    "DETAIL_MESSAGE_KEY",
    "ErrorCode",
    "coded_detail",
    "coded_error",
    "detail_code",
    "detail_message",
    "raise_coded",
]
