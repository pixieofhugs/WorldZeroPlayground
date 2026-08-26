"""Integration tests for the praxis byline payload (#888, #2106).

The byline shows the author's portrait beside their name. Both praxis wire
models carry ``created_by_avatar_url`` for that; it is a plain string so an
author with no portrait uploaded degrades to the shared monogram avatar rather
than a null the frontend has to special-case.

``PraxisOut`` (the detail payload) originally did NOT carry the field, and this
file pinned that asymmetry. #2106 removed it: the detail byline now shows a
face, so the field is on both models and the empty-string fallback is what this
file pins instead.
"""

import pytest
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from models.character import Character
from models.era import Era
from models.faction import Faction
from models.praxis import Praxis, PraxisMember, PraxisStatus, PraxisType
from models.task import Task, TaskStatus
from services.praxis_out import build_praxis_card_out, build_praxis_out


async def _make_solo_praxis(session: AsyncSession, author: Character) -> Praxis:
    task = Task(
        title="a task",
        description="proof",
        point_value=10,
        level_required=0,
        status=TaskStatus.active,
        created_by=author.id,
        primary_faction_slug="ua",
    )
    session.add(task)
    await session.flush()
    praxis = Praxis(
        task_id=task.id,
        created_by_id=author.id,
        type=PraxisType.solo,
        status=PraxisStatus.submitted,
        title="solo",
        body_text="proof",
    )
    session.add(praxis)
    await session.flush()
    session.add(PraxisMember(praxis_id=praxis.id, character_id=author.id))
    await session.flush()
    return praxis


async def _load_card(session: AsyncSession, praxis_id: int):
    result = await session.execute(
        select(Praxis)
        .where(Praxis.id == praxis_id)
        .options(
            selectinload(Praxis.task),
            selectinload(Praxis.created_by),
            selectinload(Praxis.members),
            selectinload(Praxis.media_items),
        )
    )
    return await build_praxis_card_out(result.scalar_one(), session, viewer=None)


@pytest.mark.asyncio
async def test_card_carries_the_authors_portrait(
    db_session: AsyncSession, era: Era, some_faction: Faction, character: Character
):
    character.avatar_url = "avatars/isolde.png"
    praxis = await _make_solo_praxis(db_session, character)

    card = await _load_card(db_session, praxis.id)

    assert card.created_by_avatar_url == "avatars/isolde.png"
    assert card.created_by_display_name == character.display_name


@pytest.mark.asyncio
async def test_portraitless_author_degrades_to_empty_string(
    db_session: AsyncSession, era: Era, some_faction: Faction, character: Character
):
    """No portrait is the ordinary case.

    ``Character.avatar_url`` is NOT NULL and defaults to ``""``, so the empty
    string is what a portraitless author actually stores — the card must carry
    it through as "" rather than inventing a placeholder path.
    """
    character.avatar_url = ""
    praxis = await _make_solo_praxis(db_session, character)

    card = await _load_card(db_session, praxis.id)

    assert card.created_by_avatar_url == ""


async def _load_detail(session: AsyncSession, praxis_id: int):
    result = await session.execute(
        select(Praxis)
        .where(Praxis.id == praxis_id)
        .options(
            selectinload(Praxis.task),
            selectinload(Praxis.created_by),
            selectinload(Praxis.members),
            selectinload(Praxis.invites),
            selectinload(Praxis.media_items),
        )
    )
    return await build_praxis_out(result.scalar_one(), session, viewer=None)


@pytest.mark.asyncio
async def test_detail_payload_carries_the_authors_portrait(
    db_session: AsyncSession, era: Era, some_faction: Faction, character: Character
):
    """#2106: the detail byline shows a face, so ``PraxisOut`` carries one.

    #888 shipped the field card-only and wrote down the condition for reversing
    itself — "``PraxisOut`` gets it if the detail byline ever needs a face". It
    does now, so this test is the inverse of the asymmetry pin that stood here.
    """
    character.avatar_url = "avatars/isolde.png"
    praxis = await _make_solo_praxis(db_session, character)

    detail = await _load_detail(db_session, praxis.id)

    assert detail.created_by_avatar_url == "avatars/isolde.png"
    assert detail.created_by_display_name == character.display_name


@pytest.mark.asyncio
async def test_detail_portraitless_author_degrades_to_empty_string(
    db_session: AsyncSession, era: Era, some_faction: Faction, character: Character
):
    """Same fallback as the card: "" so the byline draws the monogram."""
    character.avatar_url = ""
    praxis = await _make_solo_praxis(db_session, character)

    detail = await _load_detail(db_session, praxis.id)

    assert detail.created_by_avatar_url == ""
