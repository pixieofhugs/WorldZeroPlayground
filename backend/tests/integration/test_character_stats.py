"""Tests for services.character_stats.

Focus: ``recalculate_character_stats`` must not issue a linear number of
SQL round-trips per praxis. It is called on every vote cast and on every
character during era reset, so N+1 behaviour compounds badly.
"""
import pytest
from sqlalchemy import event

from models.account import Account
from models.character import Character
from models.era import Era
from models.praxis import Praxis, PraxisStatus, PraxisType
from models.task import Task
from models.vote import Vote
from services.character_stats import recalculate_character_stats
from tests.integration.factories import DEFAULT_FACTION_SLUG


async def _seed_solo_praxes_with_votes(
    db_session,
    author: Character,
    task: Task,
    era: Era,
    count: int,
    tag: str,
) -> list[Praxis]:
    """Create ``count`` scored solo praxes authored by ``author``.

    Each praxis receives a single 3-star vote from a distinct voter character
    so ``recalculate_character_stats`` exercises the vote-sum aggregation path.
    ``tag`` namespaces the generated account/character identities so callers
    can invoke this helper multiple times in one test without collisions.
    """
    from models.character_stats import CharacterStats

    praxes: list[Praxis] = []
    for praxis_index in range(count):
        praxis = Praxis(
            task_id=task.id,
            created_by_id=author.id,
            type=PraxisType.solo,
            title=f"Praxis {tag}-{praxis_index}",
            body_text="proof",
        )
        db_session.add(praxis)
        await db_session.flush()

        # Fresh voter ACCOUNT per praxis — avoids
        # UNIQUE(praxis_id, voter_account_id) collisions (#1150) and also keeps
        # voter identity distinct from the author (anti-self-vote is enforced at
        # account_id level).
        voter_account = Account(email=f"voter_{tag}_{praxis_index}_{author.id}@example.com")
        db_session.add(voter_account)
        await db_session.flush()

        voter_character = Character(
            account_id=voter_account.id,
            username=f"voter_{tag}_{praxis_index}_{author.id}",
            display_name=f"Voter {tag}-{praxis_index}",
            faction_slug=DEFAULT_FACTION_SLUG,
        )
        db_session.add(voter_character)
        await db_session.flush()

        db_session.add(
            CharacterStats(
                character_id=voter_character.id,
                era_id=era.id,
                score=100,
                all_time_score=100,
                level=1,
                votes_spent_this_era=0,
            )
        )
        db_session.add(
            Vote(
                praxis_id=praxis.id,
                voter_character_id=voter_character.id,
                voter_account_id=voter_account.id,
                value=3,
            )
        )
        praxes.append(praxis)

    await db_session.commit()
    return praxes


class _QueryCounter:
    """Counts SQL statements executed on a sync engine via SQLAlchemy events."""

    def __init__(self, sync_engine):
        self.sync_engine = sync_engine
        self.count = 0

        def _on_before_cursor_execute(conn, cursor, statement, parameters, context, executemany):
            # Count only statements; ignore BEGIN/SAVEPOINT/ROLLBACK which
            # are driver-level and not issued via cursor.execute in asyncpg.
            self.count += 1

        self._listener = _on_before_cursor_execute
        event.listen(sync_engine, "before_cursor_execute", self._listener)

    def close(self):
        event.remove(self.sync_engine, "before_cursor_execute", self._listener)


@pytest.mark.asyncio
async def test_recalculate_character_stats_query_count_does_not_grow_with_praxes(
    db_session,
    db_connection,
    character: Character,
    active_task: Task,
    era: Era,
):
    """Query count for 10 solo praxes must equal the count for 5 solo praxes.

    Before the N+1 fix, each praxis added at least two queries (task lookup
    and per-praxis vote sum). After the fix all per-praxis work is bulk-
    fetched up front, so total round-trips are constant in the praxis count.
    """
    # Baseline: 5 scored solo praxes.
    await _seed_solo_praxes_with_votes(
        db_session, character, active_task, era, count=5, tag="a"
    )

    counter_small = _QueryCounter(db_connection.sync_engine)
    try:
        await recalculate_character_stats(character.id, db_session)
    finally:
        counter_small.close()
    small_count = counter_small.count

    # Add 5 more scored solo praxes → 10 total.
    await _seed_solo_praxes_with_votes(
        db_session, character, active_task, era, count=5, tag="b"
    )

    counter_large = _QueryCounter(db_connection.sync_engine)
    try:
        await recalculate_character_stats(character.id, db_session)
    finally:
        counter_large.close()
    large_count = counter_large.count

    # After the N+1 fix every per-praxis lookup (task, vote sum, metatask
    # points) is bulk-fetched up front, so round-trip count is constant in
    # the praxis count. Equality is the strongest demonstration that the
    # linear term is gone.
    assert large_count == small_count, (
        f"recalculate_character_stats issued {small_count} queries for 5 "
        f"praxes and {large_count} queries for 10 praxes — query count must "
        f"be constant in the praxis count (growth indicates N+1 regression)."
    )


@pytest.mark.asyncio
async def test_ua_character_faction_not_changed_at_level_3(
    db_session,
    character: Character,
    active_task: Task,
    era: Era,
):
    """UA characters must stay in 'ua' after recalculate_character_stats, even at level 3+.

    Regression guard for the removed check_faction_graduation: that function
    previously forced faction_slug from 'ua' to 'aged_out' on every stat
    recalculation once the character reached level 3 (score >= 170).
    """
    # Seed 20 submitted solo praxes at 10 pts each → score 200, level 3.
    for index in range(20):
        praxis = Praxis(
            task_id=active_task.id,
            created_by_id=character.id,
            type=PraxisType.solo,
            title=f"Level-3 praxis {index}",
            body_text="proof",
            status=PraxisStatus.submitted,
        )
        db_session.add(praxis)
    await db_session.commit()

    await recalculate_character_stats(character.id, db_session)
    await db_session.refresh(character)

    assert character.faction_slug == DEFAULT_FACTION_SLUG, (
        f"recalculate_character_stats must not mutate faction_slug; got {character.faction_slug!r}"
    )
