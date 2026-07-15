"""
Seed demo praxes — one submitted, community-voted praxis per faction, authored
by real demo Characters, so the per-faction praxis cards render with genuine
scores for local testing.

Idempotent: re-running creates only what's missing (keyed on demo usernames and
a per-faction title marker). Dev DB only — these are throwaway test rows; remove
with `scripts/seed_demo_praxes.py --remove`.

    backend/.venv/Scripts/python scripts/seed_demo_praxes.py
    backend/.venv/Scripts/python scripts/seed_demo_praxes.py --remove
"""
import argparse
import asyncio

from sqlalchemy import delete, func, select
from sqlalchemy.ext.asyncio import async_sessionmaker, create_async_engine

from script_utils import get_settings
from models.account import Account, OAuthProvider
from models.character import Character
from models.character_stats import CharacterStats
from models.task import Task
from models.praxis import ModerationStatus, Praxis, PraxisMember, PraxisStatus, PraxisType
from models.vote import Vote

TITLE_MARKER = "[demo] "

# Real demo players: distinct accounts (anti-self-voting is per-account, so
# cross-votes need separate accounts). username, display_name, faction_slug.
PLAYERS = [
    ("demo_quill", "Quill", "ua"),
    ("demo_sol", "Sol Brennan", "everymen"),
    ("demo_marigold", "Marigold", "wow"),
    ("demo_riot", "Riot", "snide"),
    ("demo_vesper", "Vesper", "ephemerists"),
    ("demo_unit", "UNIT-7", "singularity"),
    ("demo_almanac", "Almanac Okonkwo", "ephemerists"),  # extra collaborator
]

# faction -> (author_username, title, body, type, [stars from other players])
DEMOS = {
    "ua": ("demo_quill", "Mapped the unmarked stair",
           "Walked every floor until the numbering stopped making sense, then drew it.",
           PraxisType.solo, [4, 5, 3]),
    "everymen": ("demo_sol", "Hit the bench. Then hit it again",
               "Same task, second time through — put my own oxygen mask on first.",
               PraxisType.solo, [5, 5, 4]),
    "wow": ("demo_marigold", "Threw a stranger a parade",
                "Confetti, a kazoo, one very confused commuter. The bus stop will never recover.",
                PraxisType.solo, [5, 4, 5]),
    "snide": ("demo_riot", "Flyposted the quiet block",
              "Stuck it where they said not to. Allegedly.",
              PraxisType.solo, [3, 4, 2]),
    "ephemerists": ("demo_vesper", "Traced a myth to its road",
                   "Followed the old account to the actual coordinates. It was there.",
                   PraxisType.solo, [5, 4, 5]),
    "singularity": ("demo_unit", "Logged the signal at 0300",
                    "Clean capture. Consensus pending. The noise floor held.",
                    PraxisType.solo, [4, 3, 4]),
}

# All demos are solo so each routes to the per-faction PraxisCard (collab praxes
# render via the separate CollaborationCard, not the faction card under test).
COLLAB_SECOND_MEMBER: dict[str, str] = {}


async def get_or_create_players(session) -> dict[str, Character]:
    chars: dict[str, Character] = {}
    for username, display_name, faction_slug in PLAYERS:
        existing = (
            await session.execute(select(Character).where(Character.username == username))
        ).scalar_one_or_none()
        if existing is not None:
            chars[username] = existing
            continue
        account = Account(email=f"{username}@worldzero.test")
        session.add(account)
        await session.flush()
        session.add(OAuthProvider(
            account_id=account.id,
            provider="demo",
            provider_user_id=username,
            access_token="demo_token",
        ))
        character = Character(
            account_id=account.id,
            username=username,
            display_name=display_name,
            faction_slug=faction_slug,
        )
        session.add(character)
        await session.flush()
        chars[username] = character
    return chars


async def seed(session) -> None:
    players = await get_or_create_players(session)
    created = 0
    for faction, (author_username, title, body, ptype, stars) in DEMOS.items():
        task = (
            await session.execute(
                select(Task).where(Task.primary_faction_slug == faction).limit(1)
            )
        ).scalar_one_or_none()
        if task is None:
            print(f"  ! {faction}: no task on the board — skipped")
            continue
        author = players[author_username]
        marked_title = TITLE_MARKER + title
        already = (
            await session.execute(
                select(func.count())
                .select_from(Praxis)
                .where(Praxis.created_by_id == author.id, Praxis.title == marked_title)
            )
        ).scalar()
        if already:
            print(f"  = {faction}: demo praxis already present — skipped")
            continue

        praxis = Praxis(
            task_id=task.id,
            type=ptype,
            status=PraxisStatus.submitted,
            title=marked_title,
            body_text=body,
            created_by_id=author.id,
            moderation_status=ModerationStatus.visible,
        )
        session.add(praxis)
        await session.flush()

        members = [author]
        session.add(PraxisMember(praxis_id=praxis.id, character_id=author.id, has_submitted=True))
        second = COLLAB_SECOND_MEMBER.get(faction)
        if second:
            members.append(players[second])
            session.add(PraxisMember(praxis_id=praxis.id, character_id=players[second].id, has_submitted=True))

        member_ids = {m.id for m in members}
        voters = [c for c in players.values() if c.id not in member_ids][: len(stars)]
        for voter, star in zip(voters, stars):
            session.add(Vote(
                praxis_id=praxis.id,
                voter_character_id=voter.id,
                voter_account_id=voter.account_id,
                value=star,
            ))
        created += 1
        print(f"  + {faction}: '{title}' by {author.display_name} ({len(voters)} votes)")
    await session.commit()
    print(f"\nDone. {created} demo praxis(es) created.")


async def remove(session) -> None:
    demo_chars = (
        await session.execute(
            select(Character).where(Character.username.like("demo_%"))
        )
    ).scalars().all()
    ids = [c.id for c in demo_chars]
    if not ids:
        print("No demo players found.")
        return
    praxis_ids = (
        await session.execute(select(Praxis.id).where(Praxis.created_by_id.in_(ids)))
    ).scalars().all()
    if praxis_ids:
        await session.execute(delete(Vote).where(Vote.praxis_id.in_(praxis_ids)))
        await session.execute(delete(PraxisMember).where(PraxisMember.praxis_id.in_(praxis_ids)))
        await session.execute(delete(Praxis).where(Praxis.id.in_(praxis_ids)))
    # votes cast by demo players on any praxis
    await session.execute(delete(Vote).where(Vote.voter_character_id.in_(ids)))
    await session.execute(delete(PraxisMember).where(PraxisMember.character_id.in_(ids)))
    account_ids = [c.account_id for c in demo_chars]
    await session.execute(delete(CharacterStats).where(CharacterStats.character_id.in_(ids)))
    await session.execute(delete(Character).where(Character.id.in_(ids)))
    await session.execute(delete(OAuthProvider).where(OAuthProvider.account_id.in_(account_ids)))
    await session.execute(delete(Account).where(Account.id.in_(account_ids)))
    await session.commit()
    print(f"Removed {len(praxis_ids)} demo praxis(es) and {len(ids)} demo players.")


async def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--remove", action="store_true", help="delete all demo players + praxes")
    parser.add_argument("--env", default="dev")
    args = parser.parse_args()

    settings = get_settings(args.env)
    engine = create_async_engine(settings.DATABASE_URL, echo=False)
    async with async_sessionmaker(engine, expire_on_commit=False)() as session:
        if args.remove:
            await remove(session)
        else:
            await seed(session)
    await engine.dispose()


if __name__ == "__main__":
    asyncio.run(main())
