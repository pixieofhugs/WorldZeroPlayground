"""Account-scoped ``voted=yes|no`` filter and ``voted_by_name`` marker (#644).

``no`` = needs my vote: also excludes praxes my account co-owns (unvotable), so
yes/no are deliberately not complements.
"""
from datetime import datetime, timezone

import pytest
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from models.account import Account
from models.character import Character
from models.character_stats import CharacterStats
from models.era import Era
from models.faction import Faction
from models.praxis import Praxis, PraxisMember, PraxisStatus, PraxisType
from models.task import Task
from models.vote import Vote
from services.praxis import VotedFilter, list_praxes
from services.praxis_out import build_praxis_card_out
from services.vote import cast_or_update_vote
from services.vote_tally import viewer_votes_for
from tests.integration.factories import DEFAULT_FACTION_SLUG


@pytest.fixture
def _make_character(db_session: AsyncSession, era: Era, some_faction: Faction):
    async def _factory(account: Account, username: str, display_name: str) -> Character:
        ch = Character(
            account_id=account.id,
            username=username,
            display_name=display_name,
            faction_slug=DEFAULT_FACTION_SLUG,
        )
        db_session.add(ch)
        await db_session.flush()
        db_session.add(
            CharacterStats(
                character_id=ch.id,
                era_id=era.id,
                score=0,
                all_time_score=0,
                level=0,
                votes_spent_this_era=0,
            )
        )
        await db_session.flush()
        return ch

    return _factory


@pytest.fixture
def _make_submitted_praxis(db_session: AsyncSession, active_task: Task):
    async def _factory(author: Character, title: str) -> Praxis:
        praxis = Praxis(
            task_id=active_task.id,
            created_by_id=author.id,
            type=PraxisType.solo,
            status=PraxisStatus.submitted,
            # Feed requires submitted_at IS NOT NULL (#658).
            submitted_at=datetime.now(timezone.utc),
            title=title,
            body_text="proof",
        )
        db_session.add(praxis)
        await db_session.flush()
        db_session.add(PraxisMember(praxis_id=praxis.id, character_id=author.id))
        await db_session.flush()
        return praxis

    return _factory


async def _cast(db_session: AsyncSession, praxis: Praxis, voter: Character, value: int) -> None:
    db_session.add(
        Vote(
            praxis_id=praxis.id,
            voter_character_id=voter.id,
            voter_account_id=voter.account_id,
            value=value,
        )
    )
    await db_session.flush()


@pytest.mark.asyncio
async def test_voted_no_is_needs_my_vote_and_excludes_own_membership(
    db_session: AsyncSession,
    account: Account,
    character: Character,           # carried viewer, account A
    character3: Character,          # third-party author, account C
    _make_submitted_praxis,
):
    p_unvoted = await _make_submitted_praxis(character3, "Third party, unvoted")
    p_voted = await _make_submitted_praxis(character3, "Third party, I voted")
    p_own = await _make_submitted_praxis(character, "My own praxis")

    await _cast(db_session, p_voted, character, 4)

    result = await list_praxes(
        session=db_session,
        status=PraxisStatus.submitted,
        voted=VotedFilter.no,
        viewer_id=character.id,
        viewer_account_id=character.account_id,
    )
    ids = {p.id for p in result}
    assert p_unvoted.id in ids
    assert p_voted.id not in ids
    assert p_own.id not in ids


@pytest.mark.asyncio
async def test_voted_no_excludes_account_mate_voted(
    db_session: AsyncSession,
    account: Account,
    character: Character,
    character3: Character,
    _make_character,
    _make_submitted_praxis,
):
    mate = await _make_character(account, "matecharacter", "Account Mate")
    p_mate_voted = await _make_submitted_praxis(character3, "Mate voted this")
    p_open = await _make_submitted_praxis(character3, "Nobody on my account voted")
    await _cast(db_session, p_mate_voted, mate, 3)

    result = await list_praxes(
        session=db_session,
        status=PraxisStatus.submitted,
        voted=VotedFilter.no,
        viewer_id=character.id,
        viewer_account_id=character.account_id,
    )
    ids = {p.id for p in result}
    assert p_open.id in ids
    assert p_mate_voted.id not in ids


