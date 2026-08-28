"""Tests for the public /game-config endpoint."""
import pytest
from httpx import AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession

from game_config import CURRENT_ERA
from models.account import Account
from services.progression import HIDDEN_UNTIL_REVEALED_UNLOCK_KEY
from services.scoring import sole_tie_taker_slug


@pytest.mark.asyncio
async def test_get_game_config_returns_current_era(client: AsyncClient):
    """GET /game-config exposes the live era config with no auth required."""
    resp = await client.get("/game-config")
    assert resp.status_code == 200
    data = resp.json()

    assert data["era_name"] == CURRENT_ERA.name
    assert data["level_thresholds"] == list(CURRENT_ERA.level_thresholds)
    assert data["max_task_signups"] == CURRENT_ERA.max_task_signups

    # Pending-publish silence-is-consent window (ADR-0012): duration only,
    # since submit_proposed_at (the start) is already on PraxisOut.
    assert data["collab_auto_submit_days"] == CURRENT_ERA.collab_auto_submit_days

    # Every configured faction is present with its scoring modifiers.
    assert len(data["factions"]) == len(CURRENT_ERA.factions)
    slugs = {faction["slug"] for faction in data["factions"]}
    assert slugs == set(CURRENT_ERA.factions.keys())

    # level_profiles serialized index-aligned with level_thresholds, emitting
    # copy KEYS not prose (ADR-0031).
    assert len(data["level_profiles"]) == len(CURRENT_ERA.level_profiles)
    served_level_1 = data["level_profiles"][1]
    assert served_level_1["rank_key"] == CURRENT_ERA.level_profiles[1].rank_key
    assert "rank" not in served_level_1
    first_unlock = served_level_1["unlocks"][0]
    assert first_unlock["kind"] in {"ability", "sense"}
    assert first_unlock["key"] == CURRENT_ERA.level_profiles[1].unlocks[0].key
    assert "name" not in first_unlock and "desc" not in first_unlock


@pytest.mark.asyncio
async def test_game_config_omits_rules_no_client_reads(client: AsyncClient):
    """Four dead wire fields are gone from /game-config (#1387).

    All four stay LIVE rules on ``EraConfig``: the server enforces the
    collaboration gate, ``services.faction_service`` branches on
    ``can_always_rejoin``, and the vote budget is computed on read (ADR-0043).
    Only the projection onto the public config payload went.

    Albescent is named explicitly because it is the one faction whose
    ``can_always_rejoin`` is True — a leftover serializer would emit ``true``
    there rather than a defaulted false.
    """
    data = (await client.get("/game-config")).json()

    for field in (
        "collaboration_level_required",
        "vote_budget_base",
        "vote_budget_multiplier",
    ):
        assert field not in data

    assert CURRENT_ERA.factions["albescent"].can_always_rejoin is True
    for faction in data["factions"]:
        assert "can_always_rejoin" not in faction


@pytest.mark.asyncio
async def test_game_config_carries_the_array_flag(client: AsyncClient):
    """`reads_the_array` reaches the client, because the CLIENT is the gate (#1869).

    Singularity's perk is entirely browser-side — the console prints config the
    payload already carries — so unlike `can_always_rejoin` above, which was
    withdrawn for having no reader, this flag exists precisely to have one. The
    neat part is that it rides in the very payload the perk prints.

    Anonymous on purpose: there is nothing to withhold here and no auth to gate
    on, which is the whole reason no server-side enforcement door was added.
    """
    data = (await client.get("/game-config")).json()
    served = {faction["slug"]: faction["reads_the_array"] for faction in data["factions"]}

    assert served == {
        slug: faction.reads_the_array for slug, faction in CURRENT_ERA.factions.items()
    }

    # Non-vacuity. Compared field-for-field against the config above, an era in
    # which nobody holds the perk would pass just as happily for a serializer
    # that emitted a constant False. So name the holder by the PERK, never by
    # slug (#2708) — Era 1's is Singularity, plus Albescent, which inherits it.
    # What each era *grants* is its own rules module's job (#2709).
    holders = {
        slug
        for slug, faction in CURRENT_ERA.factions.items()
        if faction.reads_the_array
    }
    if not holders:
        pytest.skip(f"no faction in {CURRENT_ERA.config_key} reads the array")
    assert {slug for slug, value in served.items() if value} == holders


