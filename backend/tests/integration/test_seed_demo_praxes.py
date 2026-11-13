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
from models.praxis import ModerationStatus, Praxis, PraxisMember, PraxisStatus
from models.task import Task, TaskStatus, TaskType
from scripts.seed_demo_praxes import (
    DEMOS,
    TITLE_MARKER,
    _assert_no_corrupt_submitted,
    _repair_corrupt_submitted,
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
            created_by=author.id,
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
    assert member.has_submitted is True
    assert member.submitted_at is not None


@pytest.mark.asyncio
async def test_reseeding_repairs_a_preexisting_corrupt_row(
    db_session: AsyncSession,
    era: Era,
    character: Character,
):
    """The `if already: continue` title check would otherwise skip it forever."""
    await _board(db_session, character)
    await seed(db_session, CURRENT_ERA)

    author_username, title, *_ = DEMOS["everymen"]
    marked_title = TITLE_MARKER + title
    praxis = (
        await db_session.execute(select(Praxis).where(Praxis.title == marked_title))
    ).scalar_one()
    praxis.status = PraxisStatus.submitted
    praxis.submitted_at = None
    member = (
        await db_session.execute(
            select(PraxisMember).where(PraxisMember.praxis_id == praxis.id)
        )
    ).scalar_one()
    member.submitted_at = None
    await db_session.commit()

    # Premise: invisible before the repair.
    invisible = await list_praxes(db_session, status=PraxisStatus.submitted)
    assert marked_title not in {p.title for p in invisible}

    await seed(db_session, CURRENT_ERA)

    await db_session.refresh(praxis)
    await db_session.refresh(member)
    assert praxis.submitted_at is not None
    assert member.submitted_at is not None

    visible = await list_praxes(db_session, status=PraxisStatus.submitted)
    assert marked_title in {p.title for p in visible}


@pytest.mark.asyncio
async def test_assert_no_corrupt_submitted_raises_on_a_violation(
    db_session: AsyncSession,
    era: Era,
    character: Character,
):
    """The guard is for a future creation site that forgets."""
    await _board(db_session, character)
    task = (
        await db_session.execute(
            select(Task).where(Task.primary_faction_slug == "ua")
        )
    ).scalars().first()
    db_session.add(Praxis(
        task_id=task.id,
        type=DEMOS["ua"][3],
        status=PraxisStatus.submitted,
        title=TITLE_MARKER + "a future site that forgot submitted_at",
        body_text="",
        created_by_id=character.id,
        moderation_status=ModerationStatus.visible,
        # submitted_at deliberately NULL.
    ))
    await db_session.flush()

    # Un-repaired, to prove the guard is a real backstop.
    with pytest.raises(RuntimeError, match="submitted_at"):
        await _assert_no_corrupt_submitted(db_session)

    # Repair and verify agree on the shape.
    repaired = await _repair_corrupt_submitted(db_session)
    assert repaired == 1
    await _assert_no_corrupt_submitted(db_session)


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
