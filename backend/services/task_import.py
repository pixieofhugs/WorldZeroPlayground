"""Bulk task creation from a CSV (#1376).

Owns the parse → validate → insert pipeline for admin CSV task imports. Both
callers share this module: the admin route (``POST /admin/tasks/import-csv``,
a browser file upload) and the standalone CLI (``backend/import_tasks_csv.py``),
which is now a thin wrapper. There is deliberately only one CSV parser.

**The import is atomic.** Every row is validated before anything is written; if
any row fails, nothing is created and every failing row is reported at once so
the admin can fix the whole file in a single pass. The alternative — importing
the good rows and reporting the bad ones — makes the natural next move (fix the
few bad rows, re-upload the file) duplicate every good row.

Imported tasks are ordinary runtime-owned rows, exactly like those from
``POST /admin/tasks``. They are **not** era config: nothing here reads or writes
``EraConfig``, and an import must never be mistaken for era content. Validation
deliberately mirrors the admin-create path — it reuses ``TaskCreate``, so the
two cannot drift on ``point_value > 0`` / ``level_required >= 0``.
"""

import csv
import io
from dataclasses import dataclass

from pydantic import ValidationError
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from models.account import Account
from models.character import Character, CharacterStatus
from models.faction import Faction
from models.task import Task, TaskStatus, TaskType
from schemas.task import TaskCreate

# CSV columns, as written by the spreadsheet the game's tasks are drafted in.
COLUMN_TITLE = "Name"
COLUMN_FACTION = "Faction"
COLUMN_DESCRIPTION = "Description"
COLUMN_LEVEL = "Level"
COLUMN_POINTS = "Points"

REQUIRED_COLUMNS: tuple[str, ...] = (
    COLUMN_TITLE,
    COLUMN_FACTION,
    COLUMN_DESCRIPTION,
    COLUMN_LEVEL,
    COLUMN_POINTS,
)

# The sentinel slug for a task no single faction owns. Same default as
# POST /admin/tasks; `primary_faction_slug` is NOT NULL, so "" can never pass through.
CROSS_FACTION_SLUG = "na"

# Legacy/typo faction slugs seen in the source spreadsheet → canonical slugs
# (ADR-0004). Corrections are reported back to the admin, never applied silently.
FACTION_ALIASES: dict[str, str] = {
    "anolog": "everymen",
    "analog": "everymen",
    "gestalt": "wow",
    "journeymen": "ephemerists",
    "us_masters": "ua",
    "ua_masters": "ua",
}

# A tasks CSV is a few hundred rows of prose. Anything larger is a mistake or an
# attack, and it is cheaper to refuse it than to parse it.
CSV_MAX_BYTES = 2 * 1024 * 1024  # 2 MB

# Spreadsheet line number of the first data row: line 1 is the header. Errors are
# reported in these terms so "Row 7" means row 7 in the admin's spreadsheet.
FIRST_DATA_ROW = 2


@dataclass(frozen=True)
class RowError:
    """One rejected row, addressed by the line number the admin sees."""

    row: int
    msg: str


class TaskImportError(Exception):
    """The file cannot be imported. Carries every failing row, not just the first.

    ``row`` is ``None`` for whole-file problems (bad encoding, missing column).
    """

    def __init__(self, errors: list[RowError]) -> None:
        self.errors = errors
        super().__init__("; ".join(error.msg for error in errors))


@dataclass(frozen=True)
class ParsedRow:
    """A validated row, ready to become a Task once the faction slug checks out."""

    row: int
    task: TaskCreate


@dataclass(frozen=True)
class ImportOutcome:
    """What the import did, for the admin's readout."""

    created_titles: list[str]
    warnings: list[str]

    @property
    def created_count(self) -> int:
        return len(self.created_titles)


def _fail(msg: str, row: int | None = None) -> TaskImportError:
    return TaskImportError([RowError(row=row or 0, msg=msg)])


def _decode(raw: bytes) -> str:
    """Decode an uploaded file, tolerating the BOM Excel writes."""
    if len(raw) > CSV_MAX_BYTES:
        raise _fail(
            f"File is too large ({len(raw)} bytes). "
            f"The limit is {CSV_MAX_BYTES // (1024 * 1024)} MB."
        )
    if not raw.strip():
        raise _fail("The file is empty.")
    try:
        # utf-8-sig strips a leading BOM if present and is plain utf-8 otherwise.
        return raw.decode("utf-8-sig")
    except UnicodeDecodeError:
        raise _fail(
            "The file is not valid UTF-8 text. Export it from your spreadsheet as CSV."
        )


def _pydantic_message(exc: ValidationError) -> str:
    """Flatten a Pydantic error into one admin-readable clause."""
    return "; ".join(
        f"{'.'.join(str(part) for part in error['loc']) or 'row'}: {error['msg']}"
        for error in exc.errors()
    )


