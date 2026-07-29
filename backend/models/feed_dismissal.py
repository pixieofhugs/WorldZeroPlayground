"""One row per activity-feed item a character has archived (#1193).

The activity feed is a **derived** read-model: it is a UNION over 15 source
tables (``vote``, ``praxis``, ``duel``, ``nudge``, …) and owns no rows of its
own, so there is nothing on a feed item to mark as dismissed. This table is
that mark, and it is the only durable state the archive has.

**Why a table and not localStorage.** "Nothing is destroyed, everything lands
in Archived" is a durability promise made to the player, so it has to survive a
device change, a reinstall, and a second browser. A per-device key/value store
cannot make that promise.

**What ``item_key`` is.** ``"{feed_item_type}:{source_row_pk}"`` — see
``services.activity_feed.build_item_key``. The type prefix is load-bearing:
three feed types are built from ``praxis_member`` rows and two from ``praxis``
rows, so the source PK alone is not unique across the feed. Storing the key as
one opaque string (rather than a type column + an id column) keeps the value
the client sends, the value stored, and the value compared byte-identical.

**Archiving is a view state, never a decision** (ADR-0065, epic #1192). An
archived ``duel_challenge`` or ``collab_invite`` is still open and still
unanswered — this table is written, and nothing else is. Nothing here touches
``Duel.status`` or ``PraxisInvite.status``.

``awaiting_submission`` can never appear here: it is state rather than an
event (it exists exactly while ``PraxisMember.has_submitted`` is false), so a
row would silence a standing obligation permanently. The refusal is enforced
in the service, not by a constraint — see ``ARCHIVABLE_ITEM_TYPES``.

Orphaned rows (the source row is later deleted) are harmless: the key simply
matches nothing. There is deliberately no cleanup job.
"""

from sqlalchemy import ForeignKey, String, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column

from models.base import Base
from models.mixins import CreatedAtMixin


class FeedDismissal(CreatedAtMixin, Base):
    __tablename__ = "feed_dismissal"

    id: Mapped[int] = mapped_column(primary_key=True)
    character_id: Mapped[int] = mapped_column(
        ForeignKey("character.id"), nullable=False
    )
    item_key: Mapped[str] = mapped_column(String(128), nullable=False)

    __table_args__ = (
        # Also the read index: every query here is "this character's archive",
        # and character_id leads the constraint's implicit unique index.
        UniqueConstraint(
            "character_id", "item_key", name="uq_feed_dismissal_character_item_key"
        ),
    )
