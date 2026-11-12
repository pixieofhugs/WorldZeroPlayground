"""Player-facing raises converted in #1652 answer with a ``code`` (#1401).

Asserted through the HTTP body: a unit test on the raise site would pass on a
body FastAPI never serialised. Deliberately-uncoded raises: see the allowlist.
"""
from __future__ import annotations

import pytest
from httpx import AsyncClient

from sqlalchemy.ext.asyncio import AsyncSession

from errors import DETAIL_CONTEXT_PARAM, ErrorCode
from faction_slugs import UNAFFILIATED_FACTION_SLUG, real_faction_slugs
from game_config import CURRENT_ERA
from models.character import Character
from models.duel import Duel, DuelStatus
from models.praxis import ModerationStatus, Praxis, PraxisStatus, PraxisType
from models.task import Task, TaskStatus
from services.character import ALBESCENT_FACTION_SLUG
from tests.integration.factories import DEFAULT_FACTION_SLUG

#: A live-era faction other than the fixtures' default, derived not named (#2708):
#: naming one collides with the default if an era reorders its roster.
OTHER_FACTION_SLUG = next(
    slug
    for slug in real_faction_slugs(CURRENT_ERA)
    if slug != DEFAULT_FACTION_SLUG
)


# GET /praxes filter and sort rejections

#: Query param -> raise-site context, which picks the catalog's
#: ``PRAXIS_FILTER_VALUE_INVALID_<context>`` wording.
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
    # Echoed so the catalog copy can name it.
    assert detail["params"]["value"] == "not-a-real-value"


@pytest.mark.asyncio
async def test_praxis_filter_rejections_are_told_apart_by_code_not_prose(
    client: AsyncClient,
):
    contexts = set()
    for parameter in FILTER_PARAMETERS:
        response = await client.get("/praxes", params={parameter: "bogus"})
        contexts.add(response.json()["detail"]["params"][DETAIL_CONTEXT_PARAM])
    assert contexts == set(FILTER_PARAMETERS.values())


# Praxis and media 404s

MISSING_ID = 99_999_999


@pytest.mark.asyncio
async def test_unviewable_praxis_reads_as_a_coded_not_found(
    client: AsyncClient, db_session: AsyncSession, active_task, character: Character
):
    """ADR-0024: a draft answers 404 to a non-member, with the missing-row code.

    A different code would leak the existence the 404 withholds.
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


# DELETE /relationships/{id}


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


# Service-layer gates (#1652). POST /factions/choose: ``character`` starts in
# ``ua``, so every case is a real defection attempt.


@pytest.mark.asyncio
async def test_defecting_to_your_current_faction_is_coded(
    client: AsyncClient, character: Character, auth_headers: dict
):
    response = await client.post(
        "/factions/choose",
        json={"faction_slug": DEFAULT_FACTION_SLUG},
        headers=auth_headers,
    )
    assert response.status_code == 422, response.text
    assert response.json()["detail"]["code"] == ErrorCode.faction_already_member.value


@pytest.mark.asyncio
async def test_defecting_to_the_unaffiliated_sentinel_is_coded(
    client: AsyncClient, character: Character, auth_headers: dict
):
    """``na`` is a start state, not a destination (ADR-0019/0030)."""
    response = await client.post(
        "/factions/choose",
        json={"faction_slug": UNAFFILIATED_FACTION_SLUG},
        headers=auth_headers,
    )
    assert response.status_code == 422, response.text
    assert response.json()["detail"]["code"] == ErrorCode.faction_not_selectable.value


@pytest.mark.asyncio
async def test_defecting_to_an_unknown_faction_is_coded(
    client: AsyncClient, character: Character, auth_headers: dict
):
    response = await client.post(
        "/factions/choose",
        json={"faction_slug": "no-such-faction"},
        headers=auth_headers,
    )
    assert response.status_code == 404, response.text
    assert response.json()["detail"]["code"] == ErrorCode.faction_not_found.value


@pytest.mark.asyncio
async def test_defecting_without_an_invitation_is_coded(
    client: AsyncClient, character: Character, auth_headers: dict
):
    """#454: switching in needs that faction's current-era invitation letter."""
    response = await client.post(
        "/factions/choose",
        json={"faction_slug": OTHER_FACTION_SLUG},
        headers=auth_headers,
    )
    assert response.status_code == 403, response.text
    assert (
        response.json()["detail"]["code"]
        == ErrorCode.faction_invitation_required.value
    )


