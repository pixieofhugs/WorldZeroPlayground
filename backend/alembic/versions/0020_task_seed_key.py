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
no-op, in EITHER direction.** ``0019_onboarding_rename`` only renames the old
title to the new one when nothing already holds the new title. Two real
databases show why the backfill cannot just prefer one title:

- A database where a *player* collides on "Introduce Yourself" before
  ``0019`` ever runs — a real risk, since ``TaskCreate.level_required``
  defaults to 0, the same level the onboarding row occupies (this is the
  MultipleResultsFound history ``seed.ensure_onboarding_task``'s docstring
  describes). There ``0019`` no-ops and the real row is *still* under the old
  title; the collider is newer and sits under the new one.
- Dev's actual, recorded state (``fa5f4cfa``): id 1 is the real row, renamed
  **by hand** to "Introduce Yourself" — i.e. under the NEW title — while id 78
  is a duplicate the pre-#3064 bug itself produced, still under the OLD
  title, because the deployed lookup could not find the hand-renamed row and
  reseeded it. There the real row is under the new title and the impostor is
  under the old one — the exact opposite of the first case.

Neither title is a reliable "this one is real" signal on its own; id order
is. The seeded row is always created first, so whichever of the two rows a
database holds under either title, the lower id is the real one — the same
assumption ``ensure_onboarding_task``'s own `.first()`-ordered-by-id lookup
already relies on. So this looks for a level-0 row under *either* title and
takes the lowest id, rather than committing to one title first.

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


def _backfill_onboarding() -> None:
    # Either title, lowest id wins — see the module docstring for why
    # committing to one title first gets a real, recorded database wrong.
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
