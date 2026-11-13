"""Move the onboarding task off Albescent onto the cross-faction sentinel (#1619 B5).

Data migration: ``seed.ensure_onboarding_task`` is keyed on title and never
updates an existing row, so production needs this. Literal strings, not
imported constants: a migration describes a moment in time. Idempotent; no-op
on a fresh DB.

Revision ID: 0004_onboarding_cross_faction
Revises: 0003_character_tagline
Create Date: 2026-08-03
"""
from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "0004_onboarding_cross_faction"
down_revision: Union[str, None] = "0003_character_tagline"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

# As it exists on any database stamped at 0003 (#511).
ONBOARDING_TITLE = 'Take a Picture of "Yourself"'
CROSS_FACTION = "na"
PREVIOUS_FACTION = "albescent"


def _repoint(from_slug: str, to_slug: str) -> None:
    op.get_bind().execute(
        sa.text(
            "UPDATE task SET primary_faction_slug = :to_slug "
            "WHERE title = :title AND primary_faction_slug = :from_slug"
        ),
        {"to_slug": to_slug, "title": ONBOARDING_TITLE, "from_slug": from_slug},
    )


def upgrade() -> None:
    _repoint(PREVIOUS_FACTION, CROSS_FACTION)


def downgrade() -> None:
    _repoint(CROSS_FACTION, PREVIOUS_FACTION)
