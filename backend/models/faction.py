import enum

from sqlalchemy import Enum, String
from sqlalchemy.orm import Mapped, mapped_column

from models.base import Base
from models.mixins import TimestampMixin


class FactionStatus(enum.Enum):
    """Whether a faction is in the live era, in a past one, or a system row.

    - ``visible`` — in the live era. Listed in the registry, joinable subject to
      the ordinary gates.
    - ``retired`` — was in some past era, not in the live one. Out of the
      registry and out of the join options; **its task history stays in the
      archive**.
    - ``hidden`` — a system row (``na``, ``aged_out``) no player should ever act
      on. Never listed anywhere, and its tasks are dropped from every listing by
      :func:`services.faction_service.hidden_faction_slugs`.

    **This enum had a third value before, and the argument for deleting it is
    void — do not re-delete it on that argument (ADR-0087).** The #1398 squash
    dropped ``deprecated`` because "nothing else ever writes this column... no
    writer could produce it", and left the docstring saying retirement leaves a
    row ``hidden``. Era 2 is the writer that was missing:
    ``seed.upsert_era_factions`` is now a two-way mirror and marks ``retired``
    every row the live era does not list.

    ``retired`` is not a synonym for ``hidden``, and the difference is Era 1's
    task archive. ``hidden``'s one reader drops a faction's tasks from every
    listing, so retiring four real factions through it would have taken most of
    a closed era's history off the site — including the archive
    ``level_to_see_retired_tasks`` unlocks at level 2 — while the praxes written
    against those tasks stayed visible, linking to tasks in no listing.
    Retirement removes a faction from the *registry*, not from the *record*.
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
    # ADR-0038: no name/description columns. Faction name/description prose lives
    # in frontend/src/locales/en/factions.json (config-canonical identity); the
    # row carries slug + status only. No multiplier columns either — faction
    # rules live in game_config.py. This table exists for FK references only.
