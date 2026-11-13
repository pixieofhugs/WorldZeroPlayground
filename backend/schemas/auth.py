from datetime import date
from typing import Optional

from schemas.base import WireModel

from schemas.character import CharacterOut


class CurrentUser(WireModel):
    # account_id is the one deliberate exception to the "never expose account_id publicly" rule.
    # The /auth/me endpoint is authenticated — it returns the caller's own account_id only.
    # Authorization: SPEC-backend-architecture.md §4
    account_id: int
    # `email` rides the same exception (#2155). It rests on every route returning
    # this model being self-scoped (`GET /auth/me`, `POST /factions/choose`,
    # `POST /me/active-character`): check any new one before it ships.
    # test_auth_me_account_fields.py ratchets the carrier list.
    email: str = ""
    # ``AuthProvider`` value, display only (#2155); "" with no OAuth row.
    provider: str = ""
    character: Optional[CharacterOut] = None
    is_admin: bool = False
    # Gates the admin-roster section (``account_is_owner``, #3258).
    is_owner: bool = False
    # Server-side capability flags. Admin forces propose/see flags True; the
    # eligibility flags have their own rules (see character_capabilities).
    can_create_additional_character: bool = False
    can_start_as_albescent: bool = False
    # Sticky (ADR-0027): any life on the account ever joined Albescent.
    albescent_revealed: bool = False
    # Sticky (#2770): any life reached `era.albescent_glimpse_level`; gates
    # whether the Albescent row is drawn at all. Revealed implies glimpsed.
    albescent_glimpsed: bool = False
    # For the "locked dossier" gate copy (#270).
    second_character_level_required: int = 0
    # A CEILING (#2399): a life at this level may no longer take Albescent.
    albescent_level_required: int = 0
    era_name: str = ""
    can_propose_task: bool = False
    can_propose_metatask: bool = False
    can_see_retired_tasks: bool = False
    can_see_pending_tasks: bool = False
    can_comment: bool = False
    # False until the character ever reached `era.vote_level_required` (#3102).
    # Distinct from per-praxis `viewer_can_vote`.
    can_vote: bool = False
    vote_level_required: int = 0
    # May pin an existing metatask (#1973); not admin-forced.
    can_apply_metatask: bool = False
    # Faction level-jump perk (#811): reach 0 = none; not admin-forced.
    level_jump_reach: int = 0
    level_jump_available: bool = False
    # Browse opens on "can sign up" for level 0 (#2025). A default, not a gate.
    task_browse_defaults_to_eligible: bool = False


class LogoutOut(WireModel):
    """``POST /auth/logout`` ack; the work is the ``Set-Cookie`` header."""

    message: str


class ReturningPlayerOut(WireModel):
    """What the consent gate may know (``GET /auth/returning-player``).

    The caller is authenticated as nobody, so keep this to one field. A date, not
    a timestamp: truncated in ``ReturningPlayerConsentRequired``.
    """

    deleted_on: date


class StartFreshOut(WireModel):
    """``POST /auth/returning-player`` ack; see :class:`LogoutOut`."""

    message: str


class DevLoginOut(WireModel):
    """Dev-only bot login (``POST /auth/dev-login``).

    ``account_id`` is safe only because the route 404s outside development.
    """

    message: str
    account_id: int
    # None until a call passes `name=`.
    character_id: Optional[int] = None
    character_name: Optional[str] = None
    faction_slug: Optional[str] = None
