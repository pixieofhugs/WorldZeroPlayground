"""#328 — account-scoped flag guards (anti-self-flag + anti-gang).

A second life is an independent identity except for account-scoped anti-cheat
guards. Flagging is now account-scoped like voting: no account can flag its own
work across lives, and no account can stack more than one flag on a praxis.

Comments are held to the same two rules (they were character-scoped with no
uniqueness at all, and ``comment_flag_review_threshold`` is 1 — so one puppet
flag put an account's own comment straight into the admin queue).
"""
import pytest
from httpx import AsyncClient
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from game_config import CURRENT_ERA
from models.account import Account
from models.character import Character, CharacterStatus
from models.character_stats import CharacterStats
from models.era import Era
from models.faction import Faction
from models.praxis import Praxis
from models.task import Task
from services.auth import create_jwt
from tests.integration.factories import DEFAULT_FACTION_SLUG

FLAG_LEVEL = CURRENT_ERA.flag_level_required


async def _seed_life(
    db_session: AsyncSession,
    account: Account,
    era: Era,
    *,
    username: str,
    level: int = FLAG_LEVEL,
) -> Character:
    ch = Character(
        account_id=account.id,
        username=username,
        display_name=username.title(),
        faction_slug=DEFAULT_FACTION_SLUG,
        status=CharacterStatus.active,
    )
    db_session.add(ch)
    await db_session.flush()
    db_session.add(
        CharacterStats(character_id=ch.id, era_id=era.id, level=level, votes_spent_this_era=0)
    )
    await db_session.commit()
    await db_session.refresh(ch)
    return ch


async def _submit_solo(client: AsyncClient, task: Task, headers: dict) -> int:
    create = await client.post(
        "/praxes",
        json={"task_id": task.id, "type": "solo", "title": "Work"},
        headers=headers,
    )
    assert create.status_code == 201, create.text
    praxis_id = create.json()["id"]
    assert (await client.post(f"/praxes/{praxis_id}/submit", headers=headers)).status_code == 200
    return praxis_id


async def _carry(client: AsyncClient, character_id: int, headers: dict) -> None:
    resp = await client.post(
        "/me/active-character", json={"character_id": character_id}, headers=headers
    )
    assert resp.status_code == 200, resp.text


async def _set_level(db_session: AsyncSession, character: Character, era: Era, level: int) -> None:
    stats = (
        await db_session.execute(
            select(CharacterStats).where(
                CharacterStats.character_id == character.id,
                CharacterStats.era_id == era.id,
            )
        )
    ).scalar_one()
    stats.level = level
    await db_session.commit()


@pytest.mark.asyncio
async def test_sibling_cannot_flag_own_accounts_praxis(
    client: AsyncClient,
    db_session: AsyncSession,
    account: Account,
    character: Character,
    active_task: Task,
    era: Era,
    some_faction: Faction,
    auth_headers: dict,
):
    """Puppet B flagging puppet A's praxis (same account) → 403."""
    praxis_id = await _submit_solo(client, active_task, auth_headers)  # puppet A's work
    puppet_b = await _seed_life(db_session, account, era, username="puppetb")

    await _carry(client, puppet_b.id, auth_headers)
    resp = await client.post(
        f"/praxes/{praxis_id}/flag", json={"reason": "spam"}, headers=auth_headers
    )
    assert resp.status_code == 403


