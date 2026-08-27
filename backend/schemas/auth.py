from datetime import date
from typing import Optional

from schemas.base import WireModel

from schemas.character import CharacterOut


class CurrentUser(WireModel):
    # account_id is the one deliberate exception to the "never expose account_id publicly" rule.
    # The /auth/me endpoint is authenticated — it returns the caller's own account_id only.
    # Authorization: SPEC-backend-architecture.md §4
    account_id: int
    # `email` rides that SAME exception, for the same reason (#2155): the
    # Settings Account card prints the address the player signed up with, and
    # /auth/me is authenticated and answers with the caller's own only. The rule
    # is unchanged for everything else: the only other schemas carrying an email
    # are admin-guarded or a request body.
    #
    # THIS MODEL ANSWERS THREE ROUTES, NOT ONE, and all three are self-scoped:
    # `GET /auth/me`, `POST /factions/choose` and `POST /me/active-character`
    # each resolve their account through `Depends(get_current_account)` and take
    # no account or character id from the caller, so none of them can be aimed
    # at somebody else's row. The exception rests on that property — not on
    # `/auth/me` being the only reader — so a FOURTH route returning
    # `CurrentUser` has to be checked for it before it ships.
    # `tests/integration/test_auth_me_account_fields.py` ratchets the carrier
    # list, so a future inheritance cannot widen it quietly.
    email: str = ""
    # Which identity this account signs in through — an ``AuthProvider`` value
    # read off ``OAuthProvider.provider`` (#2155). DISPLAY ONLY: the card says
    # "Signed in with Google" and offers no button, because the link-a-second-
    # provider flow (ADR-0075) does not exist and the owner ruled display-only
    # on 2026-08-17. "" when the account holds no OAuth row at all.
    provider: str = ""
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
    # Sticky Albescent GLIMPSE (#2770, amending ADR-0082) — the stage in front of
    # the reveal above. True once any character on this account has reached
    # `era.albescent_glimpse_level`; gates whether the frontend draws the eighth
    # row AT ALL. Below it the `/factions` tile and the race lane are absent;
    # from it up they are ADR-0082's `[REDACTED]`. Revealed implies glimpsed —
    # the server resolves that, so the client never has to.
    albescent_glimpsed: bool = False
    # FieldDesk "locked dossier" gate copy reads these (#270/#274): the level an
    # existing life must reach to unlock a second life, and the live era's name.
    second_character_level_required: int = 0
    # The Albescent CEILING (#2399), not a floor: a life AT this level may no
    # longer take Albescent ("Available only for New Game+"). The standing letter
    # needs it to say which of the account's lives it can still be answered by,
    # and the server is the authority — this is the same era-value-on-the-wire
    # idiom as `second_character_level_required` above, so the number is never
    # duplicated as a frontend literal.
    albescent_level_required: int = 0
    era_name: str = ""
    can_propose_task: bool = False
    can_propose_metatask: bool = False
    can_see_retired_tasks: bool = False
    can_see_pending_tasks: bool = False
    can_comment: bool = False
    # May the viewer pin an existing metatask to a praxis (#1973)? Not
    # `can_propose_metatask`, which is about authoring one. The frontend hides
    # the browse filter's metatask option and the composer's picker when False.
    # Not short-circuited by is_admin, and True for a faction carrying the
    # apply-level bypass even below the level — see character_capabilities.
    can_apply_metatask: bool = False
    # Faction level-jump allowance (#811). reach = levels above own level this
    # faction grants (0 = no such ability, so hide the affordance entirely);
    # available = unspent at the current level. Neither is short-circuited by
    # is_admin — the jump is a faction perk, not a level gate.
    level_jump_reach: int = 0
    level_jump_available: bool = False
    # Does the task browse OPEN narrowed to "tasks I can sign up for" (#2025)?
    # True only for a level-0 character — the tutorial state, which has exactly
    # one task to do. A DEFAULT, not a gate: GET /tasks still takes can_sign_up
    # from the client and no server branch is paired with this. Not
    # short-circuited by is_admin — see character_capabilities.
    task_browse_defaults_to_eligible: bool = False


class LogoutOut(WireModel):
    """Acknowledgement for ``POST /auth/logout``.

    The work of logging out is the ``Set-Cookie`` header that clears the JWT,
    not the body; this exists so the body is a declared shape in the schema
    rather than an untyped object the generated client cannot check.
    """

    message: str


class ReturningPlayerOut(WireModel):
    """What the consent gate is allowed to know (``GET /auth/returning-player``).

    One field, and the reason there is only one is the reason this model exists
    at all. The caller has authenticated as *nobody* — they hold a signed,
    ten-minute session cookie stamped by an OAuth handshake they just completed,
    and nothing else. Anything added here is a fact about an account that no
    longer exists, disclosed on that basis.

    A **date, not a timestamp**: the gate's sentence is *"you deleted your World
    Zero account on 3 March"*, and the hour and minute would be a finer signal
    bought for nothing the sentence needs. The tombstone's ``created_at`` is
    truncated in ``services.auth.ReturningPlayerConsentRequired``, so the
    precision is dropped before it ever reaches a response model.
    """

    deleted_on: date


class StartFreshOut(WireModel):
    """Acknowledgement for ``POST /auth/returning-player``.

    Same posture as :class:`LogoutOut`: the work is the ``Set-Cookie`` header,
    and the body exists so the generated client has a declared shape rather than
    an untyped object. The caller learns who it now is from ``/auth/me``, which
    is the one place that answers that question.
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
