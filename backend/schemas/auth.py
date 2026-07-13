from typing import Optional

from pydantic import BaseModel

from schemas.character import CharacterOut


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"


class CurrentUser(BaseModel):
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
    can_see_metatasks: bool = False
    can_see_retired_tasks: bool = False
    can_see_pending_tasks: bool = False
    can_comment: bool = False
