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
converted. ``frontend/src/utils/errors.ts::extractError`` resolves the catalog
first and falls back to ``message``, so the two halves stay independently
adoptable: a code the catalog does not know still renders its prose.

## ``params``: the numbers the catalog cannot know

Fifteen raise sites interpolate a runtime value into their prose — the level
gates, the signup caps, the media ceilings. ``frontend/src/locales/en/errors.json``
owns the words (ADR-0031), but it cannot reproduce *"level 3"* from the key
alone, and dropping the number makes the message unactionable. So a coded
detail may carry a third member::

    {"detail": {"code": "TASK_LEVEL_TOO_LOW",
                "message": "This task requires level 3.",
                "params": {"level": 3}}}

``params`` is **additive and optional** — omitted entirely when a raise site has
nothing to interpolate, so the non-interpolating sites' bodies are unchanged and
a client that ignores the field is unaffected. Its keys are the i18next
placeholder names used in ``errors.json``.

One key is special: see :data:`DETAIL_CONTEXT_PARAM`.

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
    collab/duel eligibility, and media limits. #1652 adds the read-path
    rejections a player reaches by URL rather than by button — the praxis
    filters, the two 404s that share ``DELETE /praxes/{id}/media/{id}``, the
    relationship-delete guard, and the feed-item key parser — and then, in its
    second slice, the service-layer gates behind the buttons themselves:
    defection, commenting, duel challenge and response, character creation.
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

    # -- Praxis reads: filters and missing rows (#1652) ----------------------
    #: One failure — a query parameter naming a value no enum member matches —
    #: worded per filter via :data:`DETAIL_CONTEXT_PARAM`. Five 422s on
    #: ``GET /praxes`` that nothing but their prose used to tell apart.
    praxis_filter_value_invalid = "PRAXIS_FILTER_VALUE_INVALID"
    praxis_not_found = "PRAXIS_NOT_FOUND"
    #: Distinct from :attr:`praxis_not_found` on purpose: ``DELETE
    #: /praxes/{id}/media/{id}`` can 404 for either reason, and which one it was
    #: is the difference between a dead link and a stale media list.
    media_item_not_found = "MEDIA_ITEM_NOT_FOUND"

    # -- Tasks and characters as targets (#1652 slice two) -------------------
    #: A task id that resolves to nothing. Distinct from
    #: :attr:`praxis_not_found` because ``POST /praxes/{id}/comments`` and
    #: ``POST /tasks/{id}/comments`` are sibling routes answering the same 404
    #: for different reasons — the code is what says which id was wrong.
    task_not_found = "TASK_NOT_FOUND"
    character_not_found = "CHARACTER_NOT_FOUND"
    #: #1714. An admin edit naming a faction slug the current era does not
    #: define. Config owns which factions exist (ADR-0042), so this is a
    #: config-membership answer, not a row lookup — hence not
    #: :attr:`faction_not_found`, which reports a missing ``Faction`` row to a
    #: player joining one.
    task_faction_unknown = "TASK_FACTION_UNKNOWN"

    # -- Factions: joining, defecting, and the letters that gate both --------
    faction_not_found = "FACTION_NOT_FOUND"
    faction_already_member = "FACTION_ALREADY_MEMBER"
    #: The unaffiliated sentinel is a start state, not a destination
    #: (ADR-0019/0030).
    faction_not_selectable = "FACTION_NOT_SELECTABLE"
    faction_rejoin_forbidden = "FACTION_REJOIN_FORBIDDEN"
    #: #454. Raised from two surfaces — defecting and character creation —
    #: because it is one rule: you hold the current era's letter or you do not.
    faction_invitation_required = "FACTION_INVITATION_REQUIRED"
    #: #2399 (supersedes ADR-0021). The *account* has never earned the Albescent
    #: door — no life on it has reached the level while covering every faction.
    faction_albescent_not_eligible = "FACTION_ALBESCENT_NOT_ELIGIBLE"
    #: #2399. The account earned it, but THIS life is at
    #: ``era.albescent_level_required`` and it is too late for this one. The only
    #: MAXIMUM level gate in the game — every other level test is a floor — and
    #: a different answer to a different question than the code above, hence its
    #: own code. "Available only for New Game+".
    faction_albescent_new_game_plus_only = "FACTION_ALBESCENT_NEW_GAME_PLUS_ONLY"

    # -- Character creation --------------------------------------------------
    character_name_required = "CHARACTER_NAME_REQUIRED"
    #: #1577. The admin ban toggle asked to un-ban a life the *player* ended
    #: (``Character.departed_at`` is set). Coded rather than left as prose even
    #: though ``routers/admin.py`` is otherwise an uncoded, admin-only surface:
    #: it is the one refusal on that route a caller must tell apart from the 404
    #: beside it, and the uncoded-raise allowlist only shrinks.
    character_departed_not_restorable = "CHARACTER_DEPARTED_NOT_RESTORABLE"

    # -- Praxis ownership and comment threads --------------------------------
    praxis_not_owner = "PRAXIS_NOT_OWNER"
    praxis_not_open_for_comments = "PRAXIS_NOT_OPEN_FOR_COMMENTS"
    task_not_open_for_comments = "TASK_NOT_OPEN_FOR_COMMENTS"
    #: The service's exactly-one-target guard. Unreachable from the two comment
    #: routes, which each pass one target; it answers any future caller that
    #: passes both or neither, and the DB CHECK behind it.
    comment_target_ambiguous = "COMMENT_TARGET_AMBIGUOUS"
    #: One flag per ACCOUNT per comment (#2184), the twin of the praxis rule.
    #: The praxis pair predates the ratchet and is grandfathered uncoded; this
    #: raise is new, so it is coded — ``uncoded_error_allowlist`` only shrinks.
    comment_already_flagged = "COMMENT_ALREADY_FLAGGED"

    # -- Duel challenge lifecycle --------------------------------------------
    duel_challenge_not_yours = "DUEL_CHALLENGE_NOT_YOURS"
    duel_challenge_already_resolved = "DUEL_CHALLENGE_ALREADY_RESOLVED"

    # -- Relationships ------------------------------------------------------
    relationship_not_found = "RELATIONSHIP_NOT_FOUND"
    relationship_not_declarer = "RELATIONSHIP_NOT_DECLARER"
    #: ADR-0077. The one refusal the block route has: a self-block is
    #: meaningless and every read would have to special-case it. Every *other*
    #: outcome of a block is a success, deliberately — a refusal that fired only
    #: across a block would announce the block (ADR-0077 ruling 2).
    block_self = "BLOCK_SELF"

    # -- Activity feed ------------------------------------------------------
    feed_item_key_unknown = "FEED_ITEM_KEY_UNKNOWN"
    feed_item_key_malformed = "FEED_ITEM_KEY_MALFORMED"
    feed_item_not_archivable = "FEED_ITEM_NOT_ARCHIVABLE"

    # -- Sign-in ------------------------------------------------------------
    #: The provider returned an address it does not vouch for. Refused because
    #: an unseen OAuth identity is linked to an existing account BY EMAIL, which
    #: makes the claim an authentication decision rather than a profile detail.
    oauth_email_unverified = "OAUTH_EMAIL_UNVERIFIED"
    #: #1773. Every other way a callback ends without a session — in practice,
    #: the player declined the consent screen. One code rather than a taxonomy,
    #: because the player's next move is the same for all of them and the
    #: provider's own error strings are not copy we would show. Unlike every
    #: other member this one is never raised — it is the fallback
    #: ``routers.auth._sign_in_failed_redirect`` carries when the exception it
    #: caught has no coded detail of its own.
    oauth_failed = "OAUTH_FAILED"
    #: #1756. The sign-in went stale rather than being refused: the player
    #: started it, got distracted, and came back after the session cookie
    #: carrying the OAuth ``state`` had expired (ten minutes, #1755). Split out
    #: of :attr:`oauth_failed` because it is the one member of that family the
    #: player did not choose, and the only one where "try again" is genuine
    #: advice rather than a shrug. Never raised, for the same reason.
    oauth_state_expired = "OAUTH_STATE_EXPIRED"
    #: #2162. The provider pair resolved to a suspended Account. Until this
    #: issue the returning-player branch never read ``status`` at all: the
    #: sign-in succeeded, minted a cookie, and then 401'd from
    #: ``get_current_account`` on every request afterwards. A moderated account
    #: is owed a sentence, not a session that does not work.
    account_suspended = "ACCOUNT_SUSPENDED"
    #: #2162, and deliberately NOT folded into :attr:`account_suspended`. The
    #: two statuses reach the same gate but they are not the same answer — one
    #: is a moderation decision that a human can appeal, the other is a
    #: tombstone the player made themselves (ADR-0081). Unreachable today by
    #: construction, because ``delete_account`` destroys the ``OAuthProvider``
    #: rows in the transaction that sets the status; it exists so that if the
    #: pairing ever occurs the outcome is a refusal in the right words rather
    #: than a session.
    account_deleted = "ACCOUNT_DELETED"
    #: #2162. The consent gate was asked for, or answered, with no interrupted
    #: sign-in behind it — walked into by URL, or come back to after the OAuth
    #: session cookie's ten minutes lapsed. Not a failure of the sign-in: there
    #: is no sign-in. The player starts one.
    returning_player_consent_expired = "RETURNING_PLAYER_CONSENT_EXPIRED"

    # -- Era rollover (#827, ADR-0091) --------------------------------------
    #: A rollover naming a ``config_key`` no era file registers. Coded despite
    #: ``routers/admin.py`` being an otherwise-uncoded staff surface, for the
    #: same reason as :attr:`character_departed_not_restorable`: this raise is
    #: new and the uncoded-raise allowlist only shrinks. It is also the one
    #: refusal standing between a typo and an ``Era`` row that names no
    #: ruleset — a row whose rules the process cannot resolve, on the most
    #: destructive operation in the system.
    era_config_unknown = "ERA_CONFIG_UNKNOWN"
    #: A rollover naming the era that is already live. Refused because opening
    #: an era is an append, not an assignment: re-opening the live one wipes
    #: every score, level, vote budget and faction, freezes every duel and
    #: retires the board, to arrive at the ruleset the game was already on.
    #: Distinct from :attr:`era_config_unknown` — the key is perfectly valid,
    #: the *target* is. 409 rather than 422 because nothing about the request is
    #: malformed; it is the state of the world that refuses it.
    era_already_live = "ERA_ALREADY_LIVE"


