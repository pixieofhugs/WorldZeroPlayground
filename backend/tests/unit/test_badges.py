"""Unit tests for the badge registry conditions (ADR-0033, #459, #748).

Covers the seed pair — sock_puppeteer / sock_puppet — across 1-character and
2-character accounts, the two duel badges (duelist #748, duel_victor #823), plus
registry invariants. (A
0-character context cannot exist: the context is always built *for* a
character, so the count includes it.)
"""
from badges import ALL_BADGES, BadgeContext
from services.badge import evaluate_badges


def _context(
    *,
    account_character_count: int = 1,
    is_earliest_on_account: bool = True,
    is_duel_winner: bool = False,
    won_duel_last_era: bool = False,
) -> BadgeContext:
    return BadgeContext(
        account_character_count=account_character_count,
        is_earliest_on_account=is_earliest_on_account,
        is_duel_winner=is_duel_winner,
        won_duel_last_era=won_duel_last_era,
    )


def _badge_keys(context: BadgeContext) -> list[str]:
    return [badge.key for badge in evaluate_badges(context)]


def test_solo_character_earns_nothing() -> None:
    assert _badge_keys(_context()) == []


def test_earliest_of_two_is_sock_puppeteer() -> None:
    context = _context(account_character_count=2, is_earliest_on_account=True)
    assert _badge_keys(context) == ["sock_puppeteer"]


def test_later_of_two_is_sock_puppet() -> None:
    context = _context(account_character_count=2, is_earliest_on_account=False)
    assert _badge_keys(context) == ["sock_puppet"]


def test_later_of_three_is_sock_puppet() -> None:
    context = _context(account_character_count=3, is_earliest_on_account=False)
    assert _badge_keys(context) == ["sock_puppet"]


def test_duel_winner_earns_duelist() -> None:
    assert _badge_keys(_context(is_duel_winner=True)) == ["duelist"]


def test_non_duel_winner_does_not_earn_duelist() -> None:
    assert "duelist" not in _badge_keys(_context(is_duel_winner=False))


def test_duelist_is_independent_of_the_sock_pair() -> None:
    """The badges stack — a puppeteer winning a duel holds both."""
    context = _context(
        account_character_count=2,
        is_earliest_on_account=True,
        is_duel_winner=True,
    )
    assert _badge_keys(context) == ["sock_puppeteer", "duelist"]


def test_last_era_winner_earns_duel_victor() -> None:
    assert _badge_keys(_context(won_duel_last_era=True)) == ["duel_victor"]


def test_duel_victor_is_absent_without_a_frozen_last_era_win() -> None:
    """A live lead is `duelist`'s business — this badge needs a finalized result."""
    assert _badge_keys(_context(is_duel_winner=True)) == ["duelist"]


def test_a_last_era_winner_normally_holds_both_duel_badges() -> None:
    """`duelist` is "won or winning" and includes frozen wins (owner ruling, #748).

    So the two duel badges stack rather than replace: the context the service
    builds sets both flags for a last-era winner. They are separate facts and the
    registry evaluates them independently — this pins the expected pairing.
    """
    context = _context(is_duel_winner=True, won_duel_last_era=True)
    assert _badge_keys(context) == ["duelist", "duel_victor"]


def test_registry_keys_are_unique() -> None:
    keys = [badge.key for badge in ALL_BADGES]
    assert len(keys) == len(set(keys))


def test_registry_badges_have_display_names() -> None:
    assert all(badge.name for badge in ALL_BADGES)
