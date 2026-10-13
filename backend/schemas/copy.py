"""Wire contracts for the copy-override store (``models/copy_override.py``).

The validation here is the trust boundary that matters: an accepted ``value``
renders on every visitor's screen, anonymous included, so a malformed write is
not a private mistake. Reject, never truncate — a silently shortened string is
a wording change nobody authored.
"""

from pydantic import ConfigDict, Field

from schemas.base import WireModel

#: Column widths in ``copy_override``. Same numbers, one place.
MAX_NS_LENGTH = 64
MAX_KEY_LENGTH = 255
#: No column cap on ``value`` (it is TEXT); this is a sanity ceiling. The
#: longest string in the shipped catalogs is a few hundred characters.
MAX_VALUE_LENGTH = 2000

#: The shape i18next keys actually take: word characters, dots, dashes.
#: ``\w`` covers underscores. Notably excludes whitespace, quotes and ``[]``.
_NS_PATTERN = r"^[\w-]+$"
_KEY_PATTERN = r"^[\w.-]+$"


class CopyOverrideIn(WireModel):
    """One override, as an admin submits it."""

    # Strip first, then apply the constraints — so " " fails min_length rather
    # than being stored as a blank string that blanks a label site-wide.
    model_config = ConfigDict(str_strip_whitespace=True)

    ns: str = Field(..., min_length=1, max_length=MAX_NS_LENGTH, pattern=_NS_PATTERN)
    key: str = Field(..., min_length=1, max_length=MAX_KEY_LENGTH, pattern=_KEY_PATTERN)
    value: str = Field(..., min_length=1, max_length=MAX_VALUE_LENGTH)


class CopyOverrideOut(WireModel):
    """One override, as every visitor reads it.

    No ``updated_by`` / ``updated_at``: this response is public, and who edited
    a string is not a fact about the string. The audit columns stay in the DB.
    """

    model_config = ConfigDict(from_attributes=True)

    ns: str
    key: str
    value: str
