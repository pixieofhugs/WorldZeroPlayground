"""#2225 — a task that predates the character is not news to that character.

**The seam under test** is ``GET /activity-feed`` →
``services.activity_feed._global_tasks_query``, the one source behind the
``global_task`` row. A brand-new character used to open the bell onto the entire
task board announced as new, because the source had no predicate tying a task's
age to the reader's.

Owner ruling (#2225): *a character does not receive new-task notifications for
tasks created before that character existed.* Scoped to the **character**, not
the account — a second life on an old account starts as clean as the first one
did. The rejected alternative was capping the backlog at N most recent, which
still delivers noise and invents a number nobody could defend; there is no cap
here and there must not be one.

The badge assertion is the ADR-0036 half: counts are ``COUNT`` over the same
windowed Select, so a suppressed row has to take its number with it. A feed that
hides the rows while the tab still reads "37" has not fixed anything.
"""

from datetime import timedelta

import pytest
import pytest_asyncio
from httpx import AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession

from models.account import Account
from models.character import Character
from models.character_stats import CharacterStats
from models.era import Era
from models.task import Task, TaskStatus
from tests.integration.factories import DEFAULT_FACTION_SLUG


async def _make_task(
    db_session: AsyncSession, character: Character, title: str, created_at
) -> Task:
    task = Task(
        title=title,
        description="news, or not",
        point_value=10,
        level_required=0,
        status=TaskStatus.active,
        created_by=character.id,
        primary_faction_slug=DEFAULT_FACTION_SLUG,
        created_at=created_at,
    )
    db_session.add(task)
    await db_session.commit()
    await db_session.refresh(task)
    return task


async def _global_feed(client: AsyncClient, auth_headers: dict) -> dict:
    response = await client.get(
        "/activity-feed",
        params={"filter": "global", "limit": 100},
        headers=auth_headers,
    )
    assert response.status_code == 200, response.text
    return response.json()


def _task_ids(body: dict) -> set[int]:
    return {
        item["payload"]["task_id"]
        for item in body["items"]
        if item["type"] == "global_task"
    }


@pytest_asyncio.fixture
async def board(db_session: AsyncSession, character: Character) -> tuple[Task, Task]:
    """One task from before the character existed, one from after. In that order."""
    born = character.created_at
    old = await _make_task(db_session, character, "Already on the board", born - timedelta(days=1))
    new = await _make_task(db_session, character, "Filed this morning", born + timedelta(minutes=1))
    return old, new


@pytest.mark.asyncio
async def test_a_task_older_than_the_character_is_not_announced_to_them(
    client: AsyncClient,
    character: Character,
    board: tuple[Task, Task],
    auth_headers: dict,
):
    """The whole of #2225: the backlog goes, the genuine news stays."""
    old, new = board
    body = await _global_feed(client, auth_headers)
    ids = _task_ids(body)

    assert new.id in ids, f"a task filed after the character is news; got {ids}"
    assert old.id not in ids, (
        "a task that was already on the board when this character was made is "
        f"not news to them; got {ids}"
    )


@pytest.mark.asyncio
async def test_the_badge_number_drops_with_the_row(
    client: AsyncClient,
    character: Character,
    board: tuple[Task, Task],
    auth_headers: dict,
):
    """ADR-0036: the count wraps the same windowed Select, so it cannot disagree."""
    body = await _global_feed(client, auth_headers)
    assert body["counts"]["by_type"].get("global_task") == 1, body["counts"]


@pytest.mark.asyncio
async def test_a_task_created_the_same_instant_still_counts_as_news(
    client: AsyncClient,
    db_session: AsyncSession,
    character: Character,
    auth_headers: dict,
):
    """The boundary is ``>=``, not ``>``.

    Postgres's ``now()`` is the *transaction* timestamp, so a character and a
    task written in one transaction — a seed, a fixture, a signup flow that
    files a task — carry the identical stamp to the microsecond. A strict
    comparison would silence those, which is a suppression rule quietly eating
    real news.
    """
    same_instant = await _make_task(
        db_session, character, "Born together", character.created_at
    )
    assert same_instant.id in _task_ids(await _global_feed(client, auth_headers))


@pytest.mark.asyncio
async def test_a_second_character_on_an_old_account_starts_clean(
    client: AsyncClient,
    db_session: AsyncSession,
    account: Account,
    character: Character,
    era: Era,
    board: tuple[Task, Task],
    auth_headers: dict,
):
    """Scoped to the character, not the account (the ruling's second half).

    ``character`` predates both tasks' owner-visible history; the new life does
    not. The account is the same one, and the same bearer token drives the feed —
    only the carried character changes, and it is the character's age that
    decides.
    """
    old, new = board
    second = Character(
        account_id=account.id,
        username="secondlife",
        display_name="Second Life",
        faction_slug=DEFAULT_FACTION_SLUG,
        created_at=new.created_at + timedelta(minutes=1),
    )
    db_session.add(second)
    await db_session.flush()
    db_session.add(
        CharacterStats(
            character_id=second.id,
            era_id=era.id,
            score=0,
            all_time_score=0,
            level=0,
            votes_spent_this_era=0,
        )
    )
    account.active_character_id = second.id
    await db_session.commit()

    ids = _task_ids(await _global_feed(client, auth_headers))
    assert ids == set(), (
        "a second character on an existing account starts clean for the same "
        f"reason the first one did; got {ids}"
    )
