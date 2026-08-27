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
from models.mixins import CreatedAtMixin, TimestampMixin

if TYPE_CHECKING:
    from models.character import Character


class AccountStatus(enum.Enum):
    """Account lifecycle: playable, moderated, or ended by the player.

    ``deleted`` was removed in the #1398 squash because nothing set it — it
    implied an account-erasure flow that did not exist, and behaved exactly
    like ``suspended`` at the two gates that read status (``dependencies.py``,
    ``services/auth.py``, both testing for ``active``). #2160 is that flow, so
    the value comes back with something behind it:
    ``services.account_deletion.delete_account`` is its one writer.

    It is still true that the status gates cannot tell it from ``suspended``,
    and that is fine — a tombstone must not be signed into either. What makes
    it a distinct value is that everything *else* about the row is different:
    the email is a released placeholder, every life is departed, and the
    identifying columns are blank. ADR-0081.
    """

    active = "active"
    suspended = "suspended"
    deleted = "deleted"


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
    # Sticky Albescent *glimpse* — the sight of the door, before either of the
    # two above (#2770, amending ADR-0082). Flips True the first time any life on
    # this account reaches `era.albescent_glimpse_level`
    # (`services.character.stamp_albescent_glimpse`, called from
    # `recalculate_character_stats`); never unset.
    #
    # ACCOUNT-scoped even though the fact it records is per-character, and that
    # is the point. Level is a `character_stats` row, so a live read of the
    # *active* character's level would make the Albescent tile and the eighth
    # race lane blink in and out with the character switcher — a louder tell than
    # either the absent state or the redacted one. Same reasoning as
    # `albescent_unlocked` above, and the same reason it must be stamped rather
    # than derived: `apply_era_reset` returns every life to level 0, so after a
    # reset there is nothing left to recompute this from.
    #
    # THREE flags, three questions, and none of them is another's answer:
    # glimpsed = "this account may see that a row is there", revealed = "this
    # account may read it", unlocked = "this account may put a life into it".
    # Revealed implies glimpsed — resolved in
    # `services.albescent_reveal.is_albescent_glimpsed`, not by a second write
    # here, so the two never drift.
    albescent_glimpsed: Mapped[bool] = mapped_column(
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


class AccountTombstone(CreatedAtMixin, Base):
    """What survives the OAuth identity of a deleted account (ADR-0081, #2160).

    The ``OAuthProvider`` rows are gone — a deleted account must not be
    resolvable by ``(provider, provider_user_id)``, or the next sign-in would
    hand the player back the corpse instead of a fresh start. What is kept is
    the *provider* in the clear and a **salted SHA-256 digest** of the
    identifier, which is enough to recognise "this is the same person coming
    back" (#2162's gate) and not enough to reconstruct who they were: the raw
    ``sub``/snowflake is nowhere in the database, and the digest is unusable
    without ``settings.SECRET_KEY``.

    ``created_at`` is the deletion timestamp — the row is written once, in the
    deleting request, and never updated, so no second column is warranted.
    Retention is ``TOMBSTONE_RETENTION_DAYS`` and enforced **purge-on-access**
    in ``services.account_deletion.resolve_account_tombstone``: there is no job
    runner, so a returning player is the only clock this row has.

    ``account_id`` stays because the tombstone is a fact *about that account*,
    which still exists (blanked) and still carries the votes and praxes other
    players' scores are computed from. It leaks nothing the row does not
    already: the account it points at has no identifying field left.
    """

    __tablename__ = "account_tombstone"

    # The pair #2162 looks up, and the same shape ``OAuthProvider`` uses for the
    # live identity. Unique so "one identity, at most one tombstone" is a
    # database fact rather than a convention: a player who deletes, signs up
    # again and deletes again inside the retention window would otherwise leave
    # two rows and make the lookup ambiguous. ``delete_account`` clears any
    # earlier row for the same pair before inserting.
    __table_args__ = (UniqueConstraint("provider", "provider_user_hash"),)

    id: Mapped[int] = mapped_column(BigInteger, Identity(), primary_key=True)
    account_id: Mapped[int] = mapped_column(
        BigInteger, ForeignKey("account.id"), nullable=False
    )
    # Values come from :class:`AuthProvider`; a plain ``String`` for the same
    # reason ``OAuthProvider.provider`` is one (ADR-0041).
    provider: Mapped[str] = mapped_column(String, nullable=False)
    #: 64 lowercase hex characters — see
    #: ``services.account_deletion.hash_provider_user_id``.
    provider_user_hash: Mapped[str] = mapped_column(String, nullable=False)
