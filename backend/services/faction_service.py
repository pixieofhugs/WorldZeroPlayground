"""Faction lifecycle: defection and invitation letters."""

from sqlalchemy import delete, select
from sqlalchemy.ext.asyncio import AsyncSession

from errors import ErrorCode, raise_coded
from faction_slugs import UNAFFILIATED_FACTION_SLUG
from game_config import CURRENT_ERA, EraConfig
from models.account import Account
from models.character import Character
from models.character_stats import CharacterStats
from models.faction import Faction, FactionStatus
from models.faction_defection_history import FactionDefectionHistory
from models.invitation_letter import InvitationLetter
from models.task import Task
from services.character import ALBESCENT_FACTION_SLUG, can_start_as_albescent
from services.era import get_current_era_row, get_or_create_stats

# UNAFFILIATED_FACTION_SLUG is imported above from faction_slugs, which owns it
# (#1559). It used to be re-declared here and again in services/scoring.py.


# ---------------------------------------------------------------------------
# Faction gating — the single seam for "does a faction rule change this?" (#171)
# ---------------------------------------------------------------------------


def faction_permits(
    character: Character,
    task: Task,
    era: EraConfig = CURRENT_ERA,
) -> bool:
    """The one home for every faction gate on acting on a task (ADR-0029).

    Ask this predicate — never re-implement a faction check at a call site —
    whenever a decision might be changed by the actor's or the task's faction.
    A new faction rule is then a one-function edit that every caller inherits.

    There is currently **no** active faction gate. Standard tasks have always
    been faction-open, and metatasks are now faction-open too: any
    character may act on any faction's metatask, regardless of their own
    faction. ``task.metatask_faction_slug`` now records only which faction
    authored a metatask — it no longer gates who may apply it. The seam is kept
    (ADR-0029) so re-introducing a faction rule stays a one-function edit that
    every caller inherits.

    This is the *faction* axis only. Level gates, the task-bank cap, and
    listing visibility (see :func:`hidden_faction_slugs`) are separate axes and
    live elsewhere.
    """
    return True


async def hidden_faction_slugs(session: AsyncSession) -> list[str]:
    """Slugs of ``hidden`` factions — the system rows, and nothing else.

    ``hidden`` **only**, never "not ``visible``" (ADR-0087). Since #2706 there is
    a third status, and a ``retired`` faction — one a past era listed and the
    live one does not — must not land here: its tasks stay in the archive. This
    predicate is the seam that would take them out of it, so widening the
    comparison back to ``!=`` would empty most of a closed era's task history off
    the site while the praxes written against those tasks stayed visible.

    Listing visibility is a faction-*status* axis, not a per-character permit,
    so it can't route through :func:`faction_permits`; it lives here so all
    faction-rule knowledge still has one home. Task listings exclude these.

    The unaffiliated sentinel is subtracted from the result: ``na`` is seeded
    as a ``hidden`` Faction row (``seed.py``), but hidden factions are excluded
    from listings because nobody should act on them, whereas
    *unaffiliated* is a state every generic / cross-faction task carries and
    must stay listable. Without this, player-proposed tasks — which default to
    ``na`` (``services.task.propose_task``) — vanish from the Tasks page on a
    freshly seeded database. This does not touch ``GET /factions``, which reads
    ``visible`` rows directly, so ``na`` remains absent from the registry.
    """
    result = await session.execute(
        select(Faction.slug).where(Faction.status == FactionStatus.hidden)
    )
    return [row[0] for row in result.all() if row[0] != UNAFFILIATED_FACTION_SLUG]


# ---------------------------------------------------------------------------
# Defection
# ---------------------------------------------------------------------------


async def can_join_faction(
    character_id: int,
    target_slug: str,
    era_id: int,
    session: AsyncSession,
    era: EraConfig = CURRENT_ERA,
) -> bool:
    """Check whether a character is allowed to join the target faction.

    Returns False if the character has previously defected from this faction
    in the current era and the faction does not allow rejoining.
    """
    faction_config = era.factions.get(target_slug)
    if faction_config is None:
        return False
    if faction_config.can_always_rejoin:
        return True
    result = await session.execute(
        select(FactionDefectionHistory).where(
            FactionDefectionHistory.character_id == character_id,
            FactionDefectionHistory.faction_slug == target_slug,
            FactionDefectionHistory.era_id == era_id,
        )
    )
    return result.scalar_one_or_none() is None


