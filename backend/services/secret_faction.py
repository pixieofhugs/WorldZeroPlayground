"""Read and write the sticky secret-faction stamps (ADR-0097)."""

from typing import Literal

from models.account import Account
from models.account_secret_faction import AccountSecretFaction

StampKind = Literal["revealed", "unlocked", "glimpsed"]


def has_stamp(account: Account | None, slug: str | None, kind: StampKind) -> bool:
    """False for no account or no secret faction (``slug`` None): fail closed."""
    if account is None or slug is None:
        return False
    return any(
        getattr(row, kind)
        for row in account.secret_faction_stamps
        if row.faction_slug == slug
    )


def set_stamp(account: Account, slug: str, kind: StampKind) -> bool:
    """Monotonic: never unsets. True only if this call flipped it."""
    if has_stamp(account, slug, kind):
        return False
    for row in account.secret_faction_stamps:
        if row.faction_slug == slug:
            setattr(row, kind, True)
            return True
    account.secret_faction_stamps.append(
        AccountSecretFaction(faction_slug=slug, **{kind: True})
    )
    return True
