"""Copy-override wire contracts: the trust boundary for site-wide text.

Reject, never truncate: a shortened string is a wording change nobody authored.
"""

from pydantic import ConfigDict, Field

from schemas.base import WireModel

#: Column widths in ``copy_override``.
MAX_NS_LENGTH = 64
MAX_KEY_LENGTH = 255
#: Sanity ceiling; ``value`` is TEXT.
MAX_VALUE_LENGTH = 2000

#: i18next key shape; excludes whitespace, quotes and ``[]``.
_NS_PATTERN = r"^[\w-]+$"
_KEY_PATTERN = r"^[\w.-]+$"


class CopyOverrideIn(WireModel):
    """One override, as an admin submits it."""

    # Strip first, so " " fails min_length.
    model_config = ConfigDict(str_strip_whitespace=True)

    ns: str = Field(..., min_length=1, max_length=MAX_NS_LENGTH, pattern=_NS_PATTERN)
    key: str = Field(..., min_length=1, max_length=MAX_KEY_LENGTH, pattern=_KEY_PATTERN)
    value: str = Field(..., min_length=1, max_length=MAX_VALUE_LENGTH)


class CopyOverrideOut(WireModel):
    """Public read; audit columns deliberately omitted."""

    model_config = ConfigDict(from_attributes=True)

    ns: str
    key: str
    value: str
