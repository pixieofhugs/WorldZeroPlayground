"""Seeded demo praxes satisfy `submitted -> submitted_at IS NOT NULL` (#2846).

Asserted through `list_praxes`, which drops violating rows; a correct-looking
`status` alone can still never render.
"""

import pytest
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from eras.era_2 import ERA_2
from faction_slugs import real_faction_slugs
from game_config import CURRENT_ERA, EraConfig
from models.character import Character
from models.era import Era
from models.faction import Faction, FactionStatus
from models.praxis import Praxis, PraxisMember, PraxisStatus
from models.task import Task, TaskStatus, TaskType
from scripts.seed_demo_praxes import (
    DEMOS,
    TITLE_MARKER,
    fixture_faction_slugs,
    seed,
)
from services.praxis import list_praxes


async def _board(
    db_session: AsyncSession, author: Character, era: EraConfig = CURRENT_ERA
) -> None:
    """One task per faction the era carries. Derived from `era`, never `DEMOS`:
    the coverage guard must not be fed by the dict it checks, and ERA_2's board
    must lack the slugs it dropped (#2710).
    """
    for slug in era.factions:
        existing = (
            await db_session.execute(select(Faction).where(Faction.slug == slug))
        ).scalar_one_or_none()
        if existing is None:
            db_session.add(Faction(slug=slug, status=FactionStatus.visible))
    await db_session.flush()
    for slug in set(real_faction_slugs(era)) | set(fixture_faction_slugs(era)):
        db_session.add(Task(
            title=f"Board task ({slug})",
            description="fixture",
            point_value=100,
            level_required=0,
            status=TaskStatus.active,
            task_type=TaskType.standard,
            created_by_id=author.id,
            primary_faction_slug=slug,
        ))
    await db_session.flush()


@pytest.mark.asyncio
async def test_seeded_demo_praxes_are_visible_via_list_praxes(
    db_session: AsyncSession,
    era: Era,
    character: Character,
):
    await _board(db_session, character)
    await seed(db_session, CURRENT_ERA)

    results = await list_praxes(db_session, status=PraxisStatus.submitted)
    titles = {p.title for p in results}
    for _author, title, *_ in DEMOS.values():
        assert TITLE_MARKER + title in titles


@pytest.mark.asyncio
async def test_seeded_demo_praxis_and_member_carry_submitted_at(
    db_session: AsyncSession,
    era: Era,
    character: Character,
):
    await _board(db_session, character)
    await seed(db_session, CURRENT_ERA)

    author_username, title, *_ = DEMOS["ua"]
    praxis = (
        await db_session.execute(
            select(Praxis).where(Praxis.title == TITLE_MARKER + title)
        )
    ).scalar_one()
    assert praxis.submitted_at is not None

    member = (
        await db_session.execute(
            select(PraxisMember).where(PraxisMember.praxis_id == praxis.id)
        )
    ).scalar_one()
    assert member.has_approved is True
    assert member.approved_at is not None


def test_demos_covers_every_joinable_faction_the_live_era_declares():
    """#2895. Derived from `real_faction_slugs` (ADR-0087), never a literal."""
    missing = [slug for slug in real_faction_slugs(CURRENT_ERA) if slug not in DEMOS]
    assert not missing, (
        f"{CURRENT_ERA.config_key} declares {missing} joinable and DEMOS has no "
        f"entry for them, so their praxis card archetype has nothing to render "
        f"on a seeded dev database (#2895). Add an entry per slug — and a demo "
        f"player to author it, appended to the END of PLAYERS."
    )


@pytest.mark.asyncio
async def test_every_joinable_faction_has_a_praxis_in_the_submitted_feed(
    db_session: AsyncSession,
    era: Era,
    character: Character,
):
    """A complete dict must still reach the feed (#2846 passed the check above)."""
    await _board(db_session, character)
    await seed(db_session, CURRENT_ERA)

    for slug in real_faction_slugs(CURRENT_ERA):
        visible = await list_praxes(
            db_session, status=PraxisStatus.submitted, faction=[slug]
        )
        assert visible, (
            f"no submitted praxis renders for {slug!r}, so that faction's "
            f"praxis card archetype cannot be seen on a seeded dev DB (#2895)"
        )


@pytest.mark.asyncio
async def test_a_demos_faction_the_era_dropped_is_skipped_not_crashed(
    db_session: AsyncSession,
    era: Era,
    character: Character,
    capsys,
):
    """#2710: a `DEMOS` slug the era dropped was once a `KeyError`."""
    dropped = [slug for slug in DEMOS if slug not in ERA_2.factions]
    assert dropped, "ERA_2 carries every DEMOS faction — this proves nothing"

    await _board(db_session, character, ERA_2)
    await seed(db_session, ERA_2)

    printed = capsys.readouterr().out
    for slug in dropped:
        assert f"! {slug}: no task on the board" in printed

    # A skip, not a bail-out.
    for slug in real_faction_slugs(ERA_2):
        visible = await list_praxes(
            db_session, status=PraxisStatus.submitted, faction=[slug]
        )
        assert visible, f"{slug!r} renders nothing under its own era"
