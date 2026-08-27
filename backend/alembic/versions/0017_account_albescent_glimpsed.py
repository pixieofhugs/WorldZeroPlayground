"""Albescent gains a third state, and the account records the second (#2770).

Schema only — one sticky boolean, ``account.albescent_glimpsed``, defaulting to
false. See ``models/account.py`` for why the glimpse is account-scoped and
stamped rather than derived: level lives on ``character_stats``, so reading the
active character's level would make the eighth row blink in and out with the
character switcher, and ``apply_era_reset`` returns every life to level 0 so
there would be nothing left to recompute it from after a rollover.

**No backfill, and unlike ``0014`` there is no data step at all.** Everybody
starts un-glimpsed and re-earns the sight on their next scored praxis or vote —
``recalculate_character_stats`` stamps any account whose live character is
already at or above ``era.albescent_glimpse_level``, which is every account that
would have been backfilled, on the first recalc that touches it. A backfill
would be a second implementation of the same predicate, running once, against a
level the recalc is about to read anyway.

The floor itself is era-owned (``EraConfig.albescent_glimpse_level``) and is
deliberately *not* read here — there is nothing for it to gate. A migration that
cited the number would pin today's 6 into a file that can never be re-run.

``0002_squashed`` builds a fresh database straight from the ORM models, so CI and
local resets already have the column by the time this revision runs — hence
``IF NOT EXISTS``. A deployed database is stamped earlier and gets the column
here.

``downgrade()`` drops the column. Nothing else to undo: no row moved, and the
sight of a thing leaves no other trace.

Revision ID: 0017_account_albescent_glimpsed
Revises: 0016_faction_status_retired
Create Date: 2026-08-27
"""
from typing import Sequence, Union

from alembic import op

revision: str = "0017_account_albescent_glimpsed"
down_revision: Union[str, None] = "0016_faction_status_retired"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.execute(
        """
        ALTER TABLE account
        ADD COLUMN IF NOT EXISTS albescent_glimpsed BOOLEAN NOT NULL DEFAULT false
        """
    )


def downgrade() -> None:
    op.execute("ALTER TABLE account DROP COLUMN IF EXISTS albescent_glimpsed")
