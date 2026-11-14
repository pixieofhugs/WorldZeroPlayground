"""Praxis byline payload (#888, #2106).

Both wire models carry ``created_by_avatar_url`` as a plain string; no portrait
is "" so the frontend draws the shared monogram rather than handling null.
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
from tests.integration.factories import DEFAULT_FACTION_SLUG


async def _make_solo_praxis(session: AsyncSession, author: Character) -> Praxis:
    task = Task(
        title="a task",
        description="proof",
        point_value=10,
        level_required=0,
        status=TaskStatus.active,
        created_by=author.id,
        primary_faction_slug=DEFAULT_FACTION_SLUG,
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
@pytest.mark.parametrize("loader", [_load_card, _load_detail])
@pytest.mark.parametrize("portrait", ["avatars/isolde.png", ""])
async def test_byline_carries_the_authors_portrait_or_an_empty_string(
    db_session: AsyncSession,
    era: Era,
    some_faction: Faction,
    character: Character,
    loader,
    portrait: str,
):
    """``Character.avatar_url`` is NOT NULL, default "": carry it, no placeholder
    (#2106: the detail byline shows a face too)."""
    character.avatar_url = portrait
    praxis = await _make_solo_praxis(db_session, character)

    out = await loader(db_session, praxis.id)

    assert out.created_by_avatar_url == portrait
    assert out.created_by_display_name == character.display_name
