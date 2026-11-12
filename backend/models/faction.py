import enum

from sqlalchemy import Enum, String
from sqlalchemy.orm import Mapped, mapped_column

from models.base import Base
from models.mixins import TimestampMixin


class FactionStatus(enum.Enum):
    """Live era, past era, or system row (ADR-0087).

    - ``visible``: in the live era.
    - ``retired``: past era; out of the registry, task history stays archived.
      Written by ``seed.upsert_era_factions``. Not ``hidden``, which drops tasks.
    - ``hidden``: system row (``na``, ``aged_out``); tasks dropped everywhere.
    """

    visible = "visible"
    retired = "retired"
    hidden = "hidden"


class Faction(TimestampMixin, Base):
    __tablename__ = "faction"

    slug: Mapped[str] = mapped_column(String, primary_key=True)
    status: Mapped[FactionStatus] = mapped_column(
        Enum(FactionStatus, create_type=False), nullable=False, default=FactionStatus.visible
    )
    # ADR-0038: FK target only; prose is in factions.json, rules in eras/.
