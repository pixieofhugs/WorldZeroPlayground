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
existing row is really the seed-owned one. Literal strings throughout, not
the ``seed`` module's constants, for the same reason ``0019`` used literals:
a migration describes a moment in time, and the constants are free to move
under it from here on. If a row is missing (a database that has never been
seeded, or carries no dev-only duel fixture), this migration does nothing
for that key and the next seed run creates the row with the key already set
— no duplicate results, because the seed lookup is now keyed on
``seed_key``, not title.

**The onboarding half has to account for ``0019`` possibly having been a
no-op.** ``0019_onboarding_rename`` only renames the old title to the new one
when nothing already holds the new title — and the very MultipleResultsFound
history that motivated this issue (see ``seed.ensure_onboarding_task``'s
docstring) proves a row can genuinely collide on "Introduce Yourself": a
player proposal defaults to ``level_required=0`` (``schemas.task.TaskCreate``),
the same level the real onboarding row occupies. When that guard fires,
``0019`` never renames anything, and the real row is *still* under the old
title. A backfill that only ever looks for the new title would then either
key the colliding row (wrong task becomes the game's onboarding task) or key
nothing at all (the next seed creates a second, genuinely duplicate, level-0
row — the exact failure #3064 exists to make impossible). So this checks the
old title first: it is a distinctive literal with effectively no collision
risk, unlike the new one, so a level-0 row under it is conclusive proof
``0019`` no-opped and that *is* the real row. Only when no row carries the
old title does it fall back to the new one.

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
#: The title ``0019_onboarding_rename`` renames FROM — reproduced literally
#: (not imported from that revision module) for the same reason every literal
#: here is a literal: a migration describes a moment in time.
_ONBOARDING_OLD_TITLE = 'Take a Picture of "Yourself"'
_DUEL_FIXTURE_TITLE = "Hold Your Breath and Count"

#: ``models/base.py``'s ``uq_`` convention produces this from the table and
#: the one column; a migration has to name the object it edits.
_CONSTRAINT = "uq_task_seed_key"


def _id_of_level_zero_task_titled(title: str) -> int | None:
    row = op.get_bind().execute(
        sa.text(
            "SELECT id FROM task WHERE title = :title AND level_required = 0"
            " ORDER BY id ASC LIMIT 1"
        ),
        {"title": title},
    ).first()
    return row[0] if row is not None else None


def _backfill_onboarding() -> None:
    # Old title first — see the module docstring for why this order is what
    # makes the backfill correct on a database where ``0019`` no-opped.
    task_id = _id_of_level_zero_task_titled(_ONBOARDING_OLD_TITLE)
    if task_id is None:
        task_id = _id_of_level_zero_task_titled(_ONBOARDING_TITLE)
    if task_id is None:
        return
    op.get_bind().execute(
        sa.text(
            "UPDATE task SET seed_key = :seed_key WHERE id = :id AND seed_key IS NULL"
        ),
        {"seed_key": _ONBOARDING_SEED_KEY, "id": task_id},
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
