import enum
from typing import TYPE_CHECKING, List

from sqlalchemy import (
    BigInteger,
    Boolean,
    Enum,
    ForeignKey,
    Identity,
    String,
    UniqueConstraint,
)
from sqlalchemy.orm import Mapped, mapped_column, relationship

from models.base import Base
from models.mixins import TimestampMixin

if TYPE_CHECKING:
    from models.character import Character


class AccountStatus(enum.Enum):
    """Account lifecycle. ``suspended`` is the only non-``active`` state written.

    There is no ``deleted``: nothing in the codebase ever set it, and the two
    gates that read status (``dependencies.py``, ``services/auth.py``) test for
    ``active`` — so a `deleted` account behaved exactly like a suspended one
    while implying an account-erasure flow that does not exist. Removed in the
    #1398 squash rather than left as a value the DB would accept and no code
    could produce.
    """

    active = "active"
    suspended = "suspended"


class AuthProvider(enum.StrEnum):
    """The identity providers World Zero accepts, as written to ``OAuthProvider.provider``.

    A ``StrEnum`` and **not** a Postgres enum on purpose. ADR-0041 promises that
    adding a provider is "a new handler + a row — no schema change"; a DB-level
    enum would make every future provider an ``ALTER TYPE`` migration and a
    deploy-ordering problem. The column stays ``String`` and this is the
    application-level constraint, which is where the rest of the domain values
    in this codebase live too.

    ``DISCORD`` has no handler yet (#1772). It is listed here because the enum
    is the complete vocabulary of the column, not an inventory of what is wired
    up — which is also why ``DEMO`` is here: ``scripts/seed_demo_praxes.py``
    writes it for the demo roster, and those rows exist only so the seeded
    characters have the Account every character needs. Nothing signs in through
    it (the dev bypass mints ``DEV`` rows).
    """

    GOOGLE = "google"
    DISCORD = "discord"
    DEV = "dev"
    DEMO = "demo"


class Account(TimestampMixin, Base):
    __tablename__ = "account"

    id: Mapped[int] = mapped_column(BigInteger, Identity(), primary_key=True)
    email: Mapped[str] = mapped_column(String, unique=True, nullable=False)
    status: Mapped[AccountStatus] = mapped_column(
        Enum(AccountStatus, create_type=False), nullable=False, default=AccountStatus.active
    )
    # The "last carried life" — which character this account is currently playing as.
    # Nullable: a 0-life account, or one that has not switched yet. use_alter avoids a
    # chicken-and-egg DDL cycle with character.account_id → account.id.
    active_character_id: Mapped[int | None] = mapped_column(
        BigInteger,
        ForeignKey("character.id", use_alter=True, name="fk_account_active_character"),
        nullable=True,
    )
    # Sticky reveal flag for the Albescent secret society (ADR-0027, #390): flips
    # True the first time any character on this account joins Albescent, and is
    # never unset. Gates whether the faction listing/page surfaces Albescent at
    # all. Do NOT derive from live membership — it survives age-out and switches.
    albescent_revealed: Mapped[bool] = mapped_column(
        Boolean, nullable=False, default=False, server_default="false"
    )
    # Sticky Albescent *unlock* — the door, not the sight of it (#2399). Flips
    # True the first time one life on this account is simultaneously at
    # `era.albescent_level_required` and has been invited to or has held every
    # joinable faction this era; never unset. Same shape and the same reasoning
    # as `albescent_revealed` above, for a stronger reason: letters and
    # defection rows are era-scoped and `apply_era_reset` returns every life to
    # `na` at level 0, so after a reset there is nothing left to derive this
    # from. It has to be stamped (`services.character.stamp_albescent_unlock`,
    # called from `recalculate_character_stats`) or it cannot survive at all.
    #
    # NOT the same question as `albescent_revealed`: revealed = "this account
    # may be shown the order exists", unlocked = "this account may put a life
    # into it". Joining sets both; earning sets only this one.
    albescent_unlocked: Mapped[bool] = mapped_column(
        Boolean, nullable=False, default=False, server_default="false"
    )

    # foreign_keys pins this to character.account_id — active_character_id adds a
    # second FK path between the tables that would otherwise be ambiguous.
    characters: Mapped[List["Character"]] = relationship(
        "Character",
        back_populates="account",
        lazy="raise",
        foreign_keys="Character.account_id",
    )
    oauth_providers: Mapped[List["OAuthProvider"]] = relationship(
        "OAuthProvider", back_populates="account", lazy="raise"
    )


class OAuthProvider(TimestampMixin, Base):
    __tablename__ = "oauth_provider"

    # ``(provider, provider_user_id)`` is the pair every sign-in looks up, with
    # ``scalar_one_or_none()`` (``services/auth.py``). Two rows for one pair —
    # two concurrent first logins being the obvious route — would make that call
    # raise ``MultipleResultsFound`` on every *subsequent* login for that
    # account, permanently, with no self-service recovery. The constraint makes
    # the race lose loudly at insert time instead, and turns the lookup into an
    # index seek. Unique on the pair, not on ``provider_user_id`` alone: two
    # providers may hand out the same opaque id.
    __table_args__ = (UniqueConstraint("provider", "provider_user_id"),)

    id: Mapped[int] = mapped_column(BigInteger, Identity(), primary_key=True)
    account_id: Mapped[int] = mapped_column(
        BigInteger, ForeignKey("account.id"), nullable=False
    )
    # Values come from :class:`AuthProvider`; the column is a plain ``String``
    # so a new provider stays "a handler + a row" (ADR-0041).
    provider: Mapped[str] = mapped_column(String, nullable=False)
    provider_user_id: Mapped[str] = mapped_column(String, nullable=False)
    # No `access_token` (#1374). The Google token was written once at sign-in
    # and read by nothing: World Zero authenticates with its own JWT and never
    # calls a Google API on the player's behalf. Storing a live third-party
    # credential that no code path uses is pure liability, so the column is
    # gone rather than nulled.

    account: Mapped["Account"] = relationship(
        "Account", back_populates="oauth_providers", lazy="raise"
    )
