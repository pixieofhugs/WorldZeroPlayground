"""The block record (ADR-0077).

A block is its own row, keyed blocker → blocked, independent of the friend/foe
edge in ``relationship.py``. It requires no edge, creates none, and is not
readable as one — which is the whole point: under ADR-0009 a block rode on a
``status`` of an edge, so you had to declare a relationship with someone before
you could stop dealing with them (#1681).

Directed in **authorship**, symmetric in **effect**: only the blocker may create
or delete the row, and both enforcement sites (taunt subscriptions,
``activity_feed``'s friends-and-foes sources) read it in both directions.

Era-neutral by omission: a block is a statement between two people, not a fact
about a scoring period, so an era reset does not clear it (ADR-0042).

``ondelete="CASCADE"`` is configured now rather than retrofitted. There is no
hard character delete on this codebase today (``soft_delete_character`` bans),
so nothing exercises it — but an orphaned block is unreachable state that would
still filter live queries, and adding a cascade later is a migration. No ORM
``relationship()`` is declared in either direction, so the database-level door
is the only one there is; declaring one later means declaring
``delete-orphan`` + ``passive_deletes`` with it (ADR-0077, "the shape of the
record").
"""
from sqlalchemy import BigInteger, CheckConstraint, ForeignKey, Identity, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column

from models.base import Base
from models.mixins import CreatedAtMixin


class CharacterBlock(CreatedAtMixin, Base):
    __tablename__ = "character_block"
    __table_args__ = (
        UniqueConstraint("blocker_character_id", "blocked_character_id"),
        # A self-block is meaningless and every read would have to special-case
        # it. The service refuses it too; this is the door that cannot be
        # bypassed by a future writer.
        CheckConstraint(
            "blocker_character_id <> blocked_character_id", name="no_self_block"
        ),
    )

    id: Mapped[int] = mapped_column(BigInteger, Identity(), primary_key=True)
    blocker_character_id: Mapped[int] = mapped_column(
        BigInteger, ForeignKey("character.id", ondelete="CASCADE"), nullable=False
    )
    blocked_character_id: Mapped[int] = mapped_column(
        BigInteger, ForeignKey("character.id", ondelete="CASCADE"), nullable=False
    )