def _is_rejoinable(faction_slug: str, era: EraConfig) -> bool:
    """Whether leaving ``faction_slug`` still leaves the door open (#2218).

    An era can retire a faction, so a slug with no config is treated as closed
    rather than assumed open.
    """
    faction_config = era.factions.get(faction_slug)
    return faction_config is not None and faction_config.can_always_rejoin


async def unjoinable_faction_slugs(
    character_id: int,
    era_id: int,
    session: AsyncSession,
    era: EraConfig = CURRENT_ERA,
) -> set[str]:
    """Factions this character has left this era and cannot go back to (#2218).

    The delivery-side reading of the same rule :func:`can_join_faction` enforces
    at the door: an invitation to one of these is an invitation to an action
    ``defect_to_faction`` answers with ``faction_rejoin_forbidden``.
    """
    return {
        defection.faction_slug
        for defection in await get_defection_history(character_id, era_id, session)
        if not _is_rejoinable(defection.faction_slug, era)
    }


async def has_invitation(
    character_id: int,
    faction_slug: str,
    era_id: int,
    session: AsyncSession,
) -> bool:
    """Whether the character holds this faction's invitation letter for the era.

    Per-character, faction- and era-scoped — the defection-side lookup for the
    invitation gate (#454). Creation-time gating (ADR-0019) pools invitations
    across the account instead; see
    :func:`services.character.get_account_invited_faction_slugs`.
    """
    result = await session.execute(
        select(InvitationLetter.id).where(
            InvitationLetter.character_id == character_id,
            InvitationLetter.faction_slug == faction_slug,
            InvitationLetter.era_id == era_id,
        )
    )
    return result.scalar_one_or_none() is not None


async def defect_to_faction(
    character: Character,
    target_slug: str,
    session: AsyncSession,
    era: EraConfig = CURRENT_ERA,
) -> Character:
    """Move a character to a new faction, recording the defection.

    Works for both the initial faction join and later defections.
    Raises 422 if the target is the current faction or the unaffiliated
    sentinel, 404 if the target doesn't exist, and 403 if the player previously
    left this faction and it doesn't allow rejoining, if the character does not
    hold the target faction's current-era invitation letter (#454), or — for
    Albescent — if the account has never earned the unlock, or if this character
    is itself at ``era.albescent_level_required`` (#2399: "never the earner").
    """
    if character.faction_slug == target_slug:
        raise_coded(
            422,
            ErrorCode.faction_already_member,
            "Already a member of this faction.",
        )

    # `na` is the unaffiliated sentinel, not a joinable destination (ADR-0019/0030).
    if target_slug == UNAFFILIATED_FACTION_SLUG:
        raise_coded(
            422,
            ErrorCode.faction_not_selectable,
            "This faction cannot be chosen directly.",
        )

    faction_config = era.factions.get(target_slug)
    if faction_config is None:
        raise_coded(404, ErrorCode.faction_not_found, "Faction not found.")

    era_row = await get_current_era_row(session)

    if not await can_join_faction(
        character.id, target_slug, era_row.id, session, era
    ):
        raise_coded(
            403,
            ErrorCode.faction_rejoin_forbidden,
            "Cannot rejoin a faction you have left.",
        )

    # #454: switching into a faction requires holding that faction's invitation
    # letter for the current era — the same rule that gates picking a faction at
    # character creation (ADR-0019), with no grandfathering for previously-held
    # factions. `can_always_rejoin` factions (Albescent) are exempt: the
    # ADR-0021 eligibility bar below is their gate instead, never an invitation.
    if not faction_config.can_always_rejoin and not await has_invitation(
        character.id, target_slug, era_row.id, session
    ):
        raise_coded(
            403,
            ErrorCode.faction_invitation_required,
            "You don't hold an invitation for that faction.",
        )

    # #2399 (supersedes ADR-0021): Albescent is joined in the field via
    # defection, and the door has two locks. Albescent's can_always_rejoin=True
    # slips the selectability guard above, so both are enforced here.
    if target_slug == ALBESCENT_FACTION_SLUG:
        # (1) The ACCOUNT must have earned it — one of its lives, once, at the
        # level and covering every faction. Sticky, so this is a column read.
        if not await can_start_as_albescent(character.account_id, session, era):
            raise_coded(
                403,
                ErrorCode.faction_albescent_not_eligible,
                "The order has not extended its hand to you.",
            )
        # (2) …and THIS life must still have its climb ahead of it. **The only
        # maximum-level gate in the game**: every other level test in this
        # codebase is a floor, and this one is a ceiling, so it reads backwards
        # on purpose. The life that earned the door is exactly the life that may
        # not walk through it — Albescent is the New Game+ faction, taken by a
        # sibling who starts over, never by the one who finished.
        #
        # Character creation needs no twin of this check: a new life is level 0.
        stats = await get_or_create_stats(session, character.id, era_row.id)
        if stats.level >= era.albescent_level_required:
            raise_coded(
                403,
                ErrorCode.faction_albescent_new_game_plus_only,
                "Available only for New Game+.",
            )

    # Record defection from current faction (if it's a real faction, not na)
    old_slug = character.faction_slug
    if old_slug and old_slug != UNAFFILIATED_FACTION_SLUG:
        defection = FactionDefectionHistory(
            character_id=character.id,
            faction_slug=old_slug,
            era_id=era_row.id,
        )
        session.add(defection)

        # #2218: walking out retires that faction's letter. Left in place it is
        # still a live row, and it re-arms itself the moment you go: the feed
        # reads "answered" off the character (ADR-0070 — a letter for the
        # faction you already hold asks nothing), so leaving turns an old letter
        # back into an unanswered request and the bell offers a rejoin the
        # guard above refuses. Deleted, not flagged, because a flagged row would
        # need every reader to remember to skip it. Rejoinable factions keep
        # theirs — that invitation still works.
        if not _is_rejoinable(old_slug, era):
            await session.execute(
                delete(InvitationLetter).where(
                    InvitationLetter.character_id == character.id,
                    InvitationLetter.faction_slug == old_slug,
                    InvitationLetter.era_id == era_row.id,
                )
            )

    character.faction_slug = target_slug

    # ADR-0027 / #390: joining Albescent permanently reveals the secret society to
    # this account. Sticky/monotonic — set once, never unset. Do NOT derive from
    # live membership; it must survive age-out, death, and active-character switch.
    if target_slug == ALBESCENT_FACTION_SLUG:
        account = await session.get(Account, character.account_id)
        if account is not None:
            account.albescent_revealed = True

    await session.flush()
    await session.refresh(character)
    return character