#: The keys of a coded ``detail`` body. Named so the frontend contract is
#: greppable from Python and no raise site spells them as bare literals.
DETAIL_CODE_KEY = "code"
DETAIL_MESSAGE_KEY = "message"
DETAIL_PARAMS_KEY = "params"

#: The one ``params`` entry that is not interpolated into copy.
#:
#: Five codes are raised with genuinely different prose at different sites:
#: ``FLAG_LEVEL_TOO_LOW`` reads "…to flag a comment" in :mod:`services.comment`
#: and "…to flag a praxis" in :mod:`services.praxis`; ``TASK_BANK_FULL`` gains
#: "Complete or withdraw one first." on the signup path only. A single catalog
#: key per code cannot render both variants, and #1401 adds a machine-readable
#: channel — it does not restyle copy. So the raise site names its variant here
#: and the catalog carries a ``<CODE>_<context>`` sibling key, which is
#: i18next's native ``context`` feature rather than anything bespoke.
#:
#: Prefer *not* reaching for this. A new code is the better answer whenever the
#: two messages describe genuinely different failures; ``context`` is for one
#: failure worded for its surface.
DETAIL_CONTEXT_PARAM = "context"

#: What a ``params`` mapping may carry: interpolation values (ints for levels
#: and caps) plus the string :data:`DETAIL_CONTEXT_PARAM` discriminator.
ErrorParams = Mapping[str, Any]


