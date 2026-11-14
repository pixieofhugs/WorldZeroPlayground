"""Bulk task creation from a CSV (#1376), shared by the admin route and
``import_tasks_csv.py``.

Atomic: any bad row aborts the import and every bad row is reported. Imported
tasks are runtime rows, not era config; validation reuses ``TaskCreate``.
"""

import csv
import io
from dataclasses import dataclass

from pydantic import ValidationError
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from faction_slugs import CROSS_FACTION_SLUG
from models.account import Account
from models.character import Character, CharacterStatus
from models.faction import Faction
from models.task import Task, TaskStatus, TaskType
from schemas.task import TaskCreate
from services.faction_service import hidden_faction_slugs

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

# Legacy/typo spreadsheet slugs -> canonical (ADR-0004); reported, never silent.
FACTION_ALIASES: dict[str, str] = {
    "anolog": "everymen",
    "analog": "everymen",
    "gestalt": "wow",
    "journeymen": "ephemerists",
    "us_masters": "ua",
    "ua_masters": "ua",
}

# A real file is a few hundred rows; larger is a mistake or an attack.
CSV_MAX_BYTES = 2 * 1024 * 1024  # 2 MB

# Spreadsheet line numbers (line 1 is the header).
FIRST_DATA_ROW = 2


@dataclass(frozen=True)
class RowError:
    """One rejected row, addressed by the line number the admin sees."""

    row: int
    msg: str


class TaskImportError(Exception):
    """Carries every failing row; whole-file problems use row 0."""

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
    """Parse and validate every row -> (rows, warnings). Faction slugs are DB-checked
    later."""
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
        # Short rows give None cells; normalise to "".
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
    """The character credited with admin-authored tasks, or ``None`` for the caller to
    report."""
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
    """Create one active task per row; nothing is added unless every row validates.

    Titles already on the board are skipped with a warning so re-imports are
    no-ops; a title repeated within the file is an error.
    """
    rows, warnings = parse_task_csv(raw)

    character = await resolve_admin_character(admin, session)
    if character is None:
        raise _fail("Admin must have an active character to author imported tasks.")

    known_slugs = set(
        (await session.execute(select(Faction.slug))).scalars().all()
    )
    hidden_slugs = set(await hidden_faction_slugs(session))
    existing_titles = set(
        (
            await session.execute(
                select(Task.title).where(Task.status != TaskStatus.deleted)
            )
        )
        .scalars()
        .all()
    )

    errors: list[RowError] = []
    to_create: list[ParsedRow] = []
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
            continue
        if parsed.task.primary_faction_slug in hidden_slugs:
            errors.append(
                RowError(
                    parsed.row,
                    f"{label}: faction "
                    f"'{parsed.task.primary_faction_slug}' is not open for tasks.",
                )
            )
            continue
        if parsed.task.title in existing_titles:
            warnings.append(f"{label}: a task with this name already exists — skipped.")
            continue
        to_create.append(parsed)
    if errors:
        raise TaskImportError(errors)

    for parsed in to_create:
        session.add(
            Task(
                title=parsed.task.title,
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
        created_titles=[parsed.task.title for parsed in to_create],
        warnings=warnings,
    )
