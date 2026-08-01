"""Integration tests for POST /admin/tasks/import-csv (#1376).

The seam under test is the **HTTP multipart boundary**: a browser file upload
into an admin-only route. A service-level test cannot exercise the multipart
wire contract, the ``require_admin`` gate, or the response shape the admin UI
renders, so every test here drives the real endpoint.

The import is ATOMIC — if any row fails validation, nothing is written. The
rejection tests therefore assert on the database, not just the status code.
"""
import pytest
from httpx import AsyncClient
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from models.account import Account
from models.character import Character
from models.faction import Faction, FactionStatus
from models.roles import AccountRole, Role
from models.task import Task, TaskStatus, TaskType

IMPORT_URL = "/admin/tasks/import-csv"

HEADER = "Name,Faction,Description,Level,Points"


async def _make_admin(account: Account, session: AsyncSession) -> None:
    """Grant the admin role to an account."""
    role = Role(name="admin", description="Administrator")
    session.add(role)
    await session.flush()
    session.add(
        AccountRole(account_id=account.id, role_id=role.id, granted_by=account.id)
    )
    await session.commit()


def _upload(csv_text: str) -> dict:
    """Build the multipart payload httpx sends for a browser file picker."""
    return {"file": ("tasks.csv", csv_text.encode("utf-8"), "text/csv")}


async def _task_titles(session: AsyncSession) -> set[str]:
    return set((await session.execute(select(Task.title))).scalars().all())


# ---------------------------------------------------------------------------
# Auth guard — the one that must not be forgotten
# ---------------------------------------------------------------------------


@pytest.mark.asyncio
async def test_non_admin_is_refused(
    client: AsyncClient,
    account: Account,
    character: Character,
    auth_headers: dict,
    db_session: AsyncSession,
):
    """A signed-in non-admin gets 403 and writes nothing."""
    before = await _task_titles(db_session)

    resp = await client.post(
        IMPORT_URL,
        headers=auth_headers,
        files=_upload(f"{HEADER}\nSneaky Task,ua,Nope,0,10\n"),
    )

    assert resp.status_code == 403
    assert await _task_titles(db_session) == before


@pytest.mark.asyncio
async def test_anonymous_is_refused(client: AsyncClient, db_session: AsyncSession):
    """No credentials at all — refused before any parsing happens."""
    before = await _task_titles(db_session)

    resp = await client.post(
        IMPORT_URL, files=_upload(f"{HEADER}\nSneaky Task,ua,Nope,0,10\n")
    )

    assert resp.status_code in (401, 403)
    assert await _task_titles(db_session) == before


# ---------------------------------------------------------------------------
# Happy path — asserted by value
# ---------------------------------------------------------------------------


@pytest.mark.asyncio
async def test_well_formed_csv_creates_exactly_those_tasks(
    client: AsyncClient,
    account: Account,
    character: Character,
    auth_headers: dict,
    db_session: AsyncSession,
):
    """Every field lands with the value the CSV named."""
    await _make_admin(account, db_session)

    csv_text = (
        f"{HEADER}\n"
        "Sweep The Steps,ua,Sweep them until they shine,2,30\n"
        'Quiet Hour,,"Sit still, say nothing",0,10\n'
    )

    resp = await client.post(IMPORT_URL, headers=auth_headers, files=_upload(csv_text))

    assert resp.status_code == 201, resp.text
    body = resp.json()
    assert body["created_count"] == 2
    assert body["created_titles"] == ["Sweep The Steps", "Quiet Hour"]

    swept = (
        await db_session.execute(
            select(Task).where(Task.title == "Sweep The Steps")
        )
    ).scalar_one()
    assert swept.description == "Sweep them until they shine"
    assert swept.point_value == 30
    assert swept.level_required == 2
    assert swept.primary_faction_slug == "ua"
    assert swept.status == TaskStatus.active
    assert swept.task_type == TaskType.standard
    assert swept.created_by == character.id

    # An empty Faction column means "cross-faction", which is the `na` sentinel —
    # the same default POST /admin/tasks applies. The column is NOT NULL, so this
    # also guards the NULL the standalone script used to write.
    quiet = (
        await db_session.execute(select(Task).where(Task.title == "Quiet Hour"))
    ).scalar_one()
    assert quiet.primary_faction_slug == "na"
    assert quiet.description == "Sit still, say nothing"
    assert quiet.point_value == 10
    assert quiet.level_required == 0