async def get_defection_history(
    character_id: int,
    era_id: int,
    session: AsyncSession,
) -> list[FactionDefectionHistory]:
    """Return all defection records for a character in the given era."""
    result = await session.execute(
        select(FactionDefectionHistory).where(
            FactionDefectionHistory.character_id == character_id,
            FactionDefectionHistory.era_id == era_id,
        )
    )
    return list(result.scalars().all())


# ---------------------------------------------------------------------------
# Invitation Letters
# ---------------------------------------------------------------------------


async def get_invitation_status(
    character_id: int,
    era_id: int,
    session: AsyncSession,
    era: EraConfig = CURRENT_ERA,
) -> tuple[dict[str, str], list[InvitationLetter]]:
    """Return the per-faction relationship status **and** the letters behind it.

    The status map keys every faction slug in the era to one of "member",
    "invited", "not_invited", "defected", "can_return".

    The letters come back alongside it because ``GET /factions/invitations`` used
    to re-run this function's exact ``InvitationLetter`` select — same character,
    same era row — and callers paired the two requests (#1384). Handing back the
    rows already read is what lets one response serve both, so the *status* view
    (a slug's state) and the *letter* view (when it arrived) never cost two
    queries again. Only the slugs are needed here; the caller wants
    ``delivered_at`` too, so the rows are not reduced before returning.
    """
    character = await session.get(Character, character_id)
    if character is None:
        return {}, []

    current_faction = character.faction_slug

    defections = await get_defection_history(character_id, era_id, session)
    defected_slugs = {defection.faction_slug for defection in defections}

    invitation_result = await session.execute(
        select(InvitationLetter).where(
            InvitationLetter.character_id == character_id,
            InvitationLetter.era_id == era_id,
        )
    )
    letters = list(invitation_result.scalars().all())
    invited_slugs = {letter.faction_slug for letter in letters}

    status_map: dict[str, str] = {}
    for slug, faction_config in era.factions.items():
        if slug == current_faction:
            status_map[slug] = "member"
        elif slug in defected_slugs and faction_config.can_always_rejoin:
            status_map[slug] = "can_return"
        elif slug in defected_slugs:
            status_map[slug] = "defected"
        elif slug in invited_slugs:
            status_map[slug] = "invited"
        else:
            status_map[slug] = "not_invited"

    return status_map, letters
