"""Put ``ON DELETE CASCADE`` on every FK into ``praxis.id`` that is part of the praxis.

Dropping a praxis was impossible the moment anything hung off it. All ten FKs
into ``praxis.id`` were NO ACTION, so ``services.praxis.delete_praxis``'s
``session.delete(praxis)`` failed two different ways:

* For a child the session had **not** loaded (``vote``, ``nudge``,
  ``praxis_meta_task``, ``comment``, ``flag``) Postgres refused the parent
  DELETE outright with a foreign-key violation.
* For ``media_item`` — which ``get_praxis`` eagerly loads for the detail view
  and which carries no ``delete-orphan`` cascade — SQLAlchemy's default is to
  *de-associate* the child, i.e. ``UPDATE media_item SET praxis_id = NULL``.
  That column is NOT NULL, so the transaction died on a not-null violation and
  the player saw the raw asyncpg error while the drop silently did nothing.

The rule belongs in the database rather than in eight ``cascade='all,
delete-orphan'`` declarations: those only fire for collections already loaded in
the session, which would mean six more ``selectinload``s in ``get_praxis`` — paid
by every praxis *detail view* — purely so that delete would work. The FK covers
every caller and costs no reads. The mappings carry ``passive_deletes=True`` to
match (``models/praxis.py``).

``duel.challenger_praxis_id`` and ``duel.opponent_praxis_id`` are deliberately
left NO ACTION. A duel is a contract between two players, not a component of
either side; it should refuse the delete rather than disappear with it.

``0002_squashed`` builds a fresh database straight from the ORM models, so CI and
local resets already land on this shape from ``models/`` alone. A deployed
database is stamped at a later revision and never re-runs it — hence this one.
Idempotent either way: each constraint is dropped ``IF EXISTS`` before being
recreated under the same ``models/base.py`` naming convention.

Revision ID: 0006_praxis_child_fk_cascade
Revises: 0005_praxis_member_habit_bonus
Create Date: 2026-08-14
"""
from typing import Sequence, Union

from alembic import op

revision: str = "0006_praxis_child_fk_cascade"
down_revision: Union[str, None] = "0005_praxis_member_habit_bonus"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


#: ``(table, column)`` for every FK into ``praxis.id`` that names a *part* of the
#: praxis. Constraint names follow ``models/base.py``'s ``fk_`` convention, so
#: they are derivable rather than spelled out.
PRAXIS_CHILDREN: tuple[tuple[str, str], ...] = (
    ("comment", "praxis_id"),
    ("flag", "praxis_id"),
    ("media_item", "praxis_id"),
    ("nudge", "praxis_id"),
    ("praxis_invite", "praxis_id"),
    ("praxis_member", "praxis_id"),
    ("praxis_meta_task", "praxis_id"),
    ("vote", "praxis_id"),
)


def _constraint_name(table: str, column: str) -> str:
    return f"fk_{table}_{column}_praxis"


def _repoint(table: str, column: str, ondelete: str | None) -> None:
    name = _constraint_name(table, column)
    op.execute(f"ALTER TABLE {table} DROP CONSTRAINT IF EXISTS {name}")
    clause = f" ON DELETE {ondelete}" if ondelete else ""
    op.execute(
        f"ALTER TABLE {table} ADD CONSTRAINT {name} "
        f"FOREIGN KEY ({column}) REFERENCES praxis (id){clause}"
    )


def upgrade() -> None:
    for table, column in PRAXIS_CHILDREN:
        _repoint(table, column, "CASCADE")


def downgrade() -> None:
    for table, column in PRAXIS_CHILDREN:
        _repoint(table, column, None)