def parse_task_csv(raw: bytes) -> tuple[list[ParsedRow], list[str]]:
    """Parse and validate every row. Returns (rows, warnings).

    Raises :class:`TaskImportError` listing *every* invalid row. Faction slugs are
    normalised here but only checked against the database in
    :func:`import_tasks_from_csv`, which is where the DB is available.
    """
    reader = csv.DictReader(io.StringIO(_decode(raw)))

    missing = [
        column for column in REQUIRED_COLUMNS if column not in (reader.fieldnames or [])
    ]
    if missing:
        raise _fail(f"Missing required column(s): {', '.join(missing)}.")

    rows: list[ParsedRow] = []
    errors: list[RowError] = []
    warnings: list[str] = []
    seen_titles: set[str] = set()

    for offset, raw_row in enumerate(reader):
        row_number = FIRST_DATA_ROW + offset
        # A short row leaves later columns as None; a long one collects the extras
        # under the None key. Both are normalised to "" rather than crashing.
        cell = {
            column: (raw_row.get(column) or "").strip() for column in REQUIRED_COLUMNS
        }
        title = cell[COLUMN_TITLE]

        if not title:
            errors.append(RowError(row_number, f"Row {row_number}: Name is required."))
            continue

        label = f'Row {row_number} ("{title}")'

        if title in seen_titles:
            errors.append(
                RowError(row_number, f"{label}: duplicated earlier in this file.")
            )
            continue
        seen_titles.add(title)

        numbers: dict[str, int] = {}
        for column, field in ((COLUMN_LEVEL, "level"), (COLUMN_POINTS, "points")):
            try:
                numbers[field] = int(cell[column])
            except ValueError:
                errors.append(
                    RowError(
                        row_number,
                        f"{label}: {column} must be a whole number "
                        f"(got {cell[column]!r}).",
                    )
                )
        if len(numbers) < 2:
            continue

        faction = cell[COLUMN_FACTION]
        if faction in FACTION_ALIASES:
            corrected = FACTION_ALIASES[faction]
            warnings.append(f"{label}: faction '{faction}' corrected to '{corrected}'.")
            faction = corrected

        try:
            # Reusing TaskCreate is what keeps import and POST /admin/tasks
            # enforcing the same invariants.
            task = TaskCreate(
                title=title,
                description=cell[COLUMN_DESCRIPTION],
                point_value=numbers["points"],
                level_required=numbers["level"],
                primary_faction_slug=faction or CROSS_FACTION_SLUG,
            )
        except ValidationError as exc:
            errors.append(RowError(row_number, f"{label}: {_pydantic_message(exc)}"))
            continue

        rows.append(ParsedRow(row=row_number, task=task))

    if errors:
        raise TaskImportError(errors)
    if not rows:
        raise _fail("The file has a header but no task rows.")

    return rows, warnings


async def resolve_admin_character(
    admin: Account, session: AsyncSession
) -> Character | None:
    """The character credited as an admin-authored task. ``created_by`` is NOT NULL.

    Returns ``None`` rather than raising so each caller can report the failure in
    its own vocabulary; both admin task-creation paths share this lookup so they
    cannot disagree about which character gets the credit.
    """
    result = await session.execute(
        select(Character)
        .where(
            Character.account_id == admin.id,
            Character.status == CharacterStatus.active,
        )
        .limit(1)
    )
    return result.scalar_one_or_none()


async def import_tasks_from_csv(
    raw: bytes, admin: Account, session: AsyncSession
) -> ImportOutcome:
    """Create one active task per CSV row, or create nothing at all.

    Raises :class:`TaskImportError` with every failing row; the caller maps that
    to a response. Nothing is added to the session unless every row validates.
    """
    rows, warnings = parse_task_csv(raw)

    character = await resolve_admin_character(admin, session)
    if character is None:
        raise _fail("Admin must have an active character to author imported tasks.")

    known_slugs = set(
        (await session.execute(select(Faction.slug))).scalars().all()
    )
    existing_titles = set(
        (await session.execute(select(Task.title))).scalars().all()
    )

    errors: list[RowError] = []
    for parsed in rows:
        label = f'Row {parsed.row} ("{parsed.task.title}")'
        if parsed.task.primary_faction_slug not in known_slugs:
            errors.append(
                RowError(
                    parsed.row,
                    f"{label}: unknown faction "
                    f"'{parsed.task.primary_faction_slug}'.",
                )
            )
        if parsed.task.title in existing_titles:
            errors.append(RowError(parsed.row, f"{label}: a task with this name already exists."))
    if errors:
        raise TaskImportError(errors)

    for parsed in rows:
        session.add(
            Task(
                title=parsed.task.title,
                # `description` is NOT NULL — a blank cell is "", never None.
                description=parsed.task.description or "",
                point_value=parsed.task.point_value,
                level_required=parsed.task.level_required,
                primary_faction_slug=parsed.task.primary_faction_slug,
                task_type=TaskType.standard,
                created_by=character.id,
                status=TaskStatus.active,
            )
        )
    await session.flush()

    return ImportOutcome(
        created_titles=[parsed.task.title for parsed in rows],
        warnings=warnings,
    )
