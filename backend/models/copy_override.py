"""Admin-editable replacements for shipped UI copy (``copy_override``).

The **defaults** are not here. Every string the site shows lives in the
frontend's i18n catalogs (``frontend/src/locales/en/*.json``), which ship in the
bundle and stay the source of truth. This table holds only the *overrides*: the
handful of keys an admin has re-worded since the last deploy, which the frontend
layers on top at boot via ``i18n.addResource(lng, ns, key, value)``.

So a row is a diff against the bundle, not a copy of it. An empty table is the
normal state and means "the site says exactly what it shipped saying". Deleting
a row is the revert, and needs no stored original.

``ns`` + ``key`` is the whole identity — the i18next namespace and the dotted
key path within it. English-only today: there is no locale column, because
there is no second catalog to disambiguate against. Nor is there versioning or
a draft state; a write is live on the next page load, which is the point.

``updated_by`` is the audit trail. Copy here renders on every visitor's screen,
including anonymous ones, so "who last wrote this" is worth a column even
though nothing reads it on the happy path.
"""

from datetime import datetime

from sqlalchemy import BigInteger, DateTime, ForeignKey, String, Text, func
from sqlalchemy.orm import Mapped, mapped_column

from models.base import Base


class CopyOverride(Base):
    __tablename__ = "copy_override"

    #: The i18next namespace — "common", "admin", "taunts", ...
    ns: Mapped[str] = mapped_column(String(64), primary_key=True)
    #: The dotted key path inside that namespace, e.g. ``nav.adminMode.badge``.
    #:
    #: Unvalidated against any registry, deliberately: the catalogs this points
    #: into live in the frontend bundle, so the backend cannot know which keys
    #: exist. A row for a key nobody renders is inert.
    key: Mapped[str] = mapped_column(String(255), primary_key=True)
    #: The replacement copy. What the visitor actually reads.
    value: Mapped[str] = mapped_column(Text, nullable=False)
    #: The admin account that last wrote this row.
    updated_by: Mapped[int] = mapped_column(
        BigInteger, ForeignKey("account.id"), nullable=False
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
        server_default=func.now(),
        onupdate=func.now(),
    )
