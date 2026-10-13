from datetime import datetime

from sqlalchemy import BigInteger, DateTime, ForeignKey, Identity, String, Text, func
from sqlalchemy.orm import Mapped, mapped_column

from models.base import Base


class Era(Base):
    __tablename__ = "era"

    id: Mapped[int] = mapped_column(BigInteger, Identity(), primary_key=True)
    #: DELIBERATELY WRITTEN, DELIBERATELY NOT READ on the happy path (#1623).
    #: The era's display name comes from its config — ``config_key`` below
    #: resolves it via ``game_config.era_config_for_key`` — so this column is
    #: the *historical fallback*: the name the era shipped under, shown only
    #: when the key no longer matches any config (a deleted era file, or a row
    #: written by a newer version). That is the whole reason ``seed.py`` and
    #: ``routers/admin.py`` keep writing it. Not a dead field; do not sweep it.
    name: Mapped[str] = mapped_column(String, nullable=False)
    #: Identity, not prose: the link to the EraConfig that governs this era.
    #:
    #: On the LATEST row this column is also the **choice** — it is what says
    #: which ruleset the process plays by, resolved at start-up and again the
    #: moment a rollover appends a row (ADR-0091, #827). That reverses what this
    #: comment used to say, which was that the column "does not own the rules":
    #: it still owns no *value* — every rule lives in ``eras/era_N.py`` — but it
    #: decides which set of them is live, and an admin writes it. On every older
    #: row it is history, exactly as before.
    #:
    #: So a key here that no era file registers is not a cosmetic problem: the
    #: process cannot resolve the rules that row records and falls back, loudly,
    #: to the compile-time era (``services.era.rebind_live_era``). The rollover
    #: route validates against the registry before writing, for that reason.
    config_key: Mapped[str] = mapped_column(String, nullable=False)
    started_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, server_default=func.now()
    )
    started_by: Mapped[int] = mapped_column(
        BigInteger, ForeignKey("account.id"), nullable=False
    )
    notes: Mapped[str] = mapped_column(Text, nullable=False, server_default="")
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, server_default=func.now(), onupdate=func.now()
    )
