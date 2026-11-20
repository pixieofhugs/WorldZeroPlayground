"""Wire shapes for push subscriptions (#3678)."""

from urllib.parse import urlsplit

from pydantic import BaseModel, Field, field_validator

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
        parts = urlsplit(value)
        if parts.scheme != "https" or not _is_push_service(parts.hostname or ""):
            raise ValueError("endpoint must be an https URL on a Web Push service")
        return value


class PushUnsubscribeIn(BaseModel):
    endpoint: str = Field(min_length=1, max_length=2048)
