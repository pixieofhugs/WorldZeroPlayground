"""``recalculate_character_stats`` runs per vote and per era reset, so no N+1."""
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
    """``tag`` namespaces identities so the helper can run twice per test."""
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

        # Fresh account per voter: UNIQUE(praxis_id, voter_account_id) (#1150).
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

    def __init__(self, sync_engine):
        self.sync_engine = sync_engine
        self.count = 0

        def _on_before_cursor_execute(conn, cursor, statement, parameters, context, executemany):
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
    await _seed_solo_praxes_with_votes(
        db_session, character, active_task, era, count=5, tag="a"
    )

    counter_small = _QueryCounter(db_connection.sync_engine)
    try:
        await recalculate_character_stats(character.id, db_session)
    finally:
        counter_small.close()
    small_count = counter_small.count

    await _seed_solo_praxes_with_votes(
        db_session, character, active_task, era, count=5, tag="b"
    )

    counter_large = _QueryCounter(db_connection.sync_engine)
    try:
        await recalculate_character_stats(character.id, db_session)
    finally:
        counter_large.close()
    large_count = counter_large.count

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
    """Recalculation must never move faction_slug."""
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
