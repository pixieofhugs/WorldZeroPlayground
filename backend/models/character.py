import enum
from datetime import datetime
from typing import TYPE_CHECKING, List, Optional

from sqlalchemy import (
    BigInteger,
    DateTime,
    Enum,
    ForeignKey,
    Identity,
    Index,
    String,
    Text,
)
from sqlalchemy.orm import Mapped, mapped_column, relationship

from models.base import Base
from models.mixins import TimestampMixin

if TYPE_CHECKING:
    from models.account import Account
    from models.praxis import Praxis


class CharacterStatus(enum.Enum):
    """A life is either playable or banned.

    There is no ``paused``: nothing ever set it. Every write is
    ``active`` (creation) or ``banned`` (``services/character.py::ban_character``,
    the admin toggle), so the pause state existed only as a value the reads had
    to keep allowing for. Removed in the #1398 squash; the roster still means
    "this account's lives, banned excluded" (``_ROSTER_STATUSES``), which is now
    simply ``active``.
    """

    active = "active"
    banned = "banned"


class Character(TimestampMixin, Base):
    __tablename__ = "character"

    # The account roster (`routers/me.py`, `services/character.py`) reads every
    # life of one account on nearly every authenticated request (#1393).
    __table_args__ = (Index("ix_character_account_id", "account_id"),)

    id: Mapped[int] = mapped_column(BigInteger, Identity(), primary_key=True)
    account_id: Mapped[int] = mapped_column(
        BigInteger, ForeignKey("account.id"), nullable=False
    )
    username: Mapped[str] = mapped_column(String, unique=True, nullable=False)
    display_name: Mapped[str] = mapped_column(String, nullable=False)
    bio: Mapped[str] = mapped_column(Text, nullable=False, server_default="")
    # A one-line slogan for the profile header's identity slot, capped at 140 on
    # the wire (``schemas.character``). Deliberately NOT a short bio: bio is 500
    # characters of unstructured paragraph with its own About block, so rendering
    # one in the other's slot is fifteen lines where a name should be (#1628).
    # Never backfilled from bio — an empty slot is hidden, not filled.
    tagline: Mapped[str] = mapped_column(Text, nullable=False, server_default="")
    avatar_url: Mapped[str] = mapped_column(String, nullable=False, server_default="")
    location: Mapped[str] = mapped_column(String, nullable=False, server_default="")
    # ADR-0019: characters are born Unaffiliated ("na"); factions are invite-gated.
    # services.character.create_character always sets this explicitly, from
    # era.starting_faction_slug (#1559) — that field, not this literal, is the
    # live rule. The server_default stays a literal because it is baked into DDL
    # by the migration: it is only a backstop for direct inserts, and must not
    # contradict ADR-0019.
    # String FK: faction's primary key is its slug (ADR-0038), not an integer.
    faction_slug: Mapped[str] = mapped_column(
        String, ForeignKey("faction.slug"), nullable=False, server_default="na"
    )
    status: Mapped[CharacterStatus] = mapped_column(
        Enum(CharacterStatus, create_type=False), nullable=False, default=CharacterStatus.active
    )
    # When the *player* ended this life (#1577). Self-deletion and a moderator ban
    # both land in ``status = banned``; this column is the only thing that says
    # which happened, and it is written by ``services.character.soft_delete_character``
    # alone — the admin ban toggle never sets or clears it.
    #
    # Deliberately NOT a third ``CharacterStatus`` value: every read that means
    # "not playable" (``_ROSTER_STATUSES``, ``admin_service.list_active_characters``,
    # the roster selects in ``services/character.py``) would have to learn the new
    # value, and one missed site silently readmits a departed life. A departed
    # character is banned to every existing read, and additionally departed here.
    #
    # Its consumer is ``services.admin_service.apply_ban``, which refuses to un-ban
    # a life the player themselves ended.
    departed_at: Mapped[Optional[datetime]] = mapped_column(
        DateTime(timezone=True), nullable=True
    )
    # score, level, votes_spent_this_era, all_time_score live in CharacterStats (star schema split)
    # votes_available is computed on read: services.scoring.compute_votes_available

    account: Mapped["Account"] = relationship(
        "Account",
        back_populates="characters",
        lazy="raise",
        foreign_keys="Character.account_id",
    )
    praxes: Mapped[List["Praxis"]] = relationship(
        "Praxis",
        back_populates="created_by",
        foreign_keys="Praxis.created_by_id",
        lazy="raise",
    )