def coded_detail(
    code: ErrorCode, message: str, params: Optional[ErrorParams] = None
) -> dict[str, Any]:
    """Build the ``detail`` body for a coded failure.

    ``params`` is omitted from the body entirely when absent or empty, so a
    raise site with nothing to interpolate produces the exact two-key body it
    produced before #1401's catalog slice.
    """
    detail: dict[str, Any] = {
        DETAIL_CODE_KEY: code.value,
        DETAIL_MESSAGE_KEY: message,
    }
    if params:
        detail[DETAIL_PARAMS_KEY] = dict(params)
    return detail


def coded_error(
    status_code: int,
    code: ErrorCode,
    message: str,
    params: Optional[ErrorParams] = None,
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
        status_code=status_code,
        detail=coded_detail(code, message, params),
        headers=headers,
    )


def raise_coded(
    status_code: int,
    code: ErrorCode,
    message: str,
    params: Optional[ErrorParams] = None,
    headers: Optional[dict[str, str]] = None,
) -> NoReturn:
    """Raise a coded failure. The blessed replacement for ``raise HTTPException``.

    ``message`` stays the prose the raise site already emitted — this helper
    adds a code and (since the catalog slice) the values that prose interpolates.
    It does not rewrite copy.
    """
    raise coded_error(status_code, code, message, params, headers=headers)


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


def detail_params(detail: Any) -> dict[str, Any]:
    """The interpolation ``params`` carried by a ``detail``, or an empty mapping.

    Absent ``params`` reads the same as empty ``params`` on purpose: a caller
    can splat the result into a catalog lookup without branching on whether the
    raise site had anything to interpolate.
    """
    if isinstance(detail, Mapping):
        params = detail.get(DETAIL_PARAMS_KEY)
        if isinstance(params, Mapping):
            return dict(params)
    return {}
