"""Rename the onboarding task to "Introduce Yourself" and replace its description.

A **data** migration, like 0004. ``seed.ensure_onboarding_task`` is keyed on
**title**, so without this every existing database would keep the old row and
seed would add a second level-0 task beside it under the new title.

Literal strings, not the ``seed`` constants: a migration describes a moment in
time. Idempotent, and a no-op on a fresh database.

Revision ID: 0019_onboarding_rename
Revises: 0018_account_notification_prefs
Create Date: 2026-09-24
"""
from typing import Sequence, Union

import sqlalchemy as sa

from alembic import op

revision: str = "0019_onboarding_rename"
down_revision: Union[str, None] = "0018_account_notification_prefs"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

OLD_TITLE = 'Take a Picture of "Yourself"'
OLD_DESCRIPTION = (
    "Point a camera at yourself — but the quotation marks are doing work. "
    "\"Yourself\" can be your face, or it can be the mug you can't start a "
    "morning without, the view from where you think, the shoes that have "
    "carried you, the desk that's unmistakably yours. Show us who you are. A "
    "literal selfie is allowed, but never required."
)
NEW_TITLE = "Introduce Yourself"
NEW_DESCRIPTION = "Take a picture of your character. This need not be you"


def _rename(from_title: str, to_title: str, description: str) -> None:
    op.get_bind().execute(
        sa.text(
            "UPDATE task SET title = :to_title, description = :description "
            "WHERE title = :from_title AND level_required = 0 "
            # Refuses to rename INTO a title something already holds. A database
            # where the row was renamed by hand keeps both the curated row and a
            # seed-created duplicate under the old title; renaming that
            # duplicate would leave two rows sharing a title, and the very next
            # line of start.sh (`seed.py`) would fail the boot on it.
            "  AND NOT EXISTS (SELECT 1 FROM task t2 WHERE t2.title = :to_title)"
        ),
        {"to_title": to_title, "description": description, "from_title": from_title},
    )


def upgrade() -> None:
    _rename(OLD_TITLE, NEW_TITLE, NEW_DESCRIPTION)


def downgrade() -> None:
    _rename(NEW_TITLE, OLD_TITLE, OLD_DESCRIPTION)
