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
    text,
)
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import Mapped, mapped_column, relationship

from models.base import Base
from models.mixins import CreatedAtMixin, TimestampMixin

if TYPE_CHECKING:
    from models.character import Character


class AccountStatus(enum.Enum):
    """Account lifecycle: playable, moderated, or ended by the player.

    ``deleted`` (one writer: ``services.account_deletion.delete_account``) gates
    like ``suspended``; it differs in that the row is blanked. ADR-0081.
    """

    active = "active"
    suspended = "suspended"
    deleted = "deleted"


class AuthProvider(enum.StrEnum):
    """Vocabulary of ``OAuthProvider.provider``.

    Not a Postgres enum: a new provider must stay "a handler + a row" (ADR-0041).
    The full column vocabulary, not what is wired: ``DISCORD`` has no handler
    (#1772); ``DEMO`` is only for seeded demo accounts.
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
    # The "last carried life". use_alter breaks the DDL cycle with character.account_id.
    active_character_id: Mapped[int | None] = mapped_column(
        BigInteger,
        ForeignKey("character.id", use_alter=True, name="fk_account_active_character"),
        nullable=True,
    )
    # Sticky (ADR-0027): set when any life joins Albescent, never unset. Do NOT
    # derive from live membership — it survives age-out and switches.
    albescent_revealed: Mapped[bool] = mapped_column(
        Boolean, nullable=False, default=False, server_default="false"
    )
    # Sticky (#2399), stamped by `services.character.stamp_albescent_unlock`:
    # era reset leaves nothing to derive it from.
    albescent_unlocked: Mapped[bool] = mapped_column(
        Boolean, nullable=False, default=False, server_default="false"
    )
    # Sticky (#2770), stamped by `services.character.stamp_albescent_glimpse`.
    # Account-scoped so the tile doesn't blink with the character switcher.
    # glimpsed = may see a row is there; revealed = may read it; unlocked = may
    # join. Revealed implies glimpsed, resolved in `is_albescent_glimpsed`.
    albescent_glimpsed: Mapped[bool] = mapped_column(
        Boolean, nullable=False, default=False, server_default="false"
    )

    # Per account (#1047). JSONB so a new event needs no migration: unset keys
    # default in code. Read only via `services.notification_prefs.resolve_prefs`.
    notification_prefs: Mapped[dict] = mapped_column(
        JSONB, nullable=False, default=dict, server_default=text("'{}'::jsonb")
    )

    # Disambiguates from the active_character_id FK path.
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

    # Sign-in uses scalar_one_or_none(); a duplicate from racing first logins
    # would break that account's login forever. Pair, as ids may collide across
    # providers.
    __table_args__ = (UniqueConstraint("provider", "provider_user_id"),)

    id: Mapped[int] = mapped_column(BigInteger, Identity(), primary_key=True)
    account_id: Mapped[int] = mapped_column(
        BigInteger, ForeignKey("account.id"), nullable=False
    )
    # :class:`AuthProvider` values.
    provider: Mapped[str] = mapped_column(String, nullable=False)
    provider_user_id: Mapped[str] = mapped_column(String, nullable=False)
    # No `access_token` on purpose (#1374): an unused live credential is liability.

    account: Mapped["Account"] = relationship(
        "Account", back_populates="oauth_providers", lazy="raise"
    )


class AccountTombstone(CreatedAtMixin, Base):
    """What survives the OAuth identity of a deleted account (ADR-0081).

    Keeps the provider and a salted SHA-256 of the id (keyed by SECRET_KEY):
    enough to recognise a returning person, not to identify them.
    ``created_at`` is the deletion time; retention is purged on access in
    ``services.account_deletion.resolve_account_tombstone`` (no job runner).
    """

    __tablename__ = "account_tombstone"

    # One tombstone per identity; ``delete_account`` clears an earlier row first.
    __table_args__ = (UniqueConstraint("provider", "provider_user_hash"),)

    id: Mapped[int] = mapped_column(BigInteger, Identity(), primary_key=True)
    account_id: Mapped[int] = mapped_column(
        BigInteger, ForeignKey("account.id"), nullable=False
    )
    # :class:`AuthProvider` values.
    provider: Mapped[str] = mapped_column(String, nullable=False)
    #: 64 hex chars; see ``services.account_deletion.hash_provider_user_id``.
    provider_user_hash: Mapped[str] = mapped_column(String, nullable=False)
