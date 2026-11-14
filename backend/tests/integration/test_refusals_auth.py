"""Refusals at the door: CLI token, dead sessions, banned writers, cookies (#3355)."""
import pytest
from fastapi import Response
from httpx import AsyncClient
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from config import settings
from models.account import Account, AccountStatus
from models.character import Character, CharacterStatus
from models.comment import Comment
from models.praxis import Praxis
from models.task import Task
from models.vote import Vote
from routers.auth import _set_session_cookie
from tests.integration.factories import make_admin, make_solo_praxis

CLI_SECRET = "s3cret-for-tests"


async def _cli_token(client: AsyncClient, secret: str | bytes):
    return await client.post(
        "/admin/cli-token", headers={"X-Admin-Cli-Secret": secret}
    )


@pytest.mark.asyncio
async def test_cli_token_refused_when_the_secret_is_unset(
    client: AsyncClient, account: Account, db_session: AsyncSession, monkeypatch
):
    await make_admin(db_session, account)
    monkeypatch.setattr(settings, "ADMIN_CLI_SECRET", "")

    for sent in ("", "anything"):
        resp = await _cli_token(client, sent)
        assert resp.status_code == 403
        assert "access_token" not in resp.text


@pytest.mark.asyncio
async def test_cli_token_refused_for_a_wrong_secret(
    client: AsyncClient, account: Account, db_session: AsyncSession, monkeypatch
):
    await make_admin(db_session, account)
    monkeypatch.setattr(settings, "ADMIN_CLI_SECRET", CLI_SECRET)

    resp = await _cli_token(client, CLI_SECRET + "x")

    assert resp.status_code == 403
    assert "access_token" not in resp.text


@pytest.mark.xfail(strict=True, reason="#3366")
@pytest.mark.asyncio
async def test_cli_token_non_ascii_header_is_a_403_not_a_500(
    client: AsyncClient, account: Account, db_session: AsyncSession, monkeypatch
):
    await make_admin(db_session, account)
    monkeypatch.setattr(settings, "ADMIN_CLI_SECRET", CLI_SECRET)

    resp = await _cli_token(client, "sécret".encode())

    assert resp.status_code == 403


@pytest.mark.asyncio
async def test_cli_token_correct_secret_mints_an_admin_token(
    client: AsyncClient,
    account: Account,
    db_session: AsyncSession,
    monkeypatch,
):
    await make_admin(db_session, account)
    monkeypatch.setattr(settings, "ADMIN_CLI_SECRET", CLI_SECRET)

    resp = await _cli_token(client, CLI_SECRET)

    assert resp.status_code == 200
    token = resp.json()["access_token"]
    admin_read = await client.get(
        "/auth/me", headers={"Authorization": f"Bearer {token}"}
    )
    assert admin_read.status_code == 200


@pytest.mark.asyncio
async def test_suspended_accounts_existing_token_is_refused(
    client: AsyncClient,
    account2: Account,
    character2: Character,
    praxis_solo: Praxis,
    auth_headers2: dict,
    db_session: AsyncSession,
):
    assert (await client.get("/auth/me", headers=auth_headers2)).status_code == 200
    account2.status = AccountStatus.suspended
    await db_session.commit()

    me = await client.get("/auth/me", headers=auth_headers2)
    vote = await client.post(
        f"/praxes/{praxis_solo.id}/vote", json={"value": 3}, headers=auth_headers2
    )

    assert me.status_code == 401
    assert vote.status_code == 401
    assert await db_session.scalar(select(func.count()).select_from(Vote)) == 0


@pytest.mark.asyncio
async def test_banned_character_cannot_write(
    client: AsyncClient,
    character: Character,
    character2: Character,
    active_task: Task,
    auth_headers: dict,
    db_session: AsyncSession,
):
    other_praxis = await make_solo_praxis(db_session, active_task, character2)
    character.status = CharacterStatus.banned
    await db_session.commit()
    praxes_before = await db_session.scalar(select(func.count()).select_from(Praxis))

    vote = await client.post(
        f"/praxes/{other_praxis.id}/vote", json={"value": 3}, headers=auth_headers
    )
    praxis = await client.post(
        "/praxes", json={"task_id": active_task.id}, headers=auth_headers
    )
    comment = await client.post(
        f"/praxes/{other_praxis.id}/comments",
        json={"body_text": "hello"},
        headers=auth_headers,
    )

    assert [vote.status_code, praxis.status_code, comment.status_code] == [403] * 3
    assert await db_session.scalar(select(func.count()).select_from(Vote)) == 0
    assert await db_session.scalar(select(func.count()).select_from(Comment)) == 0
    praxes_after = await db_session.scalar(select(func.count()).select_from(Praxis))
    assert praxes_after == praxes_before


@pytest.mark.parametrize(
    "environment,secure",
    [("production", True), ("development", False)],
)
def test_session_cookie_flags(monkeypatch, environment: str, secure: bool):
    monkeypatch.setattr(settings, "ENVIRONMENT", environment)
    response = Response()

    _set_session_cookie(response, 1)

    flags = response.headers["set-cookie"].lower()
    assert flags.startswith("access_token=")
    assert "httponly" in flags
    assert "samesite=lax" in flags
    assert ("secure" in flags.replace("samesite", "")) is secure
