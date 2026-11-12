"""Add ``task.seed_key``: a stable identity for seed-owned tasks (#3064).

Replaces title-keying, so a rename is a ``seed.py`` constants edit, and a DB
constraint makes a second onboarding row impossible. Backfills the key onto
the existing seed-owned row (literal strings); a missing row is created keyed
by the next seed run.

Onboarding: ``0019`` may have no-oped either way, so the real row may sit under
either title (dev's hand-renamed row vs a reseeded impostor, ``fa5f4cfa``). The
seeded row is always created first, so take the lowest id under either title.

Revision ID: 0021_task_seed_key
Revises: 0020_copy_override
Create Date: 2026-09-25
"""
from typing import Sequence, Union

import sqlalchemy as sa

from alembic import op

revision: str = "0021_task_seed_key"
down_revision: Union[str, None] = "0020_copy_override"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

#: Mirror the ``seed`` constants as literals.
_ONBOARDING_SEED_KEY = "onboarding_task"
_DUEL_FIXTURE_SEED_KEY = "duel_fixture_task"

_ONBOARDING_TITLE = "Introduce Yourself"
#: The title ``0019_onboarding_rename`` renames FROM.
_ONBOARDING_OLD_TITLE = 'Take a Picture of "Yourself"'
_DUEL_FIXTURE_TITLE = "Hold Your Breath and Count"

#: ``models/base.py``'s ``uq_`` convention.
_CONSTRAINT = "uq_task_seed_key"


def _backfill_onboarding() -> None:
    # Either title, lowest id wins — see the module docstring.
    op.get_bind().execute(
        sa.text(
            "UPDATE task SET seed_key = :seed_key WHERE id = ("
            "  SELECT id FROM task"
            "  WHERE title IN (:old_title, :new_title) AND level_required = 0"
            "  ORDER BY id ASC LIMIT 1"
            ") AND seed_key IS NULL"
        ),
        {
            "seed_key": _ONBOARDING_SEED_KEY,
            "old_title": _ONBOARDING_OLD_TITLE,
            "new_title": _ONBOARDING_TITLE,
        },
    )


def _backfill_duel_fixture() -> None:
    op.get_bind().execute(
        sa.text(
            "UPDATE task SET seed_key = :seed_key WHERE id = ("
            "  SELECT id FROM task WHERE title = :title ORDER BY id ASC LIMIT 1"
            ") AND seed_key IS NULL"
        ),
        {"seed_key": _DUEL_FIXTURE_SEED_KEY, "title": _DUEL_FIXTURE_TITLE},
    )


def upgrade() -> None:
    op.execute("ALTER TABLE task ADD COLUMN IF NOT EXISTS seed_key VARCHAR")
    op.execute(f"ALTER TABLE task DROP CONSTRAINT IF EXISTS {_CONSTRAINT}")
    op.create_unique_constraint(_CONSTRAINT, "task", ["seed_key"])

    _backfill_onboarding()
    _backfill_duel_fixture()


def downgrade() -> None:
    op.execute(f"ALTER TABLE task DROP CONSTRAINT IF EXISTS {_CONSTRAINT}")
    op.execute("ALTER TABLE task DROP COLUMN IF EXISTS seed_key")
