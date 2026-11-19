"""A banned life and a suspended account: deletion, creation, rolls, invites."""
import pytest
from fastapi import HTTPException
from httpx import AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession

from errors import ErrorCode
from faction_slugs import real_faction_slugs
from game_config import CURRENT_ERA, era_config_for_key
from models.account import Account, AccountStatus
from models.character import Character, CharacterStatus
from models.era import Era
from models.faction import Faction
from models.praxis import PraxisStatus
from services.account_deletion import delete_account
from services.character import list_characters_for_viewer, soft_delete_character
from services.duel import issue_duel_challenge
from services.era import get_or_create_stats
from tests.integration.factories import (
    make_admin,
    make_character,
    make_solo_praxis,
    make_task,
)


def _code(resp) -> str:
    return resp.json()["detail"]["code"]


async def _ban(client, character_id, headers, banned=True):
    return await client.post(
        f"/admin/characters/{character_id}/ban",
        json={"banned": banned},
        headers=headers,
    )


async def _create(client, headers, name="Fresh"):
    return await client.post(
        "/characters", json={"display_name": name}, headers=headers
    )


# --- #3505 ---


async def test_account_deletion_survives_a_self_deleted_and_a_mod_banned_life(
    db_session: AsyncSession, era: Era, account: Account, character: Character
):
    left = await make_character(db_session, era, username="left", account=account)
    banned = await make_character(db_session, era, username="mb", account=account)
    await soft_delete_character(left.id, db_session)
    first_stamp = left.departed_at
    banned.status = CharacterStatus.banned
    await db_session.flush()

    await delete_account(account.id, db_session)

    for life in (character, left, banned):
        await db_session.refresh(life)
        assert life.display_name == "Deleted player"
        assert life.departed_at is not None
    assert left.departed_at == first_stamp
    assert account.status == AccountStatus.deleted


# --- #3506 ---


async def test_a_suspended_session_gets_the_coded_403(
    client: AsyncClient, db_session: AsyncSession, account: Account, auth_headers: dict
):
    assert (await client.get("/auth/me", headers=auth_headers)).status_code == 200
    account.status = AccountStatus.suspended
    await db_session.commit()

    resp = await client.get("/auth/me", headers=auth_headers)

    assert resp.status_code == 403
    assert _code(resp) == ErrorCode.account_suspended.value


# --- #3507 ---


async def test_a_mod_ban_blocks_new_lives_until_it_is_lifted(
    client: AsyncClient,
    db_session: AsyncSession,
    account2: Account,
    character: Character,
    auth_headers: dict,
    auth_headers2: dict,
):
    await make_admin(db_session, account2)
    assert (await _ban(client, character.id, auth_headers2)).status_code == 200

    me = (await client.get("/auth/me", headers=auth_headers)).json()
    assert me["can_create_additional_character"] is False
    resp = await _create(client, auth_headers)
    assert resp.status_code == 403
    assert _code(resp) == ErrorCode.character_creation_banned.value

    assert (await _ban(client, character.id, auth_headers2, False)).status_code == 200
    lifted = await _create(client, auth_headers)
    assert _code(lifted) == ErrorCode.second_character_level_too_low.value


async def test_a_self_deleted_life_does_not_block_a_new_one(
    client: AsyncClient, character: Character, auth_headers: dict
):
    assert (
        await client.delete(f"/characters/{character.id}", headers=auth_headers)
    ).status_code == 204

    assert (await _create(client, auth_headers)).status_code == 201


async def test_a_banned_second_life_blocks_a_level_4_account_from_a_third(
    client: AsyncClient,
    db_session: AsyncSession,
    era: Era,
    account: Account,
    character: Character,
    auth_headers: dict,
):
    await make_character(
        db_session,
        era,
        username="veteran",
        account=account,
        level=CURRENT_ERA.second_character_level_required,
    )
    banned = await make_character(db_session, era, username="bn", account=account)
    banned.status = CharacterStatus.banned
    await db_session.commit()

    resp = await _create(client, auth_headers)
    assert _code(resp) == ErrorCode.character_creation_banned.value

    banned.status = CharacterStatus.active
    await db_session.commit()
    assert (await _create(client, auth_headers)).status_code == 201


# --- #3517 ---


async def test_an_era_roll_resets_a_mod_banned_life(
    db_session: AsyncSession, era: Era, account: Account, some_faction: Faction
):
    from services.admin_service import roll_into_era

    era_2 = era_config_for_key("era_2")
    old_slug = next(
        s for s in real_faction_slugs(CURRENT_ERA) if s != era_2.reset_faction_slug
    )
    banned = await make_character(
        db_session, era, username="rollban", faction_slug=old_slug, level=3
    )
    banned.status = CharacterStatus.banned
    await make_admin(db_session, account)

    await roll_into_era("era_2", account, db_session)

    banned.status = CharacterStatus.active
    await db_session.refresh(banned)
    assert era_2.reset_faction
    assert banned.faction_slug == era_2.reset_faction_slug


async def test_an_era_roll_leaves_a_self_deleted_life_alone(
    db_session: AsyncSession, era: Era, some_faction: Faction
):
    from services.admin_service import list_characters_to_reset

    gone = await make_character(db_session, era, username="gone")
    await soft_delete_character(gone.id, db_session)

    assert gone.id not in {c.id for c in await list_characters_to_reset(db_session)}


# --- #3518 ---


@pytest.fixture(params=["banned", "suspended"])
async def unplayable(
    request, db_session: AsyncSession, era: Era, some_faction: Faction
) -> Character:
    victim = await make_character(db_session, era, username="victim")
    if request.param == "banned":
        victim.status = CharacterStatus.banned
    else:
        account = await db_session.get(Account, victim.account_id)
        account.status = AccountStatus.suspended
    await db_session.commit()
    return victim


async def test_a_collab_invite_to_an_unplayable_life_is_a_404(
    client: AsyncClient,
    db_session: AsyncSession,
    era: Era,
    unplayable: Character,
    character: Character,
    auth_headers: dict,
):
    stats = await get_or_create_stats(db_session, character.id, era.id)
    stats.level = 1
    task = await make_task(db_session, character)
    await db_session.commit()
    created = await client.post(
        "/praxes",
        json={"task_id": task.id, "type": "collab", "title": "c"},
        headers=auth_headers,
    )
    assert created.status_code == 201, created.text

    resp = await client.post(
        f"/praxes/{created.json()['id']}/invite",
        json={"invitee_id": unplayable.id},
        headers=auth_headers,
    )

    assert resp.status_code == 404


async def test_a_duel_challenge_to_an_unplayable_life_is_a_404(
    db_session: AsyncSession, unplayable: Character, character: Character
):
    task = await make_task(db_session, character)
    praxis = await make_solo_praxis(
        db_session, task, character, status=PraxisStatus.in_progress
    )

    with pytest.raises(HTTPException) as caught:
        await issue_duel_challenge(character.id, praxis.id, unplayable.id, db_session)

    assert caught.value.status_code == 404
    assert caught.value.detail["code"] == ErrorCode.character_not_found.value


async def test_the_character_list_hides_a_suspended_accounts_lives(
    db_session: AsyncSession, era: Era, some_faction: Faction
):
    dave = await make_character(db_session, era, username="davesus")
    visible = await make_character(db_session, era, username="daveok")
    (await db_session.get(Account, dave.account_id)).status = AccountStatus.suspended
    await db_session.flush()

    rows = await list_characters_for_viewer(db_session, search="dave")

    assert {c.id for c, _ in rows} == {visible.id}
