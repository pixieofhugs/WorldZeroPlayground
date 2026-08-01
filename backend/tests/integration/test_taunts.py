"""Tests for the foe-taunt write path (ADR-0068).

The seam under test is **the trigger**, not the writer: taunts are produced by
score recalculation and by the transition into ``submitted``, and delivered only
along the *recipient's* own active foe edge. So every test here drives a real
hook — ``recalculate_character_stats``, ``collab_consensus.on_submit``,
``apply_era_reset`` — and asserts on the rows that fall out.

ADR-0031: the rows carry a (faction_slug, trigger_type) reference, never prose.
ADR-0068: the activity feed is the only delivery surface; there is no /taunts.
"""
import pytest
from httpx import AsyncClient
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from models.character import Character
from models.character_stats import CharacterStats
from models.era import Era
from models.praxis import (
    ModerationStatus,
    Praxis,
    PraxisMember,
    PraxisStatus,
    PraxisType,
)
from models.relationship import Relationship, RelationshipStatus, RelationshipType
from models.task import Task
from models.taunt_message import TauntMessage, TauntTriggerType
from services.character_stats import recalculate_character_stats
from services.collab_consensus import on_submit
from services.era import apply_era_reset

# A stale score high enough that a recalc from an empty praxis set drops the
# character below a rival — the passive half of the overtake rule.
STALE_HIGH_SCORE = 900


async def _declare_foe(
    db_session: AsyncSession,
    declarer: Character,
    target: Character,
    status: RelationshipStatus = RelationshipStatus.active,
) -> Relationship:
    """``declarer`` declares ``target`` a foe — which subscribes the *declarer*
    to ``target``'s taunts (ADR-0068), not the other way round."""
    edge = Relationship(
        from_character_id=declarer.id,
        to_character_id=target.id,
        type=RelationshipType.foe,
        status=status,
    )
    db_session.add(edge)
    await db_session.flush()
    return edge


async def _seed_scored_praxis(
    db_session: AsyncSession, author: Character, task: Task, tag: str
) -> Praxis:
    """A submitted solo praxis by ``author``, worth the task's base points."""
    praxis = Praxis(
        task_id=task.id,
        created_by_id=author.id,
        type=PraxisType.solo,
        status=PraxisStatus.submitted,
        title=f"Praxis {tag}",
        body_text="proof",
    )
    db_session.add(praxis)
    await db_session.flush()
    db_session.add(PraxisMember(praxis_id=praxis.id, character_id=author.id))
    await db_session.flush()
    return praxis


async def _stats(
    db_session: AsyncSession, character: Character, era: Era
) -> CharacterStats:
    return (
        await db_session.execute(
            select(CharacterStats).where(
                CharacterStats.character_id == character.id,
                CharacterStats.era_id == era.id,
            )
        )
    ).scalar_one()


async def _set_score(
    db_session: AsyncSession, character: Character, era: Era, score: int
) -> CharacterStats:
    stats = await _stats(db_session, character, era)
    stats.score = score
    await db_session.flush()
    return stats


async def _taunts(
    db_session: AsyncSession, trigger_type: TauntTriggerType | None = None
) -> list[TauntMessage]:
    query = select(TauntMessage).order_by(TauntMessage.id)
    if trigger_type is not None:
        query = query.where(TauntMessage.trigger_type == trigger_type)
    return list((await db_session.execute(query)).scalars().all())


# ---------------------------------------------------------------------------
# score_overtake
# ---------------------------------------------------------------------------


@pytest.mark.asyncio
async def test_lead_flip_fires_once_then_again_only_when_the_lead_flips_back(
    db_session: AsyncSession,
    era: Era,
    character: Character,
    character3: Character,
    active_task: Task,
):
    """Self-deduplicating by construction: a repeat recalc of an unchanged lead
    is silent, and the pair fires again only once the lead has flipped back."""
    # Rivals — each holds a foe edge, so each is subscribed to the other.
    await _declare_foe(db_session, character3, character)
    await _declare_foe(db_session, character, character3)
    await _set_score(db_session, character3, era, 1)
    praxis = await _seed_scored_praxis(db_session, character, active_task, "flip")

    await recalculate_character_stats(character.id, db_session)
    assert (await _stats(db_session, character, era)).score > 1
    overtakes = await _taunts(db_session, TauntTriggerType.score_overtake)
    assert len(overtakes) == 1
    assert overtakes[0].from_character_id == character.id
    assert overtakes[0].to_character_id == character3.id
    # ADR-0031: a structured reference in the sender's send-time voice, no prose.
    assert overtakes[0].faction_slug == character.faction_slug
    assert not hasattr(overtakes[0], "message")

    # Nothing moved: no second taunt for the same standing lead.
    await recalculate_character_stats(character.id, db_session)
    assert len(await _taunts(db_session, TauntTriggerType.score_overtake)) == 1

    # The lead flips back — character's only scoring praxis stops counting.
    praxis.moderation_status = ModerationStatus.hidden
    await db_session.flush()
    await recalculate_character_stats(character.id, db_session)
    overtakes = await _taunts(db_session, TauntTriggerType.score_overtake)
    assert len(overtakes) == 2
    assert overtakes[1].from_character_id == character3.id
    assert overtakes[1].to_character_id == character.id

    # ...and flips again on the way back up.
    praxis.moderation_status = ModerationStatus.visible
    await db_session.flush()
    await recalculate_character_stats(character.id, db_session)
    overtakes = await _taunts(db_session, TauntTriggerType.score_overtake)
    assert len(overtakes) == 3
    assert overtakes[2].from_character_id == character.id
    assert overtakes[2].to_character_id == character3.id


