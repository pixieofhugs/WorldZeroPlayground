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
    """Every era faction, plus one task per faction the **era** carries.

    The board is derived from `era` alone — every joinable slug
    (`real_faction_slugs`) plus the score-fixture slugs
    (`fixture_faction_slugs`, which `seed()` also drives). `DEMOS` is
    deliberately *not* an input, for two reasons:

    * the coverage guard below would otherwise be fed by the very dict it is
      checking — a faction `DEMOS` has forgotten would also be missing from the
      board, so the guard would fail on a missing task rather than on the
      missing praxis it is actually about;
    * it makes `_board(..., ERA_2)` the board a dev database under that era
      would really have, which is the only way to exercise the skip path a
      `DEMOS` key the era dropped has to take (#2710).
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


def test_demos_covers_every_joinable_faction_the_live_era_declares():
    """The seed's own stated promise, as arithmetic (#2895).

    `DEMOS` exists so "every per-faction praxis card archetype has something to
    render" — its own comment. Coven fell out of that silently: #2710 de-pinned
    the collab fixture from `coven` to `fixture_faction_slugs(era)[2]`, which
    for Era 1 is `wow`, a faction `DEMOS` already covered. Nothing crashed, and
    nothing read as six-versus-seven anywhere a reader would look.

    Derived on both sides, never a literal list and never a count: the ceiling
    is whatever the live era declares joinable, which is `real_faction_slugs`
    (ADR-0087 — `na` and `albescent` are structural sentinels, never fixture
    skins), and it moves when the era does. Needs no database on purpose, so
    the day a future era adds a faction the seed does not cover, this fails
    rather than the gap being noticed months later in dev.
    """
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
    """The behavioural half of the same guard, at the real read path.

    `list_praxes(status=submitted)` is what the `/praxis` feed and the author
    profile both call, and `faction=[slug]` is the facet those surfaces send —
    a praxis has no faction of its own, it inherits the linked task's. So this
    asks the production question ("open the Coven filter; is anything there?")
    rather than counting rows the script believes it wrote.

    Distinct from the pure check above rather than redundant with it: that one
    proves the dict is complete, this one proves a complete dict still reaches
    the feed. #2846's defect passed the first and failed the second.
    """
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
    """#2710's crash class, exercised rather than guarded against twice.

    `DEMOS` names factions; an era decides which of them exist. Era 2 carries
    neither `coven` nor `ua`, and the seed's answer to that is already written
    — no task on the board for that slug, so the loop prints a skip and moves
    on. Nothing new is needed for the `coven` entry #2895 adds; what is needed
    is a test that the existing path really is the one it takes, because the
    last time a fixture named a faction an era had dropped it was a `KeyError`
    on a fresh dev database, not a skipped line.

    The board here is Era 2's own, so the `DEMOS` keys it dropped genuinely
    have nothing to point at. The era is passed explicitly; `CURRENT_ERA` is
    untouched.
    """
    dropped = [slug for slug in DEMOS if slug not in ERA_2.factions]
    assert dropped, "ERA_2 carries every DEMOS faction — this proves nothing"

    await _board(db_session, character, ERA_2)
    await seed(db_session, ERA_2)

    printed = capsys.readouterr().out
    for slug in dropped:
        assert f"! {slug}: no task on the board" in printed

    # The factions Era 2 *does* carry still reach the feed, so the skip is a
    # skip and not a bail-out part-way through the loop.
    for slug in real_faction_slugs(ERA_2):
        visible = await list_praxes(
            db_session, status=PraxisStatus.submitted, faction=[slug]
        )
        assert visible, f"{slug!r} renders nothing under its own era"
