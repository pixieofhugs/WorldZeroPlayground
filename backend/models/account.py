import enum
from typing import TYPE_CHECKING, List

from sqlalchemy import BigInteger, Boolean, Enum, ForeignKey, Identity, String
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

    id: Mapped[int] = mapped_column(BigInteger, Identity(), primary_key=True)
    account_id: Mapped[int] = mapped_column(
        BigInteger, ForeignKey("account.id"), nullable=False
    )
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
