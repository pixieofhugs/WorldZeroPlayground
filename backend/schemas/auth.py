from typing import Optional

from schemas.base import WireModel

from schemas.character import CharacterOut


class CurrentUser(WireModel):
    # account_id is the one deliberate exception to the "never expose account_id publicly" rule.
    # The /auth/me endpoint is authenticated — it returns the caller's own account_id only.
    # Authorization: SPEC-backend-architecture.md §4
    account_id: int
    character: Optional[CharacterOut] = None
    is_admin: bool = False
    # Capability flags computed server-side so the frontend can hide controls it
    # cannot use (per WORLD_ZERO_STYLE validation pattern). Admin short-circuits
    # the propose/see flags to True; the eligibility flags have their own rules.
    can_create_additional_character: bool = False
    can_start_as_albescent: bool = False
    # Sticky Albescent secret-society reveal (ADR-0027, #390). True once any
    # character on this account has ever joined Albescent; gates whether the
    # frontend shows the real faction page vs. the sealed placeholder.
    albescent_revealed: bool = False
    # FieldDesk "locked dossier" gate copy reads these (#270/#274): the level an
    # existing life must reach to unlock a second life, and the live era's name.
    second_character_level_required: int = 0
    era_name: str = ""
    can_propose_task: bool = False
    can_propose_metatask: bool = False
    can_see_retired_tasks: bool = False
    can_see_pending_tasks: bool = False
    can_comment: bool = False
    # Faction level-jump allowance (#811). reach = levels above own level this
    # faction grants (0 = no such ability, so hide the affordance entirely);
    # available = unspent at the current level. Neither is short-circuited by
    # is_admin — the jump is a faction perk, not a level gate.
    level_jump_reach: int = 0
    level_jump_available: bool = False


class LogoutOut(WireModel):
    """Acknowledgement for ``POST /auth/logout``.

    The work of logging out is the ``Set-Cookie`` header that clears the JWT,
    not the body; this exists so the body is a declared shape in the schema
    rather than an untyped object the generated client cannot check.
    """

    message: str


class DevLoginOut(WireModel):
    """Result of the dev-only bot login (``POST /auth/dev-login``).

    Exposes ``account_id``, which the public API never does — and this is not a
    second exception beside ``/auth/me``. The endpoint 404s outside development
    (``settings.ENVIRONMENT``), and the ids exist so e2e fixtures can invite and
    credit by id without a second round trip. If this route ever becomes
    reachable in production the leak is the route, not the field.
    """

    message: str
    account_id: int
    # None whenever the dev account carries no character yet — passing `name=`
    # on the first call is what creates one.
    character_id: Optional[int] = None
    character_name: Optional[str] = None
    faction_slug: Optional[str] = None