@pytest.mark.asyncio
async def test_account_flag_uniqueness_and_non_sibling_still_allowed(
    client: AsyncClient,
    db_session: AsyncSession,
    account: Account,
    account2: Account,
    character: Character,
    character2: Character,
    active_task: Task,
    era: Era,
    some_faction: Faction,
    auth_headers: dict,
    auth_headers2: dict,
):
    """One flag per account (anti-gang): a sibling → 409; a non-sibling → still 200."""
    target_pid = await _submit_solo(client, active_task, auth_headers2)  # third-party praxis

    # account1: puppet A (character, bumped to flag level) + puppet B.
    await _set_level(db_session, character, era, FLAG_LEVEL)
    puppet_b = await _seed_life(db_session, account, era, username="puppetb")

    # Puppet A registers the account's one legitimate flag.
    await _carry(client, character.id, auth_headers)
    first = await client.post(
        f"/praxes/{target_pid}/flag", json={"reason": "other", "reason_detail": "genuine concern here"}, headers=auth_headers
    )
    assert first.status_code == 200

    # Puppet B (same account) tries to stack a second flag → 409.
    await _carry(client, puppet_b.id, auth_headers)
    gang = await client.post(
        f"/praxes/{target_pid}/flag", json={"reason": "spam"}, headers=auth_headers
    )
    assert gang.status_code == 409

    # A non-sibling on a different account is unaffected → 200.
    account3 = Account(email="third-flagger@example.com")
    db_session.add(account3)
    await db_session.flush()
    non_sibling = await _seed_life(db_session, account3, era, username="nonsibling")
    ns_headers = {"Authorization": f"Bearer {create_jwt(account3.id)}"}
    assert non_sibling.id  # seeded
    ns_flag = await client.post(
        f"/praxes/{target_pid}/flag", json={"reason": "harassment"}, headers=ns_headers
    )
    assert ns_flag.status_code == 200


async def _post_comment(client: AsyncClient, praxis_id: int, headers: dict) -> int:
    resp = await client.post(
        f"/praxes/{praxis_id}/comments",
        json={"body_text": "worth discussing"},
        headers=headers,
    )
    assert resp.status_code == 201, resp.text
    return resp.json()["id"]


@pytest.mark.asyncio
async def test_sibling_cannot_flag_own_accounts_comment(
    client: AsyncClient,
    db_session: AsyncSession,
    account: Account,
    character: Character,
    praxis_solo: Praxis,
    era: Era,
    some_faction: Faction,
    auth_headers: dict,
):
    """Puppet B flagging puppet A's comment (same account) -> 403, comment untouched."""
    await _set_level(db_session, character, era, FLAG_LEVEL)
    comment_id = await _post_comment(client, praxis_solo.id, auth_headers)
    puppet_b = await _seed_life(db_session, account, era, username="puppetb")

    await _carry(client, puppet_b.id, auth_headers)
    resp = await client.post(
        f"/comments/{comment_id}/flag", json={"reason": "spam"}, headers=auth_headers
    )
    assert resp.status_code == 403

    # Threshold is 1, so a guard that let this through would have hidden the
    # comment immediately.
    listed = await client.get(f"/praxes/{praxis_solo.id}/comments")
    assert [c["id"] for c in listed.json()] == [comment_id]


@pytest.mark.asyncio
async def test_account_comment_flag_uniqueness_and_non_sibling_still_allowed(
    client: AsyncClient,
    db_session: AsyncSession,
    account: Account,
    account2: Account,
    character: Character,
    character2: Character,
    praxis_solo: Praxis,
    era: Era,
    some_faction: Faction,
    auth_headers: dict,
    auth_headers2: dict,
):
    """One comment flag per account: a sibling -> 409; a non-sibling -> still 200."""
    comment_id = await _post_comment(client, praxis_solo.id, auth_headers2)

    await _set_level(db_session, character, era, FLAG_LEVEL)
    puppet_b = await _seed_life(db_session, account, era, username="puppetb")

    await _carry(client, character.id, auth_headers)
    first = await client.post(
        f"/comments/{comment_id}/flag",
        json={"reason": "other", "reason_detail": "genuine concern here"},
        headers=auth_headers,
    )
    assert first.status_code == 200, first.text

    await _carry(client, puppet_b.id, auth_headers)
    gang = await client.post(
        f"/comments/{comment_id}/flag", json={"reason": "spam"}, headers=auth_headers
    )
    assert gang.status_code == 409

    account3 = Account(email="third-comment-flagger@example.com")
    db_session.add(account3)
    await db_session.flush()
    await _seed_life(db_session, account3, era, username="commentnonsibling")
    ns_headers = {"Authorization": f"Bearer {create_jwt(account3.id)}"}
    ns_flag = await client.post(
        f"/comments/{comment_id}/flag",
        json={"reason": "harassment"},
        headers=ns_headers,
    )
    assert ns_flag.status_code == 200, ns_flag.text
