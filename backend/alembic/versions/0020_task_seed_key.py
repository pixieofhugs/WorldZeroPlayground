"""Add ``task.seed_key``: a stable identity for seed-owned tasks (#3064).

Replaces title-keying for the onboarding task and the duel e2e fixture.
``ensure_onboarding_task`` used to find its row by
``title == ONBOARDING_TASK_TITLE AND level_required == 0`` — so renaming or
re-wording the task meant a data migration to re-teach the lookup which row it
meant (``0004_onboarding_cross_faction``, ``0019_onboarding_rename``). From
here the row carries its own key, and a rename is a constants edit in
``seed.py``, nothing else. The uniqueness is a database constraint, not a
runtime check, which is what makes a second onboarding row actually
impossible rather than merely discouraged.

**Backfill, not create.** This migration assigns the key to whichever
existing row the *current* title lookup already finds — the lowest-id
level-0 task titled "Introduce Yourself" for onboarding, the lowest-id task
titled "Hold Your Breath and Count" for the duel fixture. Literal strings,
not the ``seed`` module's constants, for the same reason ``0019`` used
literals: a migration describes a moment in time, and the constants are free
to move under it from here on. If a row is missing (a database that has
never been seeded, or carries no dev-only duel fixture), this migration does
nothing for that key and the next seed run creates the row with the key
already set — no duplicate results, because the seed lookup is now keyed on
``seed_key``, not title.

Revision ID: 0020_task_seed_key
Revises: 0019_onboarding_rename
Create Date: 2026-09-25
"""
from typing import Sequence, Union

import sqlalchemy as sa

from alembic import op

revision: str = "0020_task_seed_key"
down_revision: Union[str, None] = "0019_onboarding_rename"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

#: Mirrors ``seed.ONBOARDING_TASK_SEED_KEY`` / ``seed.DUEL_FIXTURE_TASK_SEED_KEY``
#: — spelled out rather than imported, like the titles below: a migration
#: describes a moment in time and must not move if the seed constants do.
_ONBOARDING_SEED_KEY = "onboarding_task"
_DUEL_FIXTURE_SEED_KEY = "duel_fixture_task"

_ONBOARDING_TITLE = "Introduce Yourself"
_DUEL_FIXTURE_TITLE = "Hold Your Breath and Count"

#: ``models/base.py``'s ``uq_`` convention produces this from the table and
#: the one column; a migration has to name the object it edits.
_CONSTRAINT = "uq_task_seed_key"


def _backfill_onboarding() -> None:
    op.get_bind().execute(
        sa.text(
            "UPDATE task SET seed_key = :seed_key WHERE id = ("
            "  SELECT id FROM task"
            "  WHERE title = :title AND level_required = 0"
            "  ORDER BY id ASC LIMIT 1"
            ") AND seed_key IS NULL"
        ),
        {"seed_key": _ONBOARDING_SEED_KEY, "title": _ONBOARDING_TITLE},
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
