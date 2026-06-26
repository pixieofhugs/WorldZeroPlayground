import enum
from typing import TYPE_CHECKING, List

from sqlalchemy import Enum, ForeignKey, String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from models.base import Base
from models.mixins import TimestampMixin

if TYPE_CHECKING:
    from models.character import Character


class AccountStatus(enum.Enum):
    active = "active"
    suspended = "suspended"
    deleted = "deleted"


class Account(TimestampMixin, Base):
    __tablename__ = "account"

    id: Mapped[int] = mapped_column(primary_key=True)
    email: Mapped[str] = mapped_column(String, unique=True, nullable=False)
    status: Mapped[AccountStatus] = mapped_column(
        Enum(AccountStatus, create_type=False), nullable=False, default=AccountStatus.active
    )
    # The "last carried life" — which character this account is currently playing as.
    # Nullable: a 0-life account, or one that has not switched yet. use_alter avoids a
    # chicken-and-egg DDL cycle with character.account_id → account.id.
    active_character_id: Mapped[int | None] = mapped_column(
        ForeignKey("character.id", use_alter=True, name="fk_account_active_character"),
        nullable=True,
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

    id: Mapped[int] = mapped_column(primary_key=True)
    account_id: Mapped[int] = mapped_column(ForeignKey("account.id"), nullable=False)
    provider: Mapped[str] = mapped_column(String, nullable=False)
    provider_user_id: Mapped[str] = mapped_column(String, nullable=False)
    access_token: Mapped[str] = mapped_column(String, nullable=False)

    account: Mapped["Account"] = relationship(
        "Account", back_populates="oauth_providers", lazy="raise"
    )