@pytest.mark.asyncio
async def test_passive_flip_taunts_the_character_who_fell_behind(
    db_session: AsyncSession,
    era: Era,
    character: Character,
    character2: Character,
):
    """Falling behind is a flip too, and the sender is the rival who never
    moved and never opts in — the recipient's own declaration delivers it."""
    # character subscribes to character2 (score 500); character owns no praxes,
    # so the recalc drops a stale score below the rival's standing one.
    await _declare_foe(db_session, character, character2)
    await _set_score(db_session, character, era, STALE_HIGH_SCORE)

    await recalculate_character_stats(character.id, db_session)

    overtakes = await _taunts(db_session, TauntTriggerType.score_overtake)
    assert len(overtakes) == 1
    assert overtakes[0].from_character_id == character2.id
    assert overtakes[0].to_character_id == character.id
    assert overtakes[0].faction_slug == character2.faction_slug


@pytest.mark.asyncio
async def test_no_foe_edge_means_no_taunt(
    db_session: AsyncSession,
    era: Era,
    character: Character,
    character3: Character,
    active_task: Task,
):
    """Nobody declared anybody: the same overtake produces nothing."""
    await _set_score(db_session, character3, era, 1)
    await _seed_scored_praxis(db_session, character, active_task, "unwatched")

    await recalculate_character_stats(character.id, db_session)

    assert await _taunts(db_session) == []


@pytest.mark.asyncio
async def test_friend_edge_does_not_subscribe(
    db_session: AsyncSession,
    era: Era,
    character: Character,
    character3: Character,
    active_task: Task,
):
    """Only a *foe* declaration subscribes you — friendship is not a rivalry."""
    db_session.add(
        Relationship(
            from_character_id=character3.id,
            to_character_id=character.id,
            type=RelationshipType.friend,
            status=RelationshipStatus.active,
        )
    )
    await _set_score(db_session, character3, era, 1)
    await _seed_scored_praxis(db_session, character, active_task, "friendly")

    await recalculate_character_stats(character.id, db_session)

    assert await _taunts(db_session) == []


@pytest.mark.asyncio
@pytest.mark.parametrize("blocker_is_the_subscriber", [True, False])
async def test_a_block_on_either_edge_silences_the_pair(
    db_session: AsyncSession,
    era: Era,
    character: Character,
    character3: Character,
    active_task: Task,
    blocker_is_the_subscriber: bool,
):
    """Blocked wins (ADR-0009), whichever edge of the pair carries it."""
    if blocker_is_the_subscriber:
        # The subscription edge itself is blocked.
        await _declare_foe(
            db_session, character3, character, status=RelationshipStatus.blocked
        )
    else:
        # The subscription is active but the reverse edge is blocked.
        await _declare_foe(db_session, character3, character)
        await _declare_foe(
            db_session, character, character3, status=RelationshipStatus.blocked
        )
    await _set_score(db_session, character3, era, 1)
    await _seed_scored_praxis(db_session, character, active_task, "blocked")

    await recalculate_character_stats(character.id, db_session)

    assert await _taunts(db_session) == []


# ---------------------------------------------------------------------------
# level_up
# ---------------------------------------------------------------------------


@pytest.mark.asyncio
async def test_level_up_taunts_every_subscriber(
    db_session: AsyncSession,
    era: Era,
    character: Character,
    character3: Character,
    active_task: Task,
):
    """A level increase in an organic recalc needles everyone subscribed."""
    await _declare_foe(db_session, character3, character)
    await _seed_scored_praxis(db_session, character, active_task, "level-a")
    await _seed_scored_praxis(db_session, character, active_task, "level-b")

    await recalculate_character_stats(character.id, db_session)

    stats = await _stats(db_session, character, era)
    assert stats.level > 0, "fixture task point_value no longer clears level 1"
    level_ups = await _taunts(db_session, TauntTriggerType.level_up)
    assert len(level_ups) == 1
    assert level_ups[0].from_character_id == character.id
    assert level_ups[0].to_character_id == character3.id

    # A recalc that does not move the score does not re-announce the level.
    await recalculate_character_stats(character.id, db_session)
    assert len(await _taunts(db_session, TauntTriggerType.level_up)) == 1


# ---------------------------------------------------------------------------
# praxis_complete
# ---------------------------------------------------------------------------


