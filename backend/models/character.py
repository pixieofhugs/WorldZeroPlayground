import enum
from typing import TYPE_CHECKING, List

from sqlalchemy import Enum, ForeignKey, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from models.base import Base
from models.mixins import TimestampMixin

if TYPE_CHECKING:
    from models.account import Account
    from models.praxis import Praxis


class CharacterStatus(enum.Enum):
    active = "active"
    paused = "paused"
    banned = "banned"


class Character(TimestampMixin, Base):
    __tablename__ = "character"

    id: Mapped[int] = mapped_column(primary_key=True)
    account_id: Mapped[int] = mapped_column(ForeignKey("account.id"), nullable=False)
    username: Mapped[str] = mapped_column(String, unique=True, nullable=False)
    display_name: Mapped[str] = mapped_column(String, nullable=False)
    bio: Mapped[str] = mapped_column(Text, nullable=False, server_default="")
    avatar_url: Mapped[str] = mapped_column(String, nullable=False, server_default="")
    location: Mapped[str] = mapped_column(String, nullable=False, server_default="")
    # faction_slug defaults to "ua" — the starting faction for all new characters
    faction_slug: Mapped[str] = mapped_column(
        ForeignKey("faction.slug"), nullable=False, server_default="ua"
    )
    status: Mapped[CharacterStatus] = mapped_column(
        Enum(CharacterStatus, create_type=False), nullable=False, default=CharacterStatus.active
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
