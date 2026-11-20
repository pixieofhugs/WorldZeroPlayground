"""Admin follow-ups: bulk-remove note, new mod-log rows, votes_cast (#3697, #3706)."""
from datetime import timedelta

import pytest
from sqlalchemy import select

from models.contact import ContactMessage
from models.mod_action import ModAction
from models.praxis import ModerationStatus, Praxis
from models.vote import Vote
from services.era import get_current_era_row
from tests.integration.factories import (
    make_admin,
    make_character,
    make_solo_praxis,
    make_task,
)

CSV = b"Name,Faction,Description,Level,Points\nBrand new,,d,1,5\n"


async def _notes(session, ids):
    session.expire_all()
    rows = await session.execute(select(Praxis).where(Praxis.id.in_(ids)))
    return {p.id: p.admin_note for p in rows.scalars()}


@pytest.mark.asyncio
async def test_bulk_remove_carries_the_note_and_keeps_an_old_one_when_none(
    client, account, character, character2, auth_headers, auth_headers2, db_session
):
    await make_admin(db_session, account)
    ids = []
    for title in ("one", "two"):
        task = await make_task(db_session, character, title=title, commit=True)
        created = await client.post(
            "/praxes", json={"task_id": task.id, "title": title}, headers=auth_headers
        )
        ids.append(created.json()["id"])
        await client.post(
            f"/praxes/{ids[-1]}/flag", json={"reason": "spam"}, headers=auth_headers2
        )
    (await db_session.get(Praxis, ids[0])).admin_note = "earlier reason"
    await db_session.commit()

    url = f"/admin/characters/{character.id}/praxes/remove-flagged"
    assert (await client.post(url, headers=auth_headers)).json() == {"removed": 2}
    assert await _notes(db_session, ids) == {ids[0]: "earlier reason", ids[1]: ""}

    for i in ids:
        (await db_session.get(Praxis, i)).moderation_status = ModerationStatus.flagged
    await db_session.commit()
    await client.post(url, json={"note": "off topic"}, headers=auth_headers)
    assert set((await _notes(db_session, ids)).values()) == {"off topic"}


@pytest.mark.asyncio
async def test_stats_edit_message_archive_and_import_are_logged_in_their_kinds(
    client, account, character, character2, auth_headers, db_session
):
    await make_admin(db_session, account)
    msg = ContactMessage(name="T", email="t@t.com", message="hi")
    db_session.add(msg)
    await db_session.commit()

    await client.patch(
        f"/admin/characters/{character2.id}/stats",
        json={"score": 5},
        headers=auth_headers,
    )
    await client.patch(f"/admin/messages/{msg.id}/archive", headers=auth_headers)
    imported = await client.post(
        "/admin/tasks/import-csv",
        files={"file": ("t.csv", CSV, "text/csv")},
        headers=auth_headers,
    )
    assert imported.status_code == 201, imported.text

    logged = await db_session.execute(select(ModAction).order_by(ModAction.id))
    rows = logged.scalars()
    assert [(r.action, r.target_type) for r in rows] == [
        ("stats_edit", "character"),
        ("message_archive", "message"),
        ("task_import", "task"),
    ]

    async def actions(kind):
        response = await client.get(f"/admin/mod-log?kind={kind}", headers=auth_headers)
        page = response.json()
        return {i["action"] for i in page["items"]}

    assert await actions("people") == {"stats_edit", "message_archive"}
    assert await actions("tasks") == {"task_import"}


@pytest.mark.asyncio
async def test_votes_cast_counts_this_era_only_and_a_departed_life_is_absent(
    client, account, character, character2, era, active_task, auth_headers, db_session
):
    await make_admin(db_session, account)
    other = await make_task(db_session, character, title="second")
    praxes = [
        await make_solo_praxis(db_session, active_task, character),
        await make_solo_praxis(db_session, other, character),
    ]
    started = (await get_current_era_row(db_session)).started_at
    for praxis, when in zip(
        praxes, (started + timedelta(minutes=1), started - timedelta(days=1))
    ):
        db_session.add(
            Vote(
                praxis_id=praxis.id,
                voter_character_id=character2.id,
                voter_account_id=character2.account_id,
                value=3,
                era_id=era.id,
                created_at=when,
            )
        )
        await db_session.flush()
    gone = await make_character(db_session, era, username="gone_v")
    gone.departed_at = started
    await db_session.commit()

    listed = await client.get("/admin/characters", headers=auth_headers)
    rows = {r["id"]: r for r in listed.json()}
    assert rows[character2.id]["votes_cast"] == 1
    assert gone.id not in rows