@pytest.mark.asyncio
async def test_defecting_to_albescent_unqualified_is_coded(
    client: AsyncClient, character: Character, auth_headers: dict
):
    """ADR-0021: Albescent skips the invitation gate and has its own bar."""
    response = await client.post(
        "/factions/choose",
        json={"faction_slug": ALBESCENT_FACTION_SLUG},
        headers=auth_headers,
    )
    assert response.status_code == 403, response.text
    assert (
        response.json()["detail"]["code"]
        == ErrorCode.faction_albescent_not_eligible.value
    )


# Comment 404s. ``character2`` is level 5, clearing era.comment_level_required.


@pytest.mark.asyncio
async def test_commenting_on_a_missing_praxis_and_task_are_coded_apart(
    client: AsyncClient, character2: Character, auth_headers2: dict
):
    on_praxis = await client.post(
        f"/praxes/{MISSING_ID}/comments",
        json={"body_text": "hello"},
        headers=auth_headers2,
    )
    assert on_praxis.status_code == 404, on_praxis.text
    assert on_praxis.json()["detail"]["code"] == ErrorCode.praxis_not_found.value

    on_task = await client.post(
        f"/tasks/{MISSING_ID}/comments",
        json={"body_text": "hello"},
        headers=auth_headers2,
    )
    assert on_task.status_code == 404, on_task.text
    assert on_task.json()["detail"]["code"] == ErrorCode.task_not_found.value


@pytest.mark.asyncio
async def test_commenting_on_a_flagged_praxis_is_coded(
    client: AsyncClient,
    db_session: AsyncSession,
    praxis_solo: Praxis,
    character2: Character,
    auth_headers2: dict,
):
    """``flagged``, not ``hidden``: a hidden praxis answers the 404 above."""
    praxis_solo.moderation_status = ModerationStatus.flagged
    await db_session.commit()

    response = await client.post(
        f"/praxes/{praxis_solo.id}/comments",
        json={"body_text": "hello"},
        headers=auth_headers2,
    )
    assert response.status_code == 403, response.text
    assert (
        response.json()["detail"]["code"]
        == ErrorCode.praxis_not_open_for_comments.value
    )


@pytest.mark.asyncio
async def test_commenting_on_a_retired_task_is_coded(
    client: AsyncClient,
    db_session: AsyncSession,
    active_task: Task,
    character2: Character,
    auth_headers2: dict,
):
    """ADR-0006: only an active task carries a comment thread."""
    active_task.status = TaskStatus.retired
    await db_session.commit()

    response = await client.post(
        f"/tasks/{active_task.id}/comments",
        json={"body_text": "hello"},
        headers=auth_headers2,
    )
    assert response.status_code == 403, response.text
    assert (
        response.json()["detail"]["code"] == ErrorCode.task_not_open_for_comments.value
    )


# POST /duels/challenge and /duels/{id}/respond


@pytest.mark.asyncio
async def test_challenging_with_someone_elses_praxis_is_coded(
    client: AsyncClient,
    praxis_solo: Praxis,
    character: Character,
    character2: Character,
    auth_headers2: dict,
):
    response = await client.post(
        "/duels/challenge",
        json={
            "challenger_praxis_id": praxis_solo.id,
            "opponent_character_id": character.id,
        },
        headers=auth_headers2,
    )
    assert response.status_code == 403, response.text
    assert response.json()["detail"]["code"] == ErrorCode.praxis_not_owner.value