@pytest.mark.asyncio
async def test_game_config_carries_the_tie_taking_flag(client: AsyncClient):
    """The seam #2664 exists for: ONE rule, served to the half that displays it.

    The take-the-tie ability is computed twice — once by the server, when it
    banks a tied duel's points (``services.scoring.sole_tie_taker_slug``), and
    once by the browser, when it shows a player their stakes before they cast
    (``useDuelStakes``). Before #2664 both were ``faction == "snide"``: two
    copies of a rule, consistent only by luck, and neither movable by an era.

    So this asserts more than "the field is emitted". It asserts the flag the
    client is handed picks out **exactly** the factions the scoring predicate
    treats as tie takers. Given that, and given the client reads the flag rather
    than re-deriving the rule, the stakes shown and the points banked cannot
    disagree — they are one rule with one source.
    """
    data = (await client.get("/game-config")).json()
    served = {
        faction["slug"]: faction["takes_duel_ties"] for faction in data["factions"]
    }

    assert served == {
        slug: faction.takes_duel_ties
        for slug, faction in CURRENT_ERA.factions.items()
    }

    # The flag the wire carries IS the rule the scorer applies. Ask the
    # predicate itself, per faction, against a side that does not hold the perk.
    holders = {slug for slug, value in served.items() if value}
    if not holders:
        pytest.skip(f"no faction in {CURRENT_ERA.config_key} takes duel ties")
    a_non_holder = next(slug for slug, value in served.items() if not value)
    scored = {
        slug
        for slug in served
        if sole_tie_taker_slug(slug, a_non_holder, CURRENT_ERA) == slug
    }
    assert scored == holders

    # And the perk is self-cancelling: two holders make a real tie, which is why
    # it is the one perk the inheritor does not pick up (#2664).
    for slug in holders:
        assert sole_tie_taker_slug(slug, slug, CURRENT_ERA) is None
    inheritors = {
        slug
        for slug, faction in CURRENT_ERA.factions.items()
        if faction.inherits_faction_perks
    }
    assert not (inheritors & holders), (
        "an inheritor holding the tie-taking perk would DESTROY the sole "
        "holder's ability, not gain one"
    )


# ---------------------------------------------------------------------------
# The secret-society rung over the wire (#1891)
# ---------------------------------------------------------------------------


def _ladder_unlock_keys(data: dict) -> set[str]:
    return {
        unlock["key"]
        for profile in data["level_profiles"]
        for unlock in profile["unlocks"]
    }


@pytest.mark.asyncio
async def test_join_albescent_rung_hidden_from_anonymous(client: AsyncClient):
    """This endpoint needs no auth, so the rung named Albescent to every visitor.

    The optional-auth dependency is the whole point of the route change: an
    anonymous caller resolves to ``None`` and gets the filtered ladder.
    """
    data = (await client.get("/game-config")).json()
    assert HIDDEN_UNTIL_REVEALED_UNLOCK_KEY not in _ladder_unlock_keys(data)


@pytest.mark.asyncio
async def test_join_albescent_rung_hidden_from_unrevealed_account(
    client: AsyncClient,
    account: Account,
    auth_headers: dict,
):
    """A signed-in account without the sticky reveal is told the same story."""
    assert account.albescent_revealed is False
    data = (await client.get("/game-config", headers=auth_headers)).json()
    assert HIDDEN_UNTIL_REVEALED_UNLOCK_KEY not in _ladder_unlock_keys(data)


@pytest.mark.asyncio
async def test_join_albescent_rung_shown_to_revealed_account(
    client: AsyncClient,
    account: Account,
    auth_headers: dict,
    db_session: AsyncSession,
):
    """A revealed account's ladder is unchanged — the rung is back."""
    account.albescent_revealed = True
    await db_session.flush()

    data = (await client.get("/game-config", headers=auth_headers)).json()
    assert HIDDEN_UNTIL_REVEALED_UNLOCK_KEY in _ladder_unlock_keys(data)


@pytest.mark.asyncio
async def test_hiding_the_rung_keeps_every_level_in_place(client: AsyncClient):
    """``LevelUpWatcher`` indexes ``level_profiles`` BY LEVEL.

    Dropping a profile rather than a rung would silently re-point every rank
    above it, so the served ladder must stay index-aligned with
    ``level_thresholds`` and keep every ``rank_key``.
    """
    data = (await client.get("/game-config")).json()

    assert len(data["level_profiles"]) == len(CURRENT_ERA.level_profiles)
    for served, configured in zip(data["level_profiles"], CURRENT_ERA.level_profiles):
        assert served["rank_key"] == configured.rank_key
        assert [unlock["key"] for unlock in served["unlocks"]] == [
            unlock.key
            for unlock in configured.unlocks
            if unlock.key != HIDDEN_UNTIL_REVEALED_UNLOCK_KEY
        ]
