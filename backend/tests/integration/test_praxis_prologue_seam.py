"""Every praxis mutator, media routes included, goes through ``services.praxis``'s
fetch-then-authorise door (#2875).

Lapsed-window checks observe ``submitted_at``: ``_apply_seal`` is its only writer
and ``on_member_edit`` does not clear it.
"""

import ast
import io
from datetime import datetime, timedelta, timezone
from pathlib import Path

import pytest
from httpx import AsyncClient
from PIL import Image
from sqlalchemy.ext.asyncio import AsyncSession

from game_config import CURRENT_ERA
from models.character import Character
from models.era import Era
from models.flag import FlagReason
from models.praxis import ModerationStatus, Praxis
from services import media as media_service
from services import praxis as praxis_service
from services.era import get_or_create_stats
from tests.integration.query_capture import capture_selects


@pytest.fixture(autouse=True)
def media_root(tmp_path, monkeypatch):
    monkeypatch.setattr(media_service.settings, "MEDIA_ROOT", str(tmp_path))
    return tmp_path


def _image_part(name: str = "proof.jpg") -> tuple[str, bytes, str]:
    image = Image.new("RGB", (32, 32), color=(10, 120, 200))
    buffer = io.BytesIO()
    image.save(buffer, format="JPEG")
    return (name, buffer.getvalue(), "image/jpeg")


async def _propose_then_lapse(
    client: AsyncClient, praxis_id: int, headers: dict, session: AsyncSession
) -> None:
    response = await client.post(f"/praxes/{praxis_id}/submit", headers=headers)
    assert response.status_code == 200, response.text
    praxis = await session.get(Praxis, praxis_id)
    praxis.submit_proposed_at = datetime.now(timezone.utc) - timedelta(
        days=CURRENT_ERA.collab_auto_submit_days, seconds=1
    )
    await session.commit()


async def _submitted_at(session: AsyncSession, praxis_id: int) -> datetime | None:
    session.expire_all()
    praxis = await session.get(Praxis, praxis_id)
    return praxis.submitted_at


@pytest.mark.asyncio
async def test_media_upload_settles_the_lapsed_window(
    client: AsyncClient,
    praxis_collab: Praxis,
    auth_headers: dict,
    db_session: AsyncSession,
):
    """Unsettled, ``on_member_edit`` would cancel a publish silence already won;
    Withdraw settles for the same reason (#2874)."""
    await _propose_then_lapse(
        client, praxis_collab.id, auth_headers, db_session
    )

    response = await client.post(
        f"/praxes/{praxis_collab.id}/media",
        files={"file": _image_part()},
        headers=auth_headers,
    )

    assert response.status_code == 201, response.text
    assert await _submitted_at(db_session, praxis_collab.id) is not None, (
        "the lapsed window was never sealed — the upload cancelled a publish "
        "the collab had already won by silence"
    )


@pytest.mark.asyncio
async def test_media_batch_settles_the_lapsed_window(
    client: AsyncClient,
    praxis_collab: Praxis,
    auth_headers: dict,
    db_session: AsyncSession,
):
    await _propose_then_lapse(
        client, praxis_collab.id, auth_headers, db_session
    )

    response = await client.post(
        f"/praxes/{praxis_collab.id}/media/batch",
        files=[("files", _image_part("a.jpg"))],
        headers=auth_headers,
    )

    assert response.status_code == 201, response.text
    assert await _submitted_at(db_session, praxis_collab.id) is not None


@pytest.mark.asyncio
async def test_media_delete_settles_the_lapsed_window(
    client: AsyncClient,
    praxis_collab: Praxis,
    auth_headers: dict,
    db_session: AsyncSession,
):
    created = await client.post(
        f"/praxes/{praxis_collab.id}/media",
        files={"file": _image_part()},
        headers=auth_headers,
    )
    assert created.status_code == 201, created.text
    media_id = created.json()["id"]

    await _propose_then_lapse(
        client, praxis_collab.id, auth_headers, db_session
    )

    response = await client.delete(
        f"/praxes/{praxis_collab.id}/media/{media_id}", headers=auth_headers
    )

    assert response.status_code == 204, response.text
    assert await _submitted_at(db_session, praxis_collab.id) is not None