@pytest.mark.asyncio
async def test_empty_description_is_stored_as_empty_string(
    client: AsyncClient,
    account: Account,
    character: Character,
    auth_headers: dict,
    db_session: AsyncSession,
):
    """`description` is NOT NULL — a blank column must become '', never NULL."""
    await _make_admin(account, db_session)

    resp = await client.post(
        IMPORT_URL,
        headers=auth_headers,
        files=_upload(f"{HEADER}\nBare Bones,ua,,1,5\n"),
    )

    assert resp.status_code == 201, resp.text
    task = (
        await db_session.execute(select(Task).where(Task.title == "Bare Bones"))
    ).scalar_one()
    assert task.description == ""


@pytest.mark.asyncio
async def test_legacy_faction_alias_is_corrected_and_reported(
    client: AsyncClient,
    account: Account,
    character: Character,
    auth_headers: dict,
    db_session: AsyncSession,
):
    """A known legacy slug is normalised, and the admin is told it happened."""
    await _make_admin(account, db_session)

    resp = await client.post(
        IMPORT_URL,
        headers=auth_headers,
        files=_upload(f"{HEADER}\nOld Slug Task,us_masters,Legacy,1,15\n"),
    )

    assert resp.status_code == 201, resp.text
    task = (
        await db_session.execute(select(Task).where(Task.title == "Old Slug Task"))
    ).scalar_one()
    assert task.primary_faction_slug == "ua"

    warnings = resp.json()["warnings"]
    assert any("us_masters" in w and "ua" in w for w in warnings)


# ---------------------------------------------------------------------------
# Rejection — atomic, and the message names the row
# ---------------------------------------------------------------------------


def _messages(resp) -> list[str]:
    return [item["msg"] for item in resp.json()["detail"]]


@pytest.mark.asyncio
async def test_malformed_row_rejects_the_whole_file(
    client: AsyncClient,
    account: Account,
    character: Character,
    auth_headers: dict,
    db_session: AsyncSession,
):
    """One bad row rejects every row — the import is atomic."""
    await _make_admin(account, db_session)
    before = await _task_titles(db_session)

    csv_text = (
        f"{HEADER}\n"
        "Good Row One,ua,Fine,1,10\n"
        "Bad Points,ua,Points are not a number,1,lots\n"
        "Good Row Two,ua,Also fine,2,20\n"
    )

    resp = await client.post(IMPORT_URL, headers=auth_headers, files=_upload(csv_text))

    assert resp.status_code == 422, resp.text
    messages = _messages(resp)
    assert len(messages) == 1
    # Row 3 = spreadsheet line 3 (header is line 1, first data row is line 2).
    assert "Row 3" in messages[0]
    assert "Bad Points" in messages[0]
    assert "lots" in messages[0]

    # Nothing written — not even the two well-formed rows.
    assert await _task_titles(db_session) == before


@pytest.mark.asyncio
async def test_every_bad_row_is_reported_not_just_the_first(
    client: AsyncClient,
    account: Account,
    character: Character,
    auth_headers: dict,
    db_session: AsyncSession,
):
    """The admin fixes the whole file in one pass, not one row per upload."""
    await _make_admin(account, db_session)

    csv_text = (
        f"{HEADER}\n"
        "Zero Points,ua,Must be positive,1,0\n"
        "Good Row,ua,Fine,1,10\n"
        ",ua,No name at all,1,10\n"
        "Negative Level,ua,Must be >= 0,-1,10\n"
    )

    resp = await client.post(IMPORT_URL, headers=auth_headers, files=_upload(csv_text))

    assert resp.status_code == 422, resp.text
    messages = _messages(resp)
    assert len(messages) == 3
    assert any("Row 2" in m for m in messages)
    assert any("Row 4" in m for m in messages)
    assert any("Row 5" in m for m in messages)


@pytest.mark.asyncio
async def test_unknown_faction_slug_names_the_row(
    client: AsyncClient,
    account: Account,
    character: Character,
    auth_headers: dict,
    db_session: AsyncSession,
):
    """An unknown faction is a rejection, not a silent NULL or a FK explosion."""
    await _make_admin(account, db_session)
    before = await _task_titles(db_session)

    resp = await client.post(
        IMPORT_URL,
        headers=auth_headers,
        files=_upload(f"{HEADER}\nWrong Faction,not_a_faction,Nope,1,10\n"),
    )

    assert resp.status_code == 422, resp.text
    messages = _messages(resp)
    assert "Row 2" in messages[0]
    assert "not_a_faction" in messages[0]
    assert await _task_titles(db_session) == before


