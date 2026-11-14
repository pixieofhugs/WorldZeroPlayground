"""Machine-readable error codes for API failures (#1401).

A coded failure's ``detail`` is ``{"code", "message", "params"?}``. ``code`` is the
wire contract; ``message`` is the raise site's original prose, the fallback when
``errors.ts::extractError`` finds no catalog entry. ``params`` (optional, omitted
when empty) carries runtime values for the i18next placeholders in errors.json.

A helper, not an exception hierarchy: see SPEC-backend-architecture.md §5 and
ADR-0045. This module is the one place allowed to construct ``HTTPException``;
``test_uncoded_error_ratchet.py`` holds everything else to a shrink-only list.
"""

from __future__ import annotations

import enum
from typing import Any, Mapping, NoReturn, Optional

from fastapi import HTTPException


@enum.unique
class ErrorCode(str, enum.Enum):
    """Stable identifiers for failures a client may branch on.

    A member's **value** is the wire contract (renaming breaks clients); the
    name is internal.
    """

    # -- Voting -------------------------------------------------------------
    vote_budget_exhausted = "VOTE_BUDGET_EXHAUSTED"
    vote_level_too_low = "VOTE_LEVEL_TOO_LOW"

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
    #: Worded per filter via :data:`DETAIL_CONTEXT_PARAM`.
    praxis_filter_value_invalid = "PRAXIS_FILTER_VALUE_INVALID"
    praxis_not_found = "PRAXIS_NOT_FOUND"
    #: ``DELETE /praxes/{id}/media/{id}`` can 404 for either reason: dead link
    #: vs stale media list.
    media_item_not_found = "MEDIA_ITEM_NOT_FOUND"

    # -- Tasks and characters as targets (#1652 slice two) -------------------
    #: Distinct from praxis_not_found: sibling comment routes 404 for different ids.
    task_not_found = "TASK_NOT_FOUND"
    character_not_found = "CHARACTER_NOT_FOUND"
    #: #1714. Slug not in the era's config (ADR-0042) — not a missing
    #: ``Faction`` row, which is :attr:`faction_not_found`.
    task_faction_unknown = "TASK_FACTION_UNKNOWN"
    #: #3379. A ``hidden`` system faction can't be filed under; 422 like unknown.
    task_faction_hidden = "TASK_FACTION_HIDDEN"
    #: #3062. Delete is for import junk with no references; else retire.
    task_has_history = "TASK_HAS_HISTORY"
    #: #3062. A ``seed_key`` row would come back on the next deploy.
    task_seed_owned = "TASK_SEED_OWNED"

    # -- Factions: joining, defecting, and the letters that gate both --------
    faction_not_found = "FACTION_NOT_FOUND"
    faction_already_member = "FACTION_ALREADY_MEMBER"
    #: The unaffiliated sentinel is a start state (ADR-0019/0030).
    faction_not_selectable = "FACTION_NOT_SELECTABLE"
    faction_rejoin_forbidden = "FACTION_REJOIN_FORBIDDEN"
    #: #454. One rule, raised from defecting and character creation.
    faction_invitation_required = "FACTION_INVITATION_REQUIRED"
    #: #2399. The *account* has never earned the Albescent door.
    faction_albescent_not_eligible = "FACTION_ALBESCENT_NOT_ELIGIBLE"
    #: #2399. Earned, but THIS life is past ``era.albescent_level_required`` —
    #: the game's only MAXIMUM level gate.
    faction_albescent_new_game_plus_only = "FACTION_ALBESCENT_NEW_GAME_PLUS_ONLY"

    # -- Character creation --------------------------------------------------
    character_name_required = "CHARACTER_NAME_REQUIRED"
    #: #1577. Un-ban asked of a life the *player* ended (``departed_at`` set).
    character_departed_not_restorable = "CHARACTER_DEPARTED_NOT_RESTORABLE"

    # -- Praxis ownership and comment threads --------------------------------
    praxis_not_owner = "PRAXIS_NOT_OWNER"
    praxis_not_open_for_comments = "PRAXIS_NOT_OPEN_FOR_COMMENTS"
    task_not_open_for_comments = "TASK_NOT_OPEN_FOR_COMMENTS"
    #: Exactly-one-target guard; unreachable from today's routes.
    comment_target_ambiguous = "COMMENT_TARGET_AMBIGUOUS"
    #: One flag per ACCOUNT per comment (#2184).
    comment_already_flagged = "COMMENT_ALREADY_FLAGGED"

    # -- Duel challenge lifecycle --------------------------------------------
    duel_challenge_not_yours = "DUEL_CHALLENGE_NOT_YOURS"
    duel_challenge_already_resolved = "DUEL_CHALLENGE_ALREADY_RESOLVED"

    # -- Relationships ------------------------------------------------------
    relationship_not_found = "RELATIONSHIP_NOT_FOUND"
    relationship_not_declarer = "RELATIONSHIP_NOT_DECLARER"
    #: ADR-0077: the block route's only refusal. Any other refusal would
    #: announce the block.
    block_self = "BLOCK_SELF"

    # -- Activity feed ------------------------------------------------------
    feed_item_key_unknown = "FEED_ITEM_KEY_UNKNOWN"
    feed_item_key_malformed = "FEED_ITEM_KEY_MALFORMED"
    feed_item_not_archivable = "FEED_ITEM_NOT_ARCHIVABLE"

    # -- Google Photos as a proof source (#559) -------------------------------
    #: The Account has no Google sign-in, so the Photos routes refuse it.
    google_photos_unavailable = "GOOGLE_PHOTOS_UNAVAILABLE"
    #: A picker session id this Account never opened, or one that has lapsed.
    google_photos_session_invalid = "GOOGLE_PHOTOS_SESSION_INVALID"
    #: Google itself failed or refused.
    google_photos_failed = "GOOGLE_PHOTOS_FAILED"

    # -- Sign-in ------------------------------------------------------------
    #: Security: new OAuth identities link to accounts BY EMAIL, so an unverified
    #: address cannot be trusted.
    oauth_email_unverified = "OAUTH_EMAIL_UNVERIFIED"
    #: #1773. Any other callback ending without a session (usually declined
    #: consent). Never raised: the fallback ``_sign_in_failed_redirect`` carries.
    oauth_failed = "OAUTH_FAILED"
    #: #1756. The OAuth ``state`` cookie expired (ten minutes). Never raised.
    oauth_state_expired = "OAUTH_STATE_EXPIRED"
    #: #2162. The provider pair resolved to a suspended Account.
    account_suspended = "ACCOUNT_SUSPENDED"
    #: #2162. Not folded into account_suspended: a self-made tombstone
    #: (ADR-0081), not an appealable moderation. Unreachable today, since
    #: ``delete_account`` removes the ``OAuthProvider`` rows.
    account_deleted = "ACCOUNT_DELETED"
    #: #2162. Consent gate reached with no interrupted sign-in behind it.
    returning_player_consent_expired = "RETURNING_PLAYER_CONSENT_EXPIRED"

    # -- Era rollover (#827, ADR-0091) --------------------------------------
    #: A rollover naming an unregistered ``config_key``.
    era_config_unknown = "ERA_CONFIG_UNKNOWN"
    #: Re-opening the live era would wipe every score for nothing. 409, not
    #: 422: the request is well formed, the state refuses it.
    era_already_live = "ERA_ALREADY_LIVE"

    # -- Copy overrides (#3065) ---------------------------------------------
    #: Usually two admins reverting the same string: already shipped wording.
    copy_override_not_found = "COPY_OVERRIDE_NOT_FOUND"

    # -- Owner-only admin roster (#3258) ------------------------------------
    #: A non-owner on the roster routes. 403, like ``require_admin``.
    admin_owner_required = "ADMIN_OWNER_REQUIRED"
    admin_unknown_username = "ADMIN_UNKNOWN_USERNAME"
    #: The service is idempotent; this tells a typo from a real grant.
    admin_already_admin = "ADMIN_ALREADY_ADMIN"
    #: 404, the mirror of the grant's 409.
    admin_not_an_admin = "ADMIN_NOT_AN_ADMIN"
    #: The owner cannot be demoted from the page.
    admin_cannot_revoke_owner = "ADMIN_CANNOT_REVOKE_OWNER"


