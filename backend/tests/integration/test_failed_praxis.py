"""A praxis an admin marks ``failed`` earns nobody points — and that is ALL it changes (#1373).

Seams under test:

1. ``services.character_stats.recalculate_character_stats`` — the score gather.
   A ``failed`` praxis must contribute 0 to its author's and (for a collab) every
   member's recomputed score, the same way ``hidden`` already does.
2. ``services.praxis.moderate_praxis`` (reached via ``PATCH
   /admin/praxes/{id}/moderate``) — the moderation transition must *trigger* the
   recompute, so a score corrected only on the next unrelated vote is a bug.
3. Listing and voting deliberately do NOT change. Owner ruling (Molly,
   2026-07-30): only points change. A failed praxis stays in the feed wearing its
   banner, and stays votable. The last two tests pin that, because "a vote that
   cannot move a score should be blocked" is a tempting tidy-up that has already
   been proposed once and ruled against.
"""

import pytest
from httpx import AsyncClient
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from models.account import Account
from models.character import Character
from models.character_stats import CharacterStats
from models.praxis import ModerationStatus, Praxis, PraxisStatus
from models.roles import AccountRole, Role
from models.vote import Vote
from services.character_stats import recalculate_character_stats


async def _make_admin(account: Account, session: AsyncSession) -> None:
    """Grant the admin role to an account."""
    role = Role(name="admin", description="Administrator")
    session.add(role)
    await session.flush()
    session.add(
        AccountRole(account_id=account.id, role_id=role.id, granted_by=account.id)
    )
    await session.commit()


async def _score_of(character_id: int, session: AsyncSession) -> int:
    result = await session.execute(
        select(CharacterStats).where(CharacterStats.character_id == character_id)
    )
    stats = result.scalars().first()
    return stats.score if stats is not None else 0


@pytest.mark.asyncio
async def test_failed_solo_praxis_contributes_nothing(
    db_session: AsyncSession,
    character: Character,
    praxis_solo: Praxis,
    vote: Vote,
):
    """A solo praxis worth points before the mark is worth 0 after it."""
    await recalculate_character_stats(character.id, db_session)
    before = await _score_of(character.id, db_session)
    assert before > 0, "fixture must earn points, or the drop below proves nothing"

    praxis_solo.moderation_status = ModerationStatus.failed
    await db_session.flush()
    await recalculate_character_stats(character.id, db_session)

    assert await _score_of(character.id, db_session) == 0


@pytest.mark.asyncio
async def test_failed_collab_praxis_contributes_nothing_to_members(
    db_session: AsyncSession,
    character: Character,
    character2: Character,
    praxis_collab: Praxis,
):
    """Both collab members lose the points — the member gather filters too."""
    praxis_collab.status = PraxisStatus.submitted
    await db_session.flush()

    for member in (character, character2):
        await recalculate_character_stats(member.id, db_session)
    before = {
        member.id: await _score_of(member.id, db_session)
        for member in (character, character2)
    }
    assert all(score > 0 for score in before.values()), before

    praxis_collab.moderation_status = ModerationStatus.failed
    await db_session.flush()
    for member in (character, character2):
        await recalculate_character_stats(member.id, db_session)

    assert await _score_of(character.id, db_session) == 0
    # character2 starts the era with a seeded score, so assert the drop, not zero.
    assert await _score_of(character2.id, db_session) < before[character2.id]


@pytest.mark.asyncio
async def test_admin_marking_failed_recomputes_the_score(
    client: AsyncClient,
    db_session: AsyncSession,
    account: Account,
    auth_headers: dict,
    auth_headers2: dict,
    character: Character,
    character2: Character,
    praxis_solo: Praxis,
):
    """submit → vote → score > 0 → admin marks failed → score drops, no other action."""
    await _make_admin(account, db_session)

    vote_response = await client.post(
        f"/praxes/{praxis_solo.id}/vote", json={"value": 5}, headers=auth_headers2
    )
    assert vote_response.status_code == 200
    before = await _score_of(character.id, db_session)
    assert before > 0

    moderate_response = await client.patch(
        f"/admin/praxes/{praxis_solo.id}/moderate",
        json={"status": "failed", "admin_note": "Proof does not show the task."},
        headers=auth_headers,
    )
    assert moderate_response.status_code == 200
    assert moderate_response.json()["moderation_status"] == "failed"

    assert await _score_of(character.id, db_session) == 0


@pytest.mark.asyncio
async def test_restoring_a_failed_praxis_restores_the_score(
    client: AsyncClient,
    db_session: AsyncSession,
    account: Account,
    auth_headers: dict,
    character: Character,
    praxis_solo: Praxis,
    vote: Vote,
):
    """The mark is reversible: back to ``visible`` and the points return."""
    await _make_admin(account, db_session)
    await recalculate_character_stats(character.id, db_session)
    before = await _score_of(character.id, db_session)
    assert before > 0

    for status in ("failed", "visible"):
        response = await client.patch(
            f"/admin/praxes/{praxis_solo.id}/moderate",
            json={"status": status},
            headers=auth_headers,
        )
        assert response.status_code == 200

    assert await _score_of(character.id, db_session) == before


@pytest.mark.asyncio
async def test_failed_praxis_stays_votable(
    client: AsyncClient,
    db_session: AsyncSession,
    auth_headers2: dict,
    character2: Character,
    praxis_solo: Praxis,
):
    """Voting stays OPEN on a failed praxis — owner ruling (Molly, 2026-07-30).

    `failed` changes exactly one thing: the praxis banks no points. It keeps its
    place in the feed, it keeps its banner, and it keeps its ratings module. The
    argument for closing voting was that a vote costs the voter finite budget
    (ADR-0043) and can no longer move any score; the ruling is that only the
    scoring changes, so this test exists to stop that reasoning being re-applied
    later as an obvious tidy-up.

    ``character2`` is requested so the voter really exists — without it the POST
    403s on "no active character" and this would pass for the wrong reason.
    """
    praxis_solo.moderation_status = ModerationStatus.failed
    await db_session.commit()

    response = await client.post(
        f"/praxes/{praxis_solo.id}/vote", json={"value": 5}, headers=auth_headers2
    )
    assert response.status_code == 200, response.text

    detail = await client.get(f"/praxes/{praxis_solo.id}", headers=auth_headers2)
    assert detail.status_code == 200
    assert detail.json()["viewer_can_vote"] is True


@pytest.mark.asyncio
async def test_failed_praxis_stays_listed(
    client: AsyncClient,
    db_session: AsyncSession,
    praxis_solo: Praxis,
):
    """Listing is unchanged — failed is a public mark of shame, not a removal."""
    praxis_solo.moderation_status = ModerationStatus.failed
    await db_session.commit()

    response = await client.get("/praxes")
    assert response.status_code == 200
    assert praxis_solo.id in {item["id"] for item in response.json()}