@pytest.mark.asyncio
async def test_duplicate_title_within_the_file_is_rejected(
    client: AsyncClient,
    account: Account,
    character: Character,
    auth_headers: dict,
    db_session: AsyncSession,
):
    await _make_admin(account, db_session)
    before = await _task_titles(db_session)

    csv_text = (
        f"{HEADER}\n"
        "Same Name,ua,First,1,10\n"
        "Same Name,ua,Second,2,20\n"
    )

    resp = await client.post(IMPORT_URL, headers=auth_headers, files=_upload(csv_text))

    assert resp.status_code == 422, resp.text
    assert "Row 3" in _messages(resp)[0]
    assert await _task_titles(db_session) == before


@pytest.mark.asyncio
async def test_title_that_already_exists_is_rejected(
    client: AsyncClient,
    account: Account,
    character: Character,
    active_task: Task,
    auth_headers: dict,
    db_session: AsyncSession,
):
    """Re-uploading a file that was already imported must not duplicate tasks."""
    await _make_admin(account, db_session)

    resp = await client.post(
        IMPORT_URL,
        headers=auth_headers,
        files=_upload(f"{HEADER}\n{active_task.title},ua,Duplicate,1,10\n"),
    )

    assert resp.status_code == 422, resp.text
    assert "Row 2" in _messages(resp)[0]

    count = len(
        (
            await db_session.execute(
                select(Task).where(Task.title == active_task.title)
            )
        )
        .scalars()
        .all()
    )
    assert count == 1


@pytest.mark.asyncio
async def test_missing_required_column_is_rejected(
    client: AsyncClient,
    account: Account,
    character: Character,
    auth_headers: dict,
    db_session: AsyncSession,
):
    """A CSV with the wrong header fails on the header, not row by row."""
    await _make_admin(account, db_session)

    resp = await client.post(
        IMPORT_URL,
        headers=auth_headers,
        files=_upload("Name,Faction,Description,Level\nNo Points,ua,Missing,1\n"),
    )

    assert resp.status_code == 422, resp.text
    assert "Points" in _messages(resp)[0]


@pytest.mark.asyncio
async def test_empty_file_is_rejected(
    client: AsyncClient,
    account: Account,
    character: Character,
    auth_headers: dict,
    db_session: AsyncSession,
):
    await _make_admin(account, db_session)

    resp = await client.post(IMPORT_URL, headers=auth_headers, files=_upload(""))

    assert resp.status_code == 422, resp.text


@pytest.mark.asyncio
async def test_no_data_rows_is_rejected(
    client: AsyncClient,
    account: Account,
    character: Character,
    auth_headers: dict,
    db_session: AsyncSession,
):
    """A header-only file is a mistake worth naming, not a silent no-op."""
    await _make_admin(account, db_session)

    resp = await client.post(IMPORT_URL, headers=auth_headers, files=_upload(HEADER))

    assert resp.status_code == 422, resp.text


@pytest.mark.asyncio
async def test_utf8_bom_header_is_tolerated(
    client: AsyncClient,
    account: Account,
    character: Character,
    auth_headers: dict,
    db_session: AsyncSession,
):
    """Excel writes a BOM; without utf-8-sig the first column name is mangled."""
    await _make_admin(account, db_session)

    resp = await client.post(
        IMPORT_URL,
        headers=auth_headers,
        files={
            "file": (
                "tasks.csv",
                b"\xef\xbb\xbf" + f"{HEADER}\nBOM Task,ua,From Excel,1,10\n".encode(),
                "text/csv",
            )
        },
    )

    assert resp.status_code == 201, resp.text
    assert resp.json()["created_titles"] == ["BOM Task"]


@pytest.mark.asyncio
async def test_non_utf8_bytes_are_rejected(
    client: AsyncClient,
    account: Account,
    character: Character,
    auth_headers: dict,
    db_session: AsyncSession,
):
    """A binary file dropped into the picker fails on decode, not on insert."""
    await _make_admin(account, db_session)

    resp = await client.post(
        IMPORT_URL,
        headers=auth_headers,
        files={"file": ("tasks.png", b"\x89PNG\r\n\x1a\n\xff\xfe\xfd", "text/csv")},
    )

    assert resp.status_code == 422, resp.text


@pytest.mark.asyncio
async def test_admin_without_an_active_character_is_rejected(
    client: AsyncClient,
    account: Account,
    auth_headers: dict,
    db_session: AsyncSession,
):
    """`created_by` is NOT NULL — an admin with no character cannot import."""
    await _make_admin(account, db_session)
    db_session.add(Faction(slug="ua", status=FactionStatus.visible))
    await db_session.commit()

    resp = await client.post(
        IMPORT_URL,
        headers=auth_headers,
        files=_upload(f"{HEADER}\nNo Author,ua,Nobody to credit,1,10\n"),
    )

    assert resp.status_code == 422, resp.text