#: The keys of a coded ``detail`` body.
DETAIL_CODE_KEY = "code"
DETAIL_MESSAGE_KEY = "message"
DETAIL_PARAMS_KEY = "params"

#: The one ``params`` entry not interpolated: picks a ``<CODE>_<context>``
#: catalog variant (i18next context) when one code has per-surface prose.
#: Prefer a new code when the failures genuinely differ.
DETAIL_CONTEXT_PARAM = "context"

ErrorParams = Mapping[str, Any]


def coded_detail(
    code: ErrorCode, message: str, params: Optional[ErrorParams] = None
) -> dict[str, Any]:
    """Build the ``detail`` body; ``params`` is omitted when empty."""
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

    For helpers that *return* an exception; most sites want :func:`raise_coded`.
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
    """Raise a coded failure. The blessed replacement for ``raise HTTPException``."""
    raise coded_error(status_code, code, message, params, headers=headers)


def detail_message(detail: Any) -> str:
    """The displayable prose of any ``detail``, coded or not.

    Use instead of ``str(detail)``, which renders a coded detail's dict repr.
    """
    if isinstance(detail, Mapping):
        message = detail.get(DETAIL_MESSAGE_KEY)
        if isinstance(message, str):
            return message
    return str(detail)


def detail_code(detail: Any) -> Optional[str]:
    """The :class:`ErrorCode` value carried by a ``detail``, or ``None``."""
    if isinstance(detail, Mapping):
        code = detail.get(DETAIL_CODE_KEY)
        if isinstance(code, str):
            return code
    return None


def detail_params(detail: Any) -> dict[str, Any]:
    """The interpolation ``params`` carried by a ``detail``; absent reads as empty."""
    if isinstance(detail, Mapping):
        params = detail.get(DETAIL_PARAMS_KEY)
        if isinstance(params, Mapping):
            return dict(params)
    return {}