@pytest.mark.asyncio
async def test_voted_yes_is_any_vote_from_my_account(
    db_session: AsyncSession,
    account: Account,
    character: Character,
    character3: Character,
    _make_character,
    _make_submitted_praxis,
):
    mate = await _make_character(account, "matecharacter", "Account Mate")
    p_i_voted = await _make_submitted_praxis(character3, "I voted")
    p_mate_voted = await _make_submitted_praxis(character3, "Mate voted")
    p_unvoted = await _make_submitted_praxis(character3, "Unvoted")

    await _cast(db_session, p_i_voted, character, 5)
    await _cast(db_session, p_mate_voted, mate, 2)

    result = await list_praxes(
        session=db_session,
        status=PraxisStatus.submitted,
        voted=VotedFilter.yes,
        viewer_id=character.id,
        viewer_account_id=character.account_id,
    )
    ids = {p.id for p in result}
    assert p_i_voted.id in ids
    assert p_mate_voted.id in ids
    assert p_unvoted.id not in ids


@pytest.mark.asyncio
async def test_voted_by_name_fires_for_account_mate_only(
    db_session: AsyncSession,
    account: Account,
    character: Character,
    character3: Character,
    _make_character,
    _make_submitted_praxis,
):
    mate = await _make_character(account, "matecharacter", "Account Mate")
    p_mate = await _make_submitted_praxis(character3, "Mate voted, I did not")
    p_mine = await _make_submitted_praxis(character3, "I voted")
    p_none = await _make_submitted_praxis(character3, "No account vote")

    await _cast(db_session, p_mate, mate, 3)
    await _cast(db_session, p_mine, character, 5)

    praxes = await list_praxes(
        session=db_session,
        status=PraxisStatus.submitted,
        viewer_id=character.id,
        viewer_account_id=character.account_id,
    )
    viewer_votes = await viewer_votes_for(
        {p.id for p in praxes}, character.id, character.account_id, db_session
    )
    cards = {
        p.id: await build_praxis_card_out(
            p, db_session, viewer=None, viewer_votes=viewer_votes
        )
        for p in praxes
    }

    assert cards[p_mate.id].voted_by_name == "Account Mate"
    assert cards[p_mate.id].viewer_vote is None

    assert cards[p_mine.id].viewer_vote == 5
    assert cards[p_mine.id].voted_by_name is None

    assert cards[p_none.id].viewer_vote is None
    assert cards[p_none.id].voted_by_name is None


@pytest.mark.asyncio
async def test_carried_character_re_rating_a_mates_vote_takes_over_the_marker(
    db_session: AsyncSession,
    account: Account,
    character: Character,
    character3: Character,
    _make_character,
    _make_submitted_praxis,
):
    """One vote per praxis per account (#1150): value and attribution move to
    the re-rater. The suppression branch is covered in unit/test_vote_tally.py.
    """
    mate = await _make_character(account, "matecharacter", "Account Mate")
    p_shared = await _make_submitted_praxis(character3, "Mate voted first")
    await _cast(db_session, p_shared, mate, 2)

    praxes = await list_praxes(
        session=db_session,
        status=PraxisStatus.submitted,
        viewer_id=character.id,
        viewer_account_id=character.account_id,
    )
    target = next(p for p in praxes if p.id == p_shared.id)

    await cast_or_update_vote(character, target, 4, db_session)

    rows = (
        (await db_session.execute(select(Vote).where(Vote.praxis_id == p_shared.id)))
        .scalars()
        .all()
    )
    assert len(rows) == 1
    assert rows[0].value == 4
    assert rows[0].voter_character_id == character.id

    viewer_votes = await viewer_votes_for(
        {p.id for p in praxes}, character.id, character.account_id, db_session
    )
    card = await build_praxis_card_out(
        target, db_session, viewer=None, viewer_votes=viewer_votes
    )
    assert card.viewer_vote == 4
    assert card.voted_by_name is None
