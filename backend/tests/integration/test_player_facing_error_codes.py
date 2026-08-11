"""The player-facing raises converted in #1652 answer with a code (#1401 drawdown).

The seam is the **HTTP error body** these routes return, not the raise statement:
what #1401 promises a client is that ``detail`` carries a stable ``code`` beside
the prose, so branching on a failure never means matching an English string.
Asserting through the app is the only place that promise is observably kept —
a unit test on the raise site would pass on a body FastAPI never serialised.

Coverage here is the set the drawdown converted, not every uncoded raise: the
allowlist docstring records which classes were deliberately left.
"""
from __future__ import annotations

import pytest
from httpx import AsyncClient

from sqlalchemy.ext.asyncio import AsyncSession

from errors import DETAIL_CONTEXT_PARAM, ErrorCode
from models.character import Character
from models.praxis import Praxis, PraxisStatus, PraxisType


# ---------------------------------------------------------------------------
# GET /praxes — the filter and sort rejections on the busiest read in the app
# ---------------------------------------------------------------------------

#: ``query parameter -> the context the raise site names``. The context is what
#: picks the ``PRAXIS_FILTER_VALUE_INVALID_<context>`` sibling in the catalog,
#: so a raise site that named the wrong one renders another field's wording.
FILTER_PARAMETERS = {
    "sort": "sort",
    "era_scope": "era_scope",
    "voted": "voted",
    "type": "type",
    "status": "status",
}


@pytest.mark.parametrize("parameter, context", sorted(FILTER_PARAMETERS.items()))
@pytest.mark.asyncio
async def test_praxis_filter_rejection_is_coded(
    client: AsyncClient, parameter: str, context: str
):
    response = await client.get("/praxes", params={parameter: "not-a-real-value"})
    assert response.status_code == 422, response.text
    detail = response.json()["detail"]
    assert detail["code"] == ErrorCode.praxis_filter_value_invalid.value
    assert detail["params"][DETAIL_CONTEXT_PARAM] == context
    # The rejected value is echoed so the catalog copy can name it.
    assert detail["params"]["value"] == "not-a-real-value"


@pytest.mark.asyncio
async def test_praxis_filter_rejections_are_told_apart_by_code_not_prose(
    client: AsyncClient,
):
    """Five 422s on one endpoint: the context is what distinguishes them."""
    contexts = set()
    for parameter in FILTER_PARAMETERS:
        response = await client.get("/praxes", params={parameter: "bogus"})
        contexts.add(response.json()["detail"]["params"][DETAIL_CONTEXT_PARAM])
    assert contexts == set(FILTER_PARAMETERS.values())


# ---------------------------------------------------------------------------
# Praxis and media 404s — two failures that shared a status code
# ---------------------------------------------------------------------------

MISSING_ID = 99_999_999


@pytest.mark.asyncio
async def test_unviewable_praxis_reads_as_a_coded_not_found(
    client: AsyncClient, db_session: AsyncSession, active_task, character: Character
):
    """ADR-0024: an in-progress draft answers 404, not 403, to a non-member.

    The code must be the *same* one a genuinely missing row gets, or it would
    hand back exactly the existence signal the 404 exists to withhold.
    """
    draft = Praxis(
        task_id=active_task.id,
        created_by_id=character.id,
        type=PraxisType.solo,
        status=PraxisStatus.in_progress,
        title="Draft",
        body_text="wip",
    )
    db_session.add(draft)
    await db_session.commit()

    response = await client.get(f"/praxes/{draft.id}")
    assert response.status_code == 404, response.text
    assert response.json()["detail"]["code"] == ErrorCode.praxis_not_found.value


@pytest.mark.asyncio
async def test_missing_media_item_is_coded_apart_from_a_missing_praxis(
    client: AsyncClient, praxis_solo, auth_headers: dict
):
    """Both are 404 on the same route; only the code says which one happened."""
    missing_media = await client.delete(
        f"/praxes/{praxis_solo.id}/media/{MISSING_ID}", headers=auth_headers
    )
    assert missing_media.status_code == 404, missing_media.text
    assert (
        missing_media.json()["detail"]["code"] == ErrorCode.media_item_not_found.value
    )

    missing_praxis = await client.delete(
        f"/praxes/{MISSING_ID}/media/{MISSING_ID}", headers=auth_headers
    )
    assert missing_praxis.status_code == 404, missing_praxis.text
    assert missing_praxis.json()["detail"]["code"] == ErrorCode.praxis_not_found.value


# ---------------------------------------------------------------------------
# DELETE /relationships/{id} — the 403 a player can act on
# ---------------------------------------------------------------------------


@pytest.mark.asyncio
async def test_deleting_someone_elses_relationship_is_coded(
    client: AsyncClient,
    character: Character,
    character2: Character,
    auth_headers: dict,
    auth_headers2: dict,
):
    created = await client.post(
        "/relationships",
        json={"to_character_id": character2.id, "type": "friend"},
        headers=auth_headers,
    )
    relationship_id = created.json()["id"]

    forbidden = await client.delete(
        f"/relationships/{relationship_id}", headers=auth_headers2
    )
    assert forbidden.status_code == 403, forbidden.text
    assert (
        forbidden.json()["detail"]["code"]
        == ErrorCode.relationship_not_declarer.value
    )


@pytest.mark.asyncio
async def test_deleting_a_missing_relationship_is_coded(
    client: AsyncClient, character: Character, auth_headers: dict
):
    response = await client.delete(
        f"/relationships/{MISSING_ID}", headers=auth_headers
    )
    assert response.status_code == 404, response.text
    assert response.json()["detail"]["code"] == ErrorCode.relationship_not_found.value