@pytest.mark.asyncio
async def test_media_routes_answer_a_coded_404(
    client: AsyncClient, character: Character, auth_headers: dict
):
    """``PRAXIS_NOT_FOUND`` (#1652) must survive the shared loader."""
    responses = [
        await client.post(
            "/praxes/999999/media",
            files={"file": _image_part()},
            headers=auth_headers,
        ),
        await client.post(
            "/praxes/999999/media/batch",
            files=[("files", _image_part())],
            headers=auth_headers,
        ),
        await client.delete("/praxes/999999/media/1", headers=auth_headers),
    ]

    for response in responses:
        assert response.status_code == 404, response.text
        assert response.json()["detail"]["code"] == "PRAXIS_NOT_FOUND"


@pytest.mark.asyncio
async def test_media_upload_by_a_non_member_is_refused(
    client: AsyncClient,
    praxis_collab: Praxis,
    character3: Character,
    auth_headers3: dict,
):
    response = await client.post(
        f"/praxes/{praxis_collab.id}/media",
        files={"file": _image_part()},
        headers=auth_headers3,
    )

    assert response.status_code == 403, response.text


@pytest.mark.asyncio
async def test_submit_refuses_a_non_member_in_the_shared_wording(
    client: AsyncClient,
    praxis_collab: Praxis,
    character3: Character,
    auth_headers3: dict,
):
    response = await client.post(
        f"/praxes/{praxis_collab.id}/submit", headers=auth_headers3
    )

    assert response.status_code == 403, response.text
    assert response.json()["detail"] == "Only a member can submit this praxis."


#: SELECTs one flag costs (measured). A rule evaluated twice re-reads the author
#: and the flag history, which is more than the slack.
FLAG_SELECT_BUDGET = 18


@pytest.mark.asyncio
async def test_flag_stays_inside_its_query_budget(
    praxis_solo: Praxis,
    character2: Character,
    era: Era,
    db_session: AsyncSession,
):
    """Service-level: the route's ``PraxisOut.can_flag`` re-asks about the
    post-flag state, which is the serializer's evaluation, not this one."""
    stats = await get_or_create_stats(db_session, character2.id, era.id)
    stats.level = CURRENT_ERA.flag_level_required
    await db_session.flush()

    with capture_selects() as selects:
        flagged = await praxis_service.flag_praxis(
            praxis_id=praxis_solo.id,
            flagged_by=character2,
            reason=FlagReason.spam,
            session=db_session,
        )

    assert flagged.moderation_status == ModerationStatus.flagged
    assert len(selects) <= FLAG_SELECT_BUDGET, (
        f"flag_praxis ran {len(selects)} SELECTs for one flag"
    )


ROUTERS_DIR = Path(__file__).resolve().parents[2] / "routers"


def test_no_router_imports_a_private_name_from_services_praxis():
    """Only ``services.praxis``: a private serializer from ``praxis_out`` is the
    router's own job (SPEC-backend-architecture §1); a gate is not."""
    offenders: list[str] = []
    for path in sorted(ROUTERS_DIR.glob("*.py")):
        tree = ast.parse(path.read_text(encoding="utf-8"))
        for node in ast.walk(tree):
            if not isinstance(node, ast.ImportFrom) or node.module != "services.praxis":
                continue
            offenders += [
                f"{path.name}:{node.lineno} imports {alias.name}"
                for alias in node.names
                if alias.name.startswith("_")
            ]

    assert not offenders, (
        "a router reached past the public surface of services.praxis:\n  "
        + "\n  ".join(offenders)
        + "\n\nCall the service's fetch-then-authorise loader instead."
    )
