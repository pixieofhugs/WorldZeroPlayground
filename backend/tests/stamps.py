"""Test-side read/write of an account's stamps for the live era's secret faction."""

from game_config import CURRENT_ERA
from models.account import Account
from models.account_secret_faction import AccountSecretFaction
from services.secret_faction import StampKind, has_stamp


def stamped(account: Account, kind: StampKind, slug: str | None = None) -> bool:
    return has_stamp(account, slug or CURRENT_ERA.secret_faction_slug, kind)


def stamp(
    account: Account, kind: StampKind, value: bool = True, slug: str | None = None
) -> None:
    slug = slug or CURRENT_ERA.secret_faction_slug
    for row in account.secret_faction_stamps:
        if row.faction_slug == slug:
            setattr(row, kind, value)
            return
    account.secret_faction_stamps.append(
        AccountSecretFaction(faction_slug=slug, **{kind: value})
    )


def account_with(email: str = "a@example.com", **kinds: bool) -> Account:
    account = Account(email=email)
    for kind, value in kinds.items():
        stamp(account, kind, value)
    return account
