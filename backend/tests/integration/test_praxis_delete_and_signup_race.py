"""Two production bugs that both came down to "the database was not asked to help".

**Dropping a task.** Every FK into ``praxis.id`` was NO ACTION, so
``DELETE /praxes/{id}`` failed the moment anything hung off the praxis — in two
different ways depending on whether the session had the child loaded. Both are
covered here in one delete, because a fix for one does not imply the other:

* ``media_item`` is eagerly loaded by ``get_praxis`` for the detail view and has
  no ``delete-orphan`` cascade, so SQLAlchemy tried to *de-associate* it —
  ``UPDATE media_item SET praxis_id = NULL`` into a NOT NULL column. This is the
  reported bug: a raw asyncpg not-null violation shown to the player, and the
  drop silently not happening.
* ``vote`` is ``lazy='raise'`` and never loaded, so Postgres refused the parent
  DELETE outright with a foreign-key violation.

**Signing up twice.** The "already an active member of this task" gate is a read
followed by a write with nothing in the schema behind it. In production one tap
on a phone fired four requests 2–100ms apart and created four praxes on one task,
because all four ran the check before any of them committed.
"""

import io

import pytest
from httpx import AsyncClient
from PIL import Image
from sqlalchemy import func, select, text
from sqlalchemy.ext.asyncio import AsyncSession

from models.account import Account
from models.character import Character
from models.praxis import MediaItem, Praxis
from models.task import Task
from models.vote import Vote
from services import media as media_service
from services.praxis import _SIGNUP_LOCK_NAMESPACE


@pytest.fixture(autouse=True)
def media_root(tmp_path, monkeypatch):
    """Point the media pipeline at a throwaway directory."""
    monkeypatch.setattr(media_service.settings, "MEDIA_ROOT", str(tmp_path))
    return tmp_path


def _jpeg_bytes() -> bytes:
    image = Image.new("RGB", (16, 16), color=(10, 120, 200))
    buffer = io.BytesIO()
    image.save(buffer, format="JPEG")
    return buffer.getvalue()


@pytest.mark.asyncio
async def test_drop_a_task_that_has_media_and_a_vote_on_it(
    client: AsyncClient,
    character: Character,
    account: Account,
    active_task: Task,
    auth_headers: dict,
    db_session: AsyncSession,
):
    """The praxis and both kinds of child row go, and the player gets a 204."""
    create_response = await client.post(
        "/praxes",
        json={"task_id": active_task.id, "type": "solo", "title": "Drop me"},
        headers=auth_headers,
    )
    assert create_response.status_code == 201, create_response.text
    praxis_id = create_response.json()["id"]

    # The loaded-child failure mode: media, through the real upload route.
    upload_response = await client.post(
        f"/praxes/{praxis_id}/media",
        files={"file": ("IMG_0951.jpg", _jpeg_bytes(), "image/jpeg")},
        headers=auth_headers,
    )
    assert upload_response.status_code == 201, upload_response.text

    # The unloaded-child failure mode. Written straight to the session rather
    # than through the vote service, which would first require submitting the
    # praxis — and a submitted praxis cannot be dropped at all. Unsubmitting
    # preserves votes, so this state is reachable in the app.
    db_session.add(
        Vote(
            praxis_id=praxis_id,
            voter_character_id=character.id,
            voter_account_id=account.id,
            value=3,
        )
    )
    await db_session.flush()

    delete_response = await client.delete(f"/praxes/{praxis_id}", headers=auth_headers)
    assert delete_response.status_code == 204, delete_response.text

    assert await db_session.get(Praxis, praxis_id) is None
    assert await db_session.scalar(
        select(func.count()).select_from(MediaItem).where(MediaItem.praxis_id == praxis_id)
    ) == 0
    assert await db_session.scalar(
        select(func.count()).select_from(Vote).where(Vote.praxis_id == praxis_id)
    ) == 0


@pytest.mark.asyncio
async def test_signing_up_holds_a_lock_keyed_on_the_character(
    client: AsyncClient,
    character: Character,
    character2: Character,
    active_task: Task,
    auth_headers: dict,
    db_connection,
):
    """A signup takes the advisory lock for its transaction, keyed on the character.

    What this asserts is that the lock is *taken* and *correctly keyed* — that
    a second signup by this character would have to wait, and that a signup by
    anyone else would not. It deliberately does not assert that Postgres blocks
    on a held lock; that is Postgres's job, not this codebase's.

    A genuinely concurrent version is not possible here: the whole suite shares
    one connection inside one transaction (see ``conftest``), and advisory locks
    are re-entrant within a transaction, so two "concurrent" signups would both
    sail through and prove nothing.
    """
    response = await client.post(
        "/praxes",
        json={"task_id": active_task.id, "type": "solo", "title": "Lock me"},
        headers=auth_headers,
    )
    assert response.status_code == 201, response.text

    # `pg_try_advisory_xact_lock` never waits: False means someone else holds it.
    probe = text("SELECT pg_try_advisory_xact_lock(:namespace, :key)")

    async with db_connection.engine.connect() as other_connection:
        held_by_signup = await other_connection.scalar(
            probe, {"namespace": _SIGNUP_LOCK_NAMESPACE, "key": character.id}
        )
        assert held_by_signup is False, (
            "create_praxis did not hold the signup lock — concurrent signups can "
            "each read 'not yet a member' and each insert one"
        )

        free_for_others = await other_connection.scalar(
            probe, {"namespace": _SIGNUP_LOCK_NAMESPACE, "key": character2.id}
        )
        assert free_for_others is True, (
            "the lock is not keyed on the character — one player signing up "
            "would serialise every other player's signups too"
        )
