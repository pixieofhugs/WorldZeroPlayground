"""Wire shapes for push subscriptions (#3678)."""

import re

from pydantic import BaseModel, Field, field_validator
from urllib3.util import parse_url

# The endpoint is a URL we POST to, so only real push services may be named (SSRF).
PUSH_HOST_SUFFIXES = (
    "fcm.googleapis.com",
    "updates.push.services.mozilla.com",
    "push.apple.com",
    "notify.windows.com",
)


def _is_push_service(host: str) -> bool:
    return any(host == s or host.endswith("." + s) for s in PUSH_HOST_SUFFIXES)


class PushKeysIn(BaseModel):
    p256dh: str = Field(min_length=1, max_length=512)
    auth: str = Field(min_length=1, max_length=512)


class PushSubscriptionIn(BaseModel):
    endpoint: str = Field(min_length=1, max_length=2048)
    keys: PushKeysIn

    @field_validator("endpoint")
    @classmethod
    def _endpoint_is_a_push_service(cls, value: str) -> str:
        # parse_url is what urllib3 sends with; urlsplit disagrees on backslashes.
        if re.search(r"[\\@\s\x00-\x1f\x7f]", value):
            raise ValueError("endpoint contains forbidden characters")
        parts = parse_url(value)
        if (
            parts.scheme != "https"
            or parts.auth
            or parts.port not in (None, 443)
            or not _is_push_service(parts.host or "")
        ):
            raise ValueError("endpoint must be an https URL on a Web Push service")
        return value


class PushUnsubscribeIn(BaseModel):
    endpoint: str = Field(min_length=1, max_length=2048)
