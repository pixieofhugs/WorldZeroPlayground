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


def _account(*, revealed: bool) -> Account:
    return Account(email="a@example.com", albescent_revealed=revealed)


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
