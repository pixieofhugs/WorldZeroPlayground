"""``GET /admin/eras/{key}/preflight``: counts what the roll does, writes nothing."""
import dataclasses

from httpx import AsyncClient
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

import game_config
import services.admin_service as admin_service
from faction_slugs import real_faction_slugs
from game_config import era_config_for_key
from models.account import Account
from models.character import CharacterStatus
from models.comment import Comment
from models.duel import Duel, DuelStatus
from models.era import Era
from models.faction import Faction
from models.mod_action import ModAction
from models.praxis import ModerationStatus
from models.task import Task, TaskStatus
from seed import ONBOARDING_TASK_SEED_KEY
from tests.integration.factories import (
    DEFAULT_FACTION_SLUG,
    make_admin,
    make_character,
    make_duel,
    make_solo_praxis,
    make_task,
)

NEXT = "era_2"


async def _preflight(client: AsyncClient, headers: dict) -> dict:
    resp = await client.get(f"/admin/eras/{NEXT}/preflight", headers=headers)
    assert resp.status_code == 200, resp.text
    return resp.json()


async def _row_counts(session: AsyncSession) -> list[int]:
    return [
        await session.scalar(select(func.count()).select_from(model))
        for model in (Era, Duel, Task, Faction, ModAction)
    ]


async def test_counts_each_thing_the_roll_touches(
    client, db_session, account: Account, auth_headers, era, some_faction
):
    await make_admin(db_session, account)
    next_era = era_config_for_key(NEXT)
    leaving_slug = next(
        slug
        for slug in real_faction_slugs(game_config.CURRENT_ERA)
        if slug not in next_era.factions and slug != DEFAULT_FACTION_SLUG
    )
    stayer = await make_character(db_session, era, username="stay", account=account)
    await make_character(db_session, era, username="gone1", faction_slug=leaving_slug)
    await make_character(db_session, era, username="gone2", faction_slug=leaving_slug)
    await make_character(
        db_session, era, username="banned", status=CharacterStatus.banned
    )
    await make_duel(db_session, era, label="a", status=DuelStatus.active)
    await make_duel(db_session, era, label="b", status=DuelStatus.settled)
    await make_duel(db_session, era, label="c", status=DuelStatus.pending)
    await make_task(db_session, stayer, title="live one")
    await make_task(db_session, stayer, title="gone", status=TaskStatus.deleted)
    onboarding = await make_task(db_session, stayer, title="onboarding")
    onboarding.seed_key = ONBOARDING_TASK_SEED_KEY
    flagged_task = await make_task(db_session, stayer, title="flag target")
    await make_solo_praxis(
        db_session, flagged_task, stayer, moderation_status=ModerationStatus.flagged
    )
    db_session.add(
        Comment(
            praxis_id=None, task_id=flagged_task.id, created_by_id=stayer.id,
            body_text="x", moderation_status=ModerationStatus.flagged,
        )
    )
    await db_session.commit()

    body = await _preflight(client, auth_headers)

    live_characters = await db_session.scalar(
        select(func.count()).select_from(admin_service.Character).where(
            admin_service.Character.status != CharacterStatus.banned
        )
    )
    assert body["name"] == next_era.name
    assert body["characters_reset"] >= live_characters
    assert body["duels_frozen"] == 2
    assert body["duels_awaiting_answer"] == 1
    retirable = await db_session.scalar(
        select(func.count()).select_from(Task).where(
            Task.status.notin_([TaskStatus.retired, TaskStatus.deleted]),
            Task.seed_key.is_distinct_from(ONBOARDING_TASK_SEED_KEY),
        )
    )
    assert body["tasks_retired"] == retirable and retirable > 0
    assert body["tasks_arriving"] == len(next_era.tasks)
    assert {"slug": leaving_slug, "characters": 2} in body["leaving_factions"]
    assert body["open_reports"] == 2


async def test_no_tasks_arriving_when_the_next_era_has_none(
    client, db_session, account: Account, auth_headers, era, some_faction, monkeypatch
):
    await make_admin(db_session, account)
    bare = dataclasses.replace(era_config_for_key(NEXT), tasks=(), reactivate_tasks=())
    monkeypatch.setattr(admin_service, "era_config_for_key", lambda key: bare)

    assert (await _preflight(client, auth_headers))["tasks_arriving"] == 0


async def test_preflight_writes_nothing(
    client, db_session, account: Account, auth_headers, era, some_faction
):
    await make_admin(db_session, account)
    await make_duel(db_session, era, label="w", status=DuelStatus.active)
    await db_session.commit()
    before = await _row_counts(db_session)
    live_before = (await db_session.execute(select(Task.status))).scalars().all()

    await _preflight(client, auth_headers)

    db_session.expire_all()
    assert await _row_counts(db_session) == before
    statuses = (await db_session.execute(select(Task.status))).scalars().all()
    assert statuses == live_before
    duel = (await db_session.execute(select(Duel))).scalars().first()
    assert duel.status == DuelStatus.active


async def test_unknown_era_is_422_and_non_admin_is_refused(
    client, db_session, account: Account, auth_headers, era, some_faction
):
    resp = await client.get(f"/admin/eras/{NEXT}/preflight", headers=auth_headers)
    assert resp.status_code in (401, 403)
    await make_admin(db_session, account)
    resp = await client.get("/admin/eras/nope/preflight", headers=auth_headers)
    assert resp.status_code == 422
