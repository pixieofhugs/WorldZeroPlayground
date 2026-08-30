"""The prologue every praxis mutator opens with: fetch, then authorise (#2875).

Seam under test: **``services.praxis``'s fetch-then-authorise door**, driven
through the HTTP routes — because the defect was that three router handlers
bypassed that door entirely.

Eleven mutators in ``services/praxis.py`` open with a ``get_praxis*`` loader
followed by the ADR-0013 membership gate. Three media routes in
``routers/praxes.py`` used a second, indistinguishable shape instead —
``session.get(Praxis, id)``, a hand-written 404, and a privately-imported
``_require_member`` — which skipped both #2874's settle *and* the detail-view
eager loads. ``submit_praxis`` wrote the same membership check out by hand with
its own 403 prose.

What this file pins, and why each assertion is here rather than in
``test_praxes.py``:

- The three media routes settle ADR-0012's pending-publish window before they
  edit the shared document. A media add/remove is the same hard reset Withdraw
  is (``collab_consensus.on_member_edit``), and Withdraw settles — so a lapsed
  window had to reach the *same* verdict through both doors or the two drift.
  Observable: ``_apply_seal`` is the only writer of ``Praxis.submitted_at``, and
  ``on_member_edit`` does not clear it.
- The routes still answer a **coded** 404, which is the thing consolidating them
  onto the shared loader could quietly have dropped.
- "Not a member" has one wording across every mutator, submit included.
- ``flag_praxis`` evaluates each of #328's rules exactly once.
- No router imports a private name out of ``services.praxis``.

The window length is read from ``era.collab_auto_submit_days`` rather than
restated, so these tests cannot drift from the era that owns the rule.
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


@pytest.fixture(autouse=True)
def media_root(tmp_path, monkeypatch):
    """Point the media pipeline at a throwaway directory for every test here."""
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
    """Open the silence-is-consent window, then backdate it past its deadline."""
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


# ---------------------------------------------------------------------------
# The media routes go through the same door as every other mutator
# ---------------------------------------------------------------------------


@pytest.mark.asyncio
async def test_media_upload_settles_the_lapsed_window(
    client: AsyncClient,
    praxis_collab: Praxis,
    auth_headers: dict,
    db_session: AsyncSession,
):
    """Adding media to a collab whose window has lapsed publishes it first.

    ``on_member_edit`` behaves differently either side of the seal: on a
    ``pending`` praxis it silently cancels a proposal that silence had already
    carried; on a ``submitted`` one it reopens a published collab and recomputes
    every member's stats. Withdraw settles for exactly this reason (#2874), so
    the media door must too.
    """
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
    """Same verdict through the batch door as through the single-file one."""
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
    """Removing media edits the shared document, so it settles like adding does."""
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
    """Consolidation must not drop the ``PRAXIS_NOT_FOUND`` code off the wire.

    These three routes have carried it since #1652. The shared loader now raises
    it for every praxis 404 in the service, so the code survives the move.
    """
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
    """The membership gate survives the move into the service."""
    response = await client.post(
        f"/praxes/{praxis_collab.id}/media",
        files={"file": _image_part()},
        headers=auth_headers3,
    )

    assert response.status_code == 403, response.text


# ---------------------------------------------------------------------------
# One 403 wording for "not a member"
# ---------------------------------------------------------------------------


@pytest.mark.asyncio
async def test_submit_refuses_a_non_member_in_the_shared_wording(
    client: AsyncClient,
    praxis_collab: Praxis,
    character3: Character,
    auth_headers3: dict,
):
    """``submit_praxis`` used its own prose: "You are not a member of this praxis."

    Every other mutator says "Only a member can <action> this praxis." One
    operation, one refusal — this is the single user-visible change in #2875.
    """
    response = await client.post(
        f"/praxes/{praxis_collab.id}/submit", headers=auth_headers3
    )

    assert response.status_code == 403, response.text
    assert response.json()["detail"] == "Only a member can submit this praxis."


# ---------------------------------------------------------------------------
# flag_praxis asks each rule once
# ---------------------------------------------------------------------------


@pytest.mark.asyncio
async def test_flag_evaluates_each_eligibility_rule_once(
    praxis_solo: Praxis,
    character2: Character,
    era: Era,
    db_session: AsyncSession,
    monkeypatch: pytest.MonkeyPatch,
):
    """``can_flag_praxis`` states four rules; ``flag_praxis`` re-ran the first two.

    It checked anti-self-flag and anti-gang inline for their own error messages
    and *then* called ``can_flag_praxis``, which checked both again — two extra
    queries per flag, and a docstring promising a mirror that only maintenance
    kept true.

    Driven at the service rather than through ``POST /praxes/{id}/flag`` on
    purpose: that route answers a ``PraxisOut``, whose ``can_flag`` field asks
    the same question again about the *post*-flag state. That evaluation is the
    serializer's, it has a different answer, and it is not what #2875 is about.
    """
    stats = await get_or_create_stats(db_session, character2.id, era.id)
    stats.level = CURRENT_ERA.flag_level_required
    await db_session.flush()

    counts = {"author": 0, "flagged": 0}
    real_author = praxis_service._praxis_author_account_id
    real_flagged = praxis_service.account_already_flagged

    async def counting_author(praxis, session):
        counts["author"] += 1
        return await real_author(praxis, session)

    async def counting_flagged(account_id, session, **kwargs):
        counts["flagged"] += 1
        return await real_flagged(account_id, session, **kwargs)

    monkeypatch.setattr(
        praxis_service, "_praxis_author_account_id", counting_author
    )
    monkeypatch.setattr(
        praxis_service, "account_already_flagged", counting_flagged
    )

    flagged = await praxis_service.flag_praxis(
        praxis_id=praxis_solo.id,
        flagged_by=character2,
        reason=FlagReason.spam,
        session=db_session,
    )

    assert flagged.moderation_status == ModerationStatus.flagged
    assert counts["author"] == 1, (
        f"_praxis_author_account_id ran {counts['author']} times for one flag"
    )
    assert counts["flagged"] == 1, (
        f"account_already_flagged ran {counts['flagged']} times for one flag"
    )


# ---------------------------------------------------------------------------
# The layer boundary
# ---------------------------------------------------------------------------


ROUTERS_DIR = Path(__file__).resolve().parents[2] / "routers"


def test_no_router_imports_a_private_name_from_services_praxis():
    """``_require_member`` was imported across the layer boundary and called at
    three route handlers — an authorisation rule living in the HTTP adapter.

    Scoped to ``services.praxis`` on purpose: ``routers/praxes.py`` also imports
    ``services.praxis_out._build_invite_out``, which is a *serializer* and so is
    the router's own job (SPEC-backend-architecture §1). That one is out of
    #2875's scope; a gate is not.
    """
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
