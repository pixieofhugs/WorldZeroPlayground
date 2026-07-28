"""One player poking another to file the part a shared praxis is waiting on (#1083).

A small purpose-built table, deliberately **not** a `kind` enum + `praxis_id` on
``Message``. ``Message`` is the seed of a future player-to-player inbox; welding
a system poke to it would (a) make every future DM feature carry a nudge branch,
and (b) cost a new enum value in ``0001_squashed``'s ``ENUMS`` list on top of the
model edit. The repo already prefers a narrow table per fact — ``taunt_message``,
``invitation_letter``, ``faction_defection_history`` — and this is one row of
four columns.

Nothing renders from this table directly. Delivery is the **activity feed**
(ADR-0036 registry entry ``nudge``), because that is where this game already
puts "someone did a thing involving you", and it lands beside the
``awaiting_submission`` row the recipient already has. The ``Message`` routes
have no player-facing reader at all — only the admin moderation tab — so a nudge
sent as a message would arrive nowhere.

``praxis_id`` is always **the praxis the RECIPIENT owes a submission on**, never
the sender's. For a collab those are the same row; for a duel they are the two
linked sides (ADR-0011) and the recipient's is the one their feed card can link
to — the sender's side is hidden from them while the duel is live and incomplete
(``_duel_side_hidden_condition``, #999).

The (from, to, praxis) triple plus ``created_at`` is also the rate-limit key: one
nudge per sender → recipient → praxis per 24h. That limit is a safety control,
not a nicety — an unlimited poke button aimed at a named player is a harassment
vector — so the index below exists to keep the check cheap enough that it is
never tempting to skip.
"""

from sqlalchemy import ForeignKey, Index
from sqlalchemy.orm import Mapped, mapped_column

from models.base import Base
from models.mixins import CreatedAtMixin


class Nudge(CreatedAtMixin, Base):
    __tablename__ = "nudge"

    id: Mapped[int] = mapped_column(primary_key=True)
    from_character_id: Mapped[int] = mapped_column(
        ForeignKey("character.id"), nullable=False
    )
    to_character_id: Mapped[int] = mapped_column(
        ForeignKey("character.id"), nullable=False
    )
    # The praxis the recipient still owes — see the module docstring.
    praxis_id: Mapped[int] = mapped_column(ForeignKey("praxis.id"), nullable=False)

    __table_args__ = (
        # Serves both readers: the rate-limit probe (exact triple + recent
        # created_at) and the roster's `nudged_at` lookup (viewer → every member
        # of one praxis).
        Index(
            "ix_nudge_sender_recipient_praxis",
            "from_character_id",
            "to_character_id",
            "praxis_id",
            "created_at",
        ),
        # The feed source reads the recipient's inbox side, newest first.
        Index("ix_nudge_recipient_created", "to_character_id", "created_at"),
    )
