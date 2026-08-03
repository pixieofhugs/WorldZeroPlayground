"""Give a character a slogan line: `character.tagline` (#1628).

A 140-character line for the profile header's identity slot, distinct from the
500-character ``bio`` — which the owner has ruled "might be long and
unstructured", and which is getting its own About block. Two fields, two jobs.
The cap is enforced on the wire in ``schemas.character``; the column itself is
plain ``TEXT`` so the cap can be raised without a migration.

NOT NULL with an empty-string default, and **never backfilled from bio**: an
empty tagline is hidden rather than filled, and copying a paragraph's opening
into a slogan slot would truncate mid-sentence and make two fields look like
one. Every existing character gets "".

``0002_squashed`` builds a *fresh* DB straight from the ORM models, so CI and
local resets already land on this shape. A deployed DB is stamped at that
revision and never re-runs it — hence this one. Idempotent either way.

Revision ID: 0003_character_tagline
Revises: 0002_squashed
Create Date: 2026-08-03
"""
from typing import Sequence, Union

from alembic import op

revision: str = "0003_character_tagline"
down_revision: Union[str, None] = "0002_squashed"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.execute(
        "ALTER TABLE character ADD COLUMN IF NOT EXISTS tagline TEXT NOT NULL DEFAULT ''"
    )


def downgrade() -> None:
    op.execute("ALTER TABLE character DROP COLUMN IF EXISTS tagline")
