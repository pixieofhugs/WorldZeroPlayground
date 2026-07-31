"""Service for recomputing and persisting CharacterStats from current vote data."""

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from game_config import CURRENT_ERA, EraConfig
from models.character import Character
from models.era import Era
from models.invitation_letter import InvitationLetter
from models.praxis import (
    ModerationStatus,
    Praxis,
    PraxisMember,
    PraxisStatus,
    PraxisType,
)
from models.task import Task
from services.era import get_current_era_row, get_or_create_stats
from services.praxis_scoring import Contribution, compute_contributions
from services.scoring import compute_level

# Factions that never receive invitation letters (ADR-0022 / ADR-0019 sentinels).
_NON_INVITE_FACTION_SLUGS: frozenset[str] = frozenset({"na", "albescent"})

# Moderation states that earn nobody points (#1373). ``hidden`` is off the site
# entirely; ``failed`` is an admin ruling that the work was not done, so it keeps
# its banner and its place in the feed but banks nothing. Both praxis gathers
# below read this one set so they cannot drift apart. It mirrors the accepted set
# in ``services.character.py``'s Albescent-unlock query, which has always counted
# only ``visible`` + ``flagged`` — a flagged praxis is merely *awaiting* a ruling.
_UNSCORED_MODERATION_STATUSES: frozenset[ModerationStatus] = frozenset(
    {ModerationStatus.hidden, ModerationStatus.failed}
)


async def _deliver_earned_invitations(
    character_id: int,
    praxes: list[Praxis],
    contributions: dict[int, Contribution],
    session: AsyncSession,
    era: EraConfig,
    era_row: Era,
) -> None:
    """Deliver any newly-earned faction invitation letters (ADR-0022).

    A character earns faction X's invite once it has ``era.invitation_task_threshold``
    completed (distinct) tasks for X **and** ``era.invitation_point_threshold`` points
    from X's tasks — both from this same submitted-praxis set recalc already scored, so
    vote-driven point gains trigger delivery too. Idempotent on the
    (character, faction, era) unique key.
    """
    if not praxes:
        return

    task_rows = await session.execute(
        select(Task.id, Task.primary_faction_slug).where(
            Task.id.in_({p.task_id for p in praxes})
        )
    )
    faction_by_task: dict[int, str] = {tid: slug for tid, slug in task_rows.all()}

    task_ids_by_faction: dict[str, set[int]] = {}
    points_by_faction: dict[str, float] = {}
    for praxis in praxes:
        slug = faction_by_task.get(praxis.task_id) or "na"
        if slug in _NON_INVITE_FACTION_SLUGS:
            continue
        task_ids_by_faction.setdefault(slug, set()).add(praxis.task_id)
        contribution = contributions.get(praxis.id)
        if contribution is not None:
            points_by_faction[slug] = points_by_faction.get(slug, 0.0) + contribution.total

    qualifying = {
        slug
        for slug, task_ids in task_ids_by_faction.items()
        if len(task_ids) >= era.invitation_task_threshold
        and points_by_faction.get(slug, 0.0) >= era.invitation_point_threshold
    }
    if not qualifying:
        return

    already = await session.execute(
        select(InvitationLetter.faction_slug).where(
            InvitationLetter.character_id == character_id,
            InvitationLetter.era_id == era_row.id,
        )
    )
    held = {slug for (slug,) in already.all()}
    for slug in qualifying - held:
        # ponytail: the (character, faction, era) UNIQUE constraint is the real
        # backstop against a concurrent double-deliver; the held-set check avoids
        # the common case.
        session.add(
            InvitationLetter(character_id=character_id, faction_slug=slug, era_id=era_row.id)
        )


async def recalculate_character_stats(
    character_id: int,
    session: AsyncSession,
    era: EraConfig = CURRENT_ERA,
    era_row: Era | None = None,
) -> None:
    """Recompute and persist score, level, and vote budget for a character.

    Gathers all submitted praxes the character has a stake in — solo/duel praxes
    they authored, plus collab praxes they are a member of — then delegates all
    scoring arithmetic to ``compute_contributions`` (ADR-0014). Praxes in an
    ``_UNSCORED_MODERATION_STATUSES`` state are left out of the gather entirely,
    so they also stop counting toward faction invitations (ADR-0022).

    Safe to call on praxis creation (0 votes → base points only) or after any
    vote change.

    Pass ``era_row`` when calling in a loop to avoid an extra query per iteration.
    """
    if era_row is None:
        era_row = await get_current_era_row(session)

    author = await session.get(Character, character_id)
    if author is None:
        return

    # Pre-fetch current stats to get the author's level for meta-task eligibility.
    # Slight staleness here is acceptable — the level is used only as a gate on
    # bonus points, not as the value being computed.
    stats = await get_or_create_stats(session, character_id, era_row.id)
    author_level = stats.level

    # Gather solo praxes (including duel sides) authored by this character.
    solo_result = await session.execute(
        select(Praxis).where(
            Praxis.created_by_id == character_id,
            Praxis.type == PraxisType.solo,
            Praxis.status == PraxisStatus.submitted,
            Praxis.moderation_status.notin_(list(_UNSCORED_MODERATION_STATUSES)),
        )
    )
    solo_praxes = list(solo_result.scalars().all())

    # Gather collab praxes this character is a member of.
    collab_result = await session.execute(
        select(Praxis)
        .join(PraxisMember, PraxisMember.praxis_id == Praxis.id)
        .where(
            PraxisMember.character_id == character_id,
            Praxis.type == PraxisType.collab,
            Praxis.status == PraxisStatus.submitted,
            Praxis.moderation_status.notin_(list(_UNSCORED_MODERATION_STATUSES)),
        )
    )
    collab_praxes = list(collab_result.scalars().all())

    all_praxes = solo_praxes + collab_praxes
    contributions = await compute_contributions(
        all_praxes, author, era, session, character_level=author_level
    )
    # round(), not int(): int() truncates toward zero, so a true total of 49.9
    # banked as 49 (ADR-0053). compute_level is directly downstream.
    total_score = round(sum(c.total for c in contributions.values()))

    # Vote budget is computed on read (services.scoring.compute_votes_available)
    # from stats.score and stats.votes_spent_this_era, so no bookkeeping needed here.
    stats.score = total_score
    stats.all_time_score = max(stats.all_time_score, total_score)
    stats.level = compute_level(total_score, era)

    # ADR-0022: deliver any faction invitations this submitted-praxis set now earns.
    await _deliver_earned_invitations(
        character_id, all_praxes, contributions, session, era, era_row
    )
