"""The population dial: overlay, admin API, mod log, feed and cache stamp (#3656)."""
from datetime import datetime, timedelta, timezone

import pytest
from fastapi import HTTPException
from sqlalchemy import select

from errors import ErrorCode
from game_config import CURRENT_ERA, ERA_1, era_config_for_key
from models.mod_action import ModAction
from models.population_dial import PopulationDial
from services.collab_consensus import _check_post_cooldown
from services.era import commit_and_bind_live_era, overlay_population_dials
from services.era_gates import may_comment, may_create_duel, vote_lock_reason
from tests.integration.factories import make_admin

SMALL = {
    "praxis_post_cooldown_hours": 0,
    "vote_requires_received_vote": False,
    "comment_level_required": 1,
    "duel_level_required": 1,
    "invitation_task_threshold": 1,
    "invitation_point_threshold": 10,
    "flag_level_required": 2,
}
FULL = {name: getattr(ERA_1, name) for name in SMALL}


def live():
    return {name: getattr(CURRENT_ERA, name) for name in SMALL}


@pytest.mark.asyncio
async def test_no_rows_means_the_declared_small_default_and_era_1_is_untouched(db_session):
    await overlay_population_dials(db_session)
    assert live() == SMALL
    assert {name: getattr(ERA_1, name) for name in SMALL} == FULL


@pytest.mark.asyncio
async def test_a_rollover_rebind_keeps_the_side(db_session, account):
    db_session.add(
        PopulationDial(dial_key="duel_level", side="full", updated_by_id=account.id)
    )
    await db_session.commit()
    await commit_and_bind_live_era(db_session, era_config_for_key("era_1"))
    assert CURRENT_ERA.duel_level_required == 2
    assert CURRENT_ERA.comment_level_required == 1


@pytest.mark.asyncio
async def test_put_flips_logs_posts_one_feed_item_and_bumps_the_revision(
    client, db_session, account, character, auth_headers
):
    await make_admin(db_session, account)
    await overlay_population_dials(db_session)
    assert (await client.get("/game-config")).json()["rules_revision"] == 0

    response = await client.put(
        "/admin/small-world",
        json={"duel_level": "full", "comment_level": "full", "flag_level": "small"},
        headers=auth_headers,
    )
    assert response.status_code == 200, response.text
    by_key = {dial["dial_key"]: dial for dial in response.json()}
    assert by_key["duel_level"]["side"] == "full"
    assert by_key["duel_level"]["is_default"] is False
    assert by_key["flag_level"]["is_default"] is True
    assert by_key["duel_level"]["updated_by"] == character.display_name
    assert by_key["duel_level"]["small"] == {"duel_level_required": 1}
    assert CURRENT_ERA.duel_level_required == 2
    assert CURRENT_ERA.comment_level_required == 2
    assert CURRENT_ERA.flag_level_required == 2

    rows = (
        (await db_session.execute(select(ModAction).order_by(ModAction.id)))
        .scalars()
        .all()
    )
    assert [(row.action, row.target_type, row.detail) for row in rows] == [
        ("small_world_off", "era", "duel_level"),
        ("small_world_off", "era", "comment_level"),
    ]

    feed = (
        await client.get("/activity-feed", params={"limit": 100}, headers=auth_headers)
    ).json()["items"]
    items = [item for item in feed if item["type"] == "rules_change"]
    assert len(items) == 1
    assert {(c["dial_key"], c["side"]) for c in items[0]["payload"]["changes"]} == {
        ("duel_level", "full"),
        ("comment_level", "full"),
    }

    after = (await client.get("/game-config")).json()["rules_revision"]
    assert after > 0
    me = await client.get("/auth/me", headers=auth_headers)
    assert me.json()["rules_revision"] == after

    again = await client.put(
        "/admin/small-world", json={"duel_level": "small"}, headers=auth_headers
    )
    assert again.status_code == 200
    assert CURRENT_ERA.duel_level_required == 1
    assert (await client.get("/game-config")).json()["rules_revision"] > after


@pytest.mark.asyncio
async def test_put_is_admin_only_and_rejects_unknown_keys(
    client, db_session, account, auth_headers
):
    denied = await client.put(
        "/admin/small-world", json={"duel_level": "full"}, headers=auth_headers
    )
    assert denied.status_code == 403
    assert (await client.get("/admin/small-world", headers=auth_headers)).status_code == 403

    await make_admin(db_session, account)
    bad = await client.put("/admin/small-world", json={"nope": "full"}, headers=auth_headers)
    assert bad.status_code == 422
    assert bad.json()["detail"]["code"] == ErrorCode.population_dial_unknown.value
    huge = await client.put(
        "/admin/small-world", json={"duel_level": "huge"}, headers=auth_headers
    )
    assert huge.status_code == 422


@pytest.mark.asyncio
async def test_an_unchanged_dial_writes_nothing(client, db_session, account, auth_headers):
    await make_admin(db_session, account)
    await client.put("/admin/small-world", json={"duel_level": "small"}, headers=auth_headers)
    assert (await db_session.execute(select(PopulationDial))).first() is None
    assert (await db_session.execute(select(ModAction))).first() is None


@pytest.mark.asyncio
async def test_each_rule_loosens_in_its_service_on_small_and_tightens_on_full(db_session):
    now = datetime.now(timezone.utc)

    class Poster:
        last_praxis_posted_at = now - timedelta(minutes=1)

    await overlay_population_dials(db_session)
    _check_post_cooldown(Poster(), now, CURRENT_ERA)
    assert may_comment(1, None, False) and may_create_duel(1, None, False)
    assert vote_lock_reason(1, False, False) is None
    assert CURRENT_ERA.invitation_task_threshold == 1
    assert CURRENT_ERA.flag_level_required == 2

    assert not may_comment(1, None, False, ERA_1)
    assert not may_create_duel(1, None, False, ERA_1)
    assert vote_lock_reason(1, False, False, ERA_1) == "no_received_vote"
    with pytest.raises(HTTPException):
        _check_post_cooldown(Poster(), now, ERA_1)
