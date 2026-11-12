"""The one definition of "revealed", including #2400's read-only admin bypass.

``Account.albescent_revealed`` stays sticky and earned (ADR-0027). Seeing is not
joining: see ``tests/integration/test_albescent_admin_reveal.py``.
"""

from models.account import Account
from services.albescent_reveal import is_albescent_revealed


def _account(*, revealed: bool, unlocked: bool = False) -> Account:
    return Account(
        email="a@example.com",
        albescent_revealed=revealed,
        albescent_unlocked=unlocked,
    )


def test_unrevealed_non_admin_is_not_revealed():
    assert is_albescent_revealed(_account(revealed=False)) is False


def test_revealed_non_admin_is_revealed():
    assert is_albescent_revealed(_account(revealed=True)) is True


def test_unrevealed_admin_is_revealed():
    """#2400: an admin sees the order without having earned it."""
    assert is_albescent_revealed(_account(revealed=False), is_admin=True) is True


def test_anonymous_caller_is_never_revealed_even_flagged_admin():
    """Fail-closed outranks the flag (unreachable via the app; pins the guard)."""
    assert is_albescent_revealed(None) is False
    assert is_albescent_revealed(None, is_admin=True) is False


def test_admin_bypass_does_not_write_the_sticky_column():
    account = _account(revealed=False)
    is_albescent_revealed(account, is_admin=True)
    assert account.albescent_revealed is False


# #2518: reveal on qualify, not on join


def test_a_qualified_account_that_never_joined_is_revealed():
    assert is_albescent_revealed(_account(revealed=False, unlocked=True)) is True


def test_the_widening_is_a_union_not_a_replacement():
    """Eviction (#2399) unset neither column, so revealed-not-unlocked is real."""
    assert is_albescent_revealed(_account(revealed=True, unlocked=False)) is True


def test_neither_flag_is_still_the_mask():
    assert is_albescent_revealed(_account(revealed=False, unlocked=False)) is False


def test_reading_the_unlock_does_not_write_the_reveal():
    """Derived, never stamped: one record of "earned"."""
    account = _account(revealed=False, unlocked=True)
    assert is_albescent_revealed(account) is True
    assert account.albescent_revealed is False


def test_an_unflushed_account_answers_False_and_not_None():
    """Columns default at flush; the ``bool()`` wrapper is load-bearing."""
    account = Account(email="unflushed@example.com")
    assert account.albescent_unlocked is None
    assert is_albescent_revealed(account) is False
