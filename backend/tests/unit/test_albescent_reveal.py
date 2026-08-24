"""The one definition of "revealed" — including #2400's admin bypass.

Every surface that hides Albescent asks
:func:`services.albescent_reveal.is_albescent_revealed`, so this is the seam
where "an admin is treated as revealed" is decided once. The bypass is a READ:
nothing here writes ``Account.albescent_revealed``, which stays sticky and
earned (ADR-0027 / #390).

Seeing is not joining. ``can_start_as_albescent`` and ``defect_to_faction``'s
guard never consult admin status, and the integration counterpart
(``tests/integration/test_albescent_admin_reveal.py``) pins that an admin who
can see the order is still refused by it.
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
    """No account, no reveal — the module's fail-closed promise outranks the flag.

    ``is_admin=True`` with ``account=None`` is unreachable through the app (the
    flag is derived from an account), so this pins the guard rather than a
    behaviour anyone relies on.
    """
    assert is_albescent_revealed(None) is False
    assert is_albescent_revealed(None, is_admin=True) is False


def test_admin_bypass_does_not_write_the_sticky_column():
    """The bypass lives at the read. The column must be untouched by asking."""
    account = _account(revealed=False)
    is_albescent_revealed(account, is_admin=True)
    assert account.albescent_revealed is False


# ---------------------------------------------------------------------------
# #2518 — reveal on QUALIFY, not on join
# ---------------------------------------------------------------------------


def test_a_qualified_account_that_never_joined_is_revealed():
    """The #2518 defect at its seam: the earned door now opens the word too.

    ``albescent_unlocked`` without ``albescent_revealed`` is exactly the state
    every account reaches under #2399's rule, because only a join ever wrote the
    reveal column.
    """
    assert is_albescent_revealed(_account(revealed=False, unlocked=True)) is True


def test_the_widening_is_a_union_not_a_replacement():
    """An old join keeps the reveal after #2399 evicted it from the faction.

    This is the owner account's shape, and the reason the predicate is ``or``
    rather than an assignment: eviction moved ``faction_slug`` and unset neither
    column, so revealed-but-no-longer-unlocked is a real, reachable state.
    """
    assert is_albescent_revealed(_account(revealed=True, unlocked=False)) is True


def test_neither_flag_is_still_the_mask():
    """Widening reveal must not leak the society to someone who has not earned it.

    ADR-0027 is unamended for this account.
    """
    assert is_albescent_revealed(_account(revealed=False, unlocked=False)) is False


def test_reading_the_unlock_does_not_write_the_reveal():
    """Derived, never stamped — one record of "earned", not two that can drift."""
    account = _account(revealed=False, unlocked=True)
    assert is_albescent_revealed(account) is True
    assert account.albescent_revealed is False


def test_an_unflushed_account_answers_False_and_not_None():
    """Both columns default at *flush*, so an unflushed ``Account`` holds ``None``.

    A bare ``or`` chain returns that ``None`` — falsy, so nothing misbehaves, but
    the ``-> bool`` annotation would be a lie and every ``is False`` assertion in
    this file would fail against a value that is not ``False``. The ``bool()``
    wrapper is load-bearing; this is its tripwire.
    """
    account = Account(email="unflushed@example.com")
    assert account.albescent_unlocked is None
    assert is_albescent_revealed(account) is False