@pytest.mark.asyncio
async def test_collab_seal_taunts_once_per_member(
    db_session: AsyncSession,
    character: Character,
    character2: Character,
    character3: Character,
    praxis_collab: Praxis,
):
    """One taunt per praxis member, each reaching that member's own
    subscribers — here character3 subscribed to both members."""
    from game_config import CURRENT_ERA

    await _declare_foe(db_session, character3, character)
    await _declare_foe(db_session, character3, character2)

    # First member in: the collab is pending, nothing is complete yet.
    sealed = await on_submit(praxis_collab, character.id, db_session, CURRENT_ERA)
    assert sealed is False
    assert await _taunts(db_session, TauntTriggerType.praxis_complete) == []

    sealed = await on_submit(praxis_collab, character2.id, db_session, CURRENT_ERA)
    assert sealed is True

    completions = await _taunts(db_session, TauntTriggerType.praxis_complete)
    assert {taunt.from_character_id for taunt in completions} == {
        character.id,
        character2.id,
    }
    assert {taunt.to_character_id for taunt in completions} == {character3.id}


@pytest.mark.asyncio
async def test_solo_submit_taunts_the_authors_subscribers(
    db_session: AsyncSession,
    character: Character,
    character3: Character,
    active_task: Task,
):
    """A solo praxis seals on its single member's submit, and taunts too."""
    from game_config import CURRENT_ERA

    await _declare_foe(db_session, character3, character)
    praxis = Praxis(
        task_id=active_task.id,
        created_by_id=character.id,
        type=PraxisType.solo,
        status=PraxisStatus.in_progress,
        title="Solo submit",
        body_text="proof",
    )
    db_session.add(praxis)
    await db_session.flush()
    db_session.add(PraxisMember(praxis_id=praxis.id, character_id=character.id))
    await db_session.flush()
    await db_session.refresh(praxis)

    assert await on_submit(praxis, character.id, db_session, CURRENT_ERA) is True

    completions = await _taunts(db_session, TauntTriggerType.praxis_complete)
    assert len(completions) == 1
    assert completions[0].from_character_id == character.id
    assert completions[0].to_character_id == character3.id


# ---------------------------------------------------------------------------
# Silence: era transitions and admin backfills
# ---------------------------------------------------------------------------


@pytest.mark.asyncio
async def test_era_reset_produces_no_taunts(
    db_session: AsyncSession,
    era: Era,
    character: Character,
    character2: Character,
    character3: Character,
):
    """Everyone's score moves at once on a reset; none of it is news."""
    from game_config import CURRENT_ERA

    await _declare_foe(db_session, character, character2)
    await _declare_foe(db_session, character3, character)
    await _declare_foe(db_session, character2, character3)

    new_era_row = Era(
        name=CURRENT_ERA.name,
        config_key=CURRENT_ERA.config_key,
        started_by=character.account_id,
    )
    db_session.add(new_era_row)
    await db_session.flush()
    await apply_era_reset(
        [character, character2, character3], new_era_row, db_session
    )

    assert await _taunts(db_session) == []


@pytest.mark.asyncio
async def test_admin_backfill_is_silent(
    db_session: AsyncSession,
    era: Era,
    character: Character,
    character3: Character,
    active_task: Task,
):
    """``emit_taunts=False`` — the flag ``/admin/characters/backfill-stats``
    passes — recomputes the same scores without needling anyone."""
    await _declare_foe(db_session, character3, character)
    await _set_score(db_session, character3, era, 1)
    await _seed_scored_praxis(db_session, character, active_task, "backfill")

    await recalculate_character_stats(character.id, db_session, emit_taunts=False)

    assert (await _stats(db_session, character, era)).score > 1
    assert await _taunts(db_session) == []


# ---------------------------------------------------------------------------
# Delivery surface
# ---------------------------------------------------------------------------


@pytest.mark.asyncio
async def test_taunt_surfaces_in_the_recipients_feed(
    client: AsyncClient,
    db_session: AsyncSession,
    era: Era,
    character: Character,
    character3: Character,
    active_task: Task,
    auth_headers3: dict,
):
    """The feed is the delivery surface: a triggered taunt arrives as a
    ``foe_taunt`` item for the character who declared the foe."""
    await _declare_foe(db_session, character3, character)
    await _set_score(db_session, character3, era, 1)
    await _seed_scored_praxis(db_session, character, active_task, "feed")

    await recalculate_character_stats(character.id, db_session)
    await db_session.commit()

    response = await client.get("/activity-feed", headers=auth_headers3)
    assert response.status_code == 200
    items = [
        item for item in response.json()["items"] if item["type"] == "foe_taunt"
    ]
    # One overtake and one level-up: the praxis both passed the rival and
    # cleared level 1, and each fact is its own taunt.
    assert {item["payload"]["trigger_type"] for item in items} == {
        TauntTriggerType.score_overtake.value,
        TauntTriggerType.level_up.value,
    }
    payload = items[0]["payload"]
    assert payload["faction_slug"] == character.faction_slug
    assert payload["from_character_id"] == character.id
    # ADR-0031: keys and references only — the catalog owns the words.
    assert "message" not in payload


@pytest.mark.asyncio
async def test_standalone_taunts_route_is_gone(
    client: AsyncClient, auth_headers: dict
):
    """ADR-0068 deleted GET /taunts — the feed is the only delivery surface."""
    response = await client.get("/taunts", headers=auth_headers)
    assert response.status_code == 404