@pytest.mark.asyncio
async def test_challenging_a_missing_character_is_coded(
    client: AsyncClient,
    db_session: AsyncSession,
    active_task: Task,
    character: Character,
    auth_headers: dict,
):
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

    response = await client.post(
        "/duels/challenge",
        json={
            "challenger_praxis_id": draft.id,
            "opponent_character_id": MISSING_ID,
        },
        headers=auth_headers,
    )
    assert response.status_code == 404, response.text
    assert response.json()["detail"]["code"] == ErrorCode.character_not_found.value


@pytest.mark.asyncio
async def test_responding_to_someone_elses_challenge_is_coded(
    client: AsyncClient,
    db_session: AsyncSession,
    active_task: Task,
    praxis_solo: Praxis,
    character2: Character,
    character3: Character,
    auth_headers3: dict,
):
    duel = Duel(
        task_id=active_task.id,
        challenger_praxis_id=praxis_solo.id,
        opponent_character_id=character2.id,
        status=DuelStatus.pending,
    )
    db_session.add(duel)
    await db_session.commit()

    response = await client.post(
        f"/duels/{duel.id}/respond", json={"accept": True}, headers=auth_headers3
    )
    assert response.status_code == 403, response.text
    assert (
        response.json()["detail"]["code"] == ErrorCode.duel_challenge_not_yours.value
    )


@pytest.mark.asyncio
async def test_responding_to_a_resolved_challenge_is_coded(
    client: AsyncClient,
    db_session: AsyncSession,
    active_task: Task,
    praxis_solo: Praxis,
    character2: Character,
    auth_headers2: dict,
):
    duel = Duel(
        task_id=active_task.id,
        challenger_praxis_id=praxis_solo.id,
        opponent_character_id=character2.id,
        status=DuelStatus.declined,
    )
    db_session.add(duel)
    await db_session.commit()

    response = await client.post(
        f"/duels/{duel.id}/respond", json={"accept": True}, headers=auth_headers2
    )
    assert response.status_code == 400, response.text
    assert (
        response.json()["detail"]["code"]
        == ErrorCode.duel_challenge_already_resolved.value
    )


# POST /characters. ``account2`` has no character, so the level gate is not hit.


@pytest.mark.asyncio
async def test_creating_a_character_with_a_blank_name_is_coded(
    db_session: AsyncSession, account2, era, some_faction
):
    """Tested at the service: the wire 422s a blank name first (#1696).

    ``seed.py`` and scripts call ``create_character`` directly, without Pydantic.
    """
    from fastapi import HTTPException

    from schemas.character import CharacterCreate
    from services.character import create_character

    # model_construct skips validation, like a non-HTTP caller.
    blank = CharacterCreate.model_construct(display_name="   ")
    with pytest.raises(HTTPException) as raised:
        await create_character(account2.id, blank, db_session)

    assert raised.value.status_code == 400
    assert raised.value.detail["code"] == ErrorCode.character_name_required.value


@pytest.mark.asyncio
async def test_creating_a_character_in_albescent_unearned_is_coded(
    client: AsyncClient, account2, era, some_faction, auth_headers2: dict
):
    """#2399: an un-earned account gets the ordinary no-invitation refusal.

    It does not confirm the faction exists (ADR-0027).
    """
    response = await client.post(
        "/characters",
        json={"display_name": "Newcomer", "faction_slug": ALBESCENT_FACTION_SLUG},
        headers=auth_headers2,
    )
    assert response.status_code == 400, response.text
    assert (
        response.json()["detail"]["code"]
        == ErrorCode.faction_invitation_required.value
    )


@pytest.mark.asyncio
async def test_creating_a_character_in_an_uninvited_faction_is_coded(
    client: AsyncClient, account2, era, some_faction, auth_headers2: dict
):
    response = await client.post(
        "/characters",
        json={"display_name": "Newcomer", "faction_slug": "snide"},
        headers=auth_headers2,
    )
    assert response.status_code == 400, response.text
    assert (
        response.json()["detail"]["code"]
        == ErrorCode.faction_invitation_required.value
    )
