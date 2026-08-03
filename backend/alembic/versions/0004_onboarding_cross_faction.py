"""Move the onboarding task off Albescent onto the cross-faction sentinel (#1619 B5).

A **data** migration, not a schema one. ``seed.ensure_onboarding_task`` is keyed
on **title**: it creates the row when the title is absent and returns early when
it is present, so it will never update an existing row's
``primary_faction_slug``. Production already holds this task at ``albescent``,
which means the code change alone would only ever reach a fresh database — and
the whole point of the change is the newcomer already playing on production, who
is charged ``other_task_modifier`` for the one task on the board.

Deliberately written with literal strings rather than by importing
``seed.ONBOARDING_TASK_TITLE`` / ``faction_slugs.CROSS_FACTION_SLUG``: a
migration describes a moment in time and must keep describing it after those
constants move again.

Idempotent, and a no-op on a fresh database — ``0002_squashed`` builds the
schema before ``seed.py`` has inserted any task, so there is nothing to match.

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

# The onboarding task as it exists on any database stamped at 0003 (#511).
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
