"""Schema-wide column conventions, enforced against ``Base.metadata`` (#1398).

Postgres accepts an ``INTEGER`` FK to a ``BIGINT`` PK silently, capping it at 2^31.
The last two tests hold the ``docs/agents/db-migrations.md`` inventory to the
schema (#1790).
"""

import re
from pathlib import Path

import sqlalchemy as sa

from models.base import NAMING_CONVENTION, Base
import models  # noqa: F401 — registers every mapped class on Base.metadata

DB_MIGRATIONS_DOC = Path(__file__).resolve().parents[3] / "docs/agents/db-migrations.md"
INVENTORY_HEADING = "### Model inventory"
TOTALS = re.compile(
    r"(?P<tables>\d+) tables, (?P<integer>\d+) integer foreign keys, "
    r"(?P<string>\d+) string ones\."
)
FIX = (
    f"Edit docs/agents/db-migrations.md, section '{INVENTORY_HEADING}': every table "
    "on Base.metadata needs a row in that table (alphabetical by model file), and "
    "the totals sentence under it must match."
)

# Text primary keys: ``faction`` slug (ADR-0038), ``copy_override`` i18n key.
STRING_PRIMARY_KEY_TABLES: frozenset[str] = frozenset({"faction", "copy_override"})

# Both halves are FKs; the pair is the fact, so no surrogate key.
COMPOSITE_PRIMARY_KEY_TABLES: frozenset[str] = frozenset({"praxis_meta_task"})


def _parse_inventory() -> tuple[set[str], str]:
    """The doc's table names, and the sentence that closes the table."""
    lines = DB_MIGRATIONS_DOC.read_text(encoding="utf-8").splitlines()
    heading = next(
        (i for i, line in enumerate(lines) if line.strip() == INVENTORY_HEADING), None
    )
    assert heading is not None, f"no '{INVENTORY_HEADING}' heading. {FIX}"

    header = next(i for i in range(heading, len(lines)) if lines[i].startswith("|"))
    end = header
    while end < len(lines) and lines[end].startswith("|"):
        end += 1

    def cells(row: str) -> list[str]:
        return [cell.strip().strip("`") for cell in row.strip().strip("|").split("|")]

    column = cells(lines[header]).index("Table")
    # Skip the header and the |---| separator.
    documented = {cells(row)[column] for row in lines[header + 2 : end]}
    totals = next(line for line in lines[end:] if line.strip())
    return documented, totals


def _foreign_key_columns() -> list[sa.Column]:
    return [
        column
        for table in Base.metadata.tables.values()
        for column in table.columns
        if column.foreign_keys
    ]


def _integer_columns() -> list[sa.Column]:
    return [
        column
        for table in Base.metadata.tables.values()
        for column in table.columns
        if isinstance(column.type, sa.Integer)
    ]


def test_metadata_carries_the_naming_convention() -> None:
    assert Base.metadata.naming_convention == NAMING_CONVENTION


def test_every_constraint_and_index_has_a_name() -> None:
    """An unnamed constraint can't later be ``ALTER``-ed or ``DROP``-ped by name."""
    unnamed: list[str] = []
    for table in Base.metadata.tables.values():
        for constraint in table.constraints:
            if constraint.name is None:
                unnamed.append(f"{table.name}: {type(constraint).__name__}")
        for index in table.indexes:
            if index.name is None:
                unnamed.append(f"{table.name}: Index{tuple(index.columns.keys())}")
    assert unnamed == [], f"unnamed constraints/indexes: {unnamed}"


def test_every_surrogate_primary_key_is_bigint_identity() -> None:
    offenders: list[str] = []
    for table in Base.metadata.tables.values():
        if table.name in STRING_PRIMARY_KEY_TABLES:
            continue
        primary_key_columns = list(table.primary_key.columns)
        assert primary_key_columns, f"{table.name} has no primary key"

        if table.name in COMPOSITE_PRIMARY_KEY_TABLES:
            for column in primary_key_columns:
                if not isinstance(column.type, sa.BigInteger):
                    offenders.append(f"{table.name}.{column.name} is not BIGINT")
            continue

        assert len(primary_key_columns) == 1, (
            f"{table.name} has a composite primary key but is not listed in "
            f"COMPOSITE_PRIMARY_KEY_TABLES"
        )
        column = primary_key_columns[0]
        if not isinstance(column.type, sa.BigInteger):
            offenders.append(f"{table.name}.{column.name} is not BIGINT")
        if column.identity is None:
            offenders.append(f"{table.name}.{column.name} has no Identity()")
    assert offenders == [], f"primary keys off convention: {offenders}"


def test_every_foreign_key_column_matches_the_type_it_references() -> None:
    """Same type as the target, so string FKs need no exemption list."""
    mismatches: list[str] = []
    for table in Base.metadata.tables.values():
        for column in table.columns:
            for foreign_key in column.foreign_keys:
                target = foreign_key.column
                if type(column.type) is not type(target.type):
                    mismatches.append(
                        f"{table.name}.{column.name} is {column.type} but "
                        f"{target.table.name}.{target.name} is {target.type}"
                    )
    assert mismatches == [], f"foreign key type mismatches: {mismatches}"


def test_no_plain_integer_primary_or_foreign_key_survives() -> None:
    offenders = [
        f"{column.table.name}.{column.name}"
        for column in _integer_columns()
        if not isinstance(column.type, sa.BigInteger)
        and (column.primary_key or column.foreign_keys)
    ]
    assert offenders == [], f"32-bit INTEGER used as an identifier: {offenders}"


def test_the_doc_inventory_lists_every_table() -> None:
    documented, _ = _parse_inventory()
    assert documented, f"parsed no rows out of the inventory table. {FIX}"

    schema = set(Base.metadata.tables)
    assert not sorted(schema - documented), (
        f"tables on Base.metadata with no row in the doc: "
        f"{sorted(schema - documented)}. {FIX}"
    )
    assert not sorted(documented - schema), (
        f"rows in the doc for tables that no longer exist: "
        f"{sorted(documented - schema)}. {FIX}"
    )


def test_the_doc_inventory_totals_match_the_schema() -> None:
    _, totals = _parse_inventory()
    match = TOTALS.search(totals)
    assert match is not None, (
        f"no 'N tables, N integer foreign keys, N string ones.' sentence under the "
        f"inventory table; found {totals!r}. {FIX}"
    )

    foreign_keys = _foreign_key_columns()
    counted = {
        "tables": len(Base.metadata.tables),
        "integer": sum(1 for c in foreign_keys if isinstance(c.type, sa.Integer)),
        "string": sum(1 for c in foreign_keys if isinstance(c.type, sa.String)),
    }
    documented = {key: int(value) for key, value in match.groupdict().items()}
    assert documented == counted, (
        f"the doc's totals say {documented} but Base.metadata says {counted}. {FIX}"
    )
