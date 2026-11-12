"""Rename the onboarding task to "Introduce Yourself" and replace its description.

Data migration, like 0004: seed is keyed on title and would otherwise add a
second level-0 task. Literal strings; idempotent; no-op on a fresh database.

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
            # Never rename INTO a held title: duplicate titles fail seed.py's boot.
            "  AND NOT EXISTS (SELECT 1 FROM task t2 WHERE t2.title = :to_title)"
        ),
        {"to_title": to_title, "description": description, "from_title": from_title},
    )


def upgrade() -> None:
    _rename(OLD_TITLE, NEW_TITLE, NEW_DESCRIPTION)


def downgrade() -> None:
    _rename(NEW_TITLE, OLD_TITLE, OLD_DESCRIPTION)
