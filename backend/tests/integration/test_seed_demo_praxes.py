"""The per-faction demo praxis site seals its rows correctly (#2846).

`seed_demo_praxes.seed`'s per-faction loop used to create `status=submitted`
rows with a NULL `submitted_at` — the one creation site in this file that
didn't match its three siblings. `services.praxis.list_praxes` documents and
enforces the invariant `status == submitted -> submitted_at IS NOT NULL`
(established by `collab_consensus._apply_seal`) and drops any row that
violates it, so those six rows were silently invisible in the `/praxis` feed
and on the author's profile even though the script printed them as created.

The seam under test is `services.praxis.list_praxes` — the real production
read path both surfaces share — fed by `scripts.seed_demo_praxes.seed`, not a
private inspection of ORM attributes. That is what actually caught the
original defect: a row can carry a correct-looking `status` and still never
render.
"""

import pytest
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

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
    """Every era faction plus one task per faction `seed()` needs.

    Covers both the per-faction `DEMOS` slugs and the score-fixture slugs
    (`fixture_faction_slugs`, which `seed()` also drives) — for Era 1 the
    latter is already a subset of the former, but the union keeps this board
    correct if that ever stops being true.
    """
    for slug in era.factions:
        existing = (
            await db_session.execute(select(Faction).where(Faction.slug == slug))
        ).scalar_one_or_none()
        if existing is None:
            db_session.add(Faction(slug=slug, status=FactionStatus.visible))
    await db_session.flush()
    for slug in set(DEMOS) | set(fixture_faction_slugs(era)):
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
    """Every DEMOS faction's row is returned by the real submitted-feed query.

    This is the seam the original bug hid behind: the row existed with
    status=submitted, but `list_praxes` — the query the `/praxis` feed and the
    profile grid both call — filtered it out for a NULL `submitted_at`.
    """
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
    """A freshly seeded row is shaped like one `_apply_seal` would produce."""
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
    """A dev DB already holding the pre-#2846 corrupt shape gets repaired, not skipped.

    The `if already: continue` title check would otherwise skip a row exactly
    like this forever, leaving a re-run silent about a database that is still
    broken.
    """
    await _board(db_session, character)
    # Seed once normally so players/tasks/other fixtures exist, then hand-roll
    # a corrupt row in the exact pre-fix shape for one faction and delete the
    # correct sibling so the repair path is what puts it back.
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

    # Confirm the corrupt fixture is actually invisible before the repair —
    # otherwise this test would pass for a reason unrelated to the repair.
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
    """The self-check fails loudly rather than letting seed() report success.

    Exercises the guard directly against a hand-rolled violation, independent
    of whether any current creation site can still produce one — this is the
    check that is supposed to catch a *future* site that forgets.
    """
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
        # submitted_at deliberately left NULL — the violation under test.
    ))
    await db_session.flush()

    # `_repair_corrupt_submitted` would also fix this row — it's the same
    # corrupt shape — so the guard is exercised directly, un-repaired, to
    # prove it is a real backstop and not merely unreachable dead code.
    with pytest.raises(RuntimeError, match="submitted_at"):
        await _assert_no_corrupt_submitted(db_session)

    # And the repair pass really does clear the violation it was asked to
    # detect, confirming the two halves (repair, verify) agree on the shape.
    repaired = await _repair_corrupt_submitted(db_session)
    assert repaired == 1
    await _assert_no_corrupt_submitted(db_session)  # no longer raises
