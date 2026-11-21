"""Dev-only fixture state for ``POST /auth/dev-login`` (#3234).

Writes the rows the real paths write; the stamps re-check the earn rules. The
route owns the production guard.
"""

from datetime import datetime, timezone

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from errors import ErrorCode, raise_coded
from game_config import CURRENT_ERA, EraConfig
from models.account import AuthProvider
from models.character import Character
from models.invitation_letter import InvitationLetter
from models.praxis import Praxis, PraxisMember, PraxisStatus, PraxisType
from models.task import Task
from models.vote import Vote
from schemas.character import CharacterCreate
from services.auth import create_or_get_account
from services.character import (
    _ALBESCENT_SENTINEL_SLUGS,
    create_character,
    stamp_albescent_glimpse,
    stamp_albescent_unlock,
)
from services.era import get_current_era_row
from services.vote import account_has_received_vote


def albescent_floor(state: str | None, level: int, era: EraConfig = CURRENT_ERA) -> int:
    """The level the account needs for ``state``, raised to at least ``level``."""
    if state == "unlocked":
        return max(level, era.secret_faction_join_level)
    if state == "glimpsed":
        return max(level, era.secret_faction_glimpse_level)
    return level


async def seed_received_vote(character: Character, session: AsyncSession) -> None:
    """Idempotently make another character vote on a praxis of ``character``'s
    account, so the vote-needs-a-received-vote lock (#3475) is open for it."""
    if await account_has_received_vote(character.account_id, session):
        return
    task = await session.scalar(select(Task).limit(1))
    if task is None:
        raise_coded(400, ErrorCode.task_not_found, "received_vote needs a task.")
    seeder = await create_or_get_account(
        provider=AuthProvider.DEV,
        provider_user_id=f"dev-seed-voter-{character.account_id}",
        email=f"dev-seed-voter-{character.account_id}@localhost",
        email_verified=True,
        session=session,
    )
    voter = (
        await create_character(
            seeder.id,
            CharacterCreate(display_name=f"Seed Voter {character.account_id}"),
            session,
        )
    ).character
    era_row = await get_current_era_row(session)
    praxis = Praxis(
        task_id=task.id,
        created_by_id=character.id,
        type=PraxisType.solo,
        title="Seeded proof",
        status=PraxisStatus.submitted,
        submitted_at=datetime.now(timezone.utc),
        era_id=era_row.id,
        body_text="seeded by dev-login",
    )
    session.add(praxis)
    await session.flush()
    session.add(PraxisMember(praxis_id=praxis.id, character_id=character.id))
    session.add(
        Vote(
            praxis_id=praxis.id,
            voter_character_id=voter.id,
            voter_account_id=voter.account_id,
            value=3,
        )
    )
    await session.flush()


async def seed_draft_praxis(character: Character, session: AsyncSession) -> int:
    """Idempotently give ``character`` an in-progress praxis (a draft, so
    ``/praxis/:id/edit`` opens the composer) and return its id."""
    existing = await session.scalar(
        select(Praxis.id).where(
            Praxis.created_by_id == character.id,
            Praxis.status == PraxisStatus.in_progress,
        )
    )
    if existing is not None:
        return existing
    task = await session.scalar(
        select(Task).order_by(Task.level_required, Task.id).limit(1)
    )
    if task is None:
        raise_coded(400, ErrorCode.task_not_found, "draft_praxis needs a task.")
    praxis = Praxis(
        task_id=task.id,
        created_by_id=character.id,
        type=PraxisType.solo,
        status=PraxisStatus.in_progress,
        title="Seeded draft",
        body_text="",
    )
    session.add(praxis)
    await session.flush()
    session.add(PraxisMember(praxis_id=praxis.id, character_id=character.id))
    await session.flush()
    return praxis.id


async def apply_dev_fixture(
    character: Character,
    era_id: int,
    level: int,
    session: AsyncSession,
    *,
    invited: list[str],
    albescent: str | None,
    era: EraConfig = CURRENT_ERA,
) -> None:
    """Idempotently deliver letters and stamp the Albescent state.
    ``level`` is post-``albescent_floor``."""
    slugs = set(invited)
    if albescent == "unlocked":
        slugs |= {s for s in era.factions if s not in _ALBESCENT_SENTINEL_SLUGS}
    slugs.discard(character.faction_slug)
    held = set(
        await session.scalars(
            select(InvitationLetter.faction_slug).where(
                InvitationLetter.character_id == character.id,
                InvitationLetter.era_id == era_id,
            )
        )
    )
    for slug in slugs - held:
        session.add(
            InvitationLetter(
                character_id=character.id, faction_slug=slug, era_id=era_id
            )
        )
    await session.flush()

    if albescent is not None:
        await stamp_albescent_glimpse(character, level, session, era)
    if albescent == "unlocked":
        await stamp_albescent_unlock(character, era_id, session, era)
