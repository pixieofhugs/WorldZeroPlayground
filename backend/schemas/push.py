"""Wire shapes for push subscriptions (#3678)."""

from pydantic import BaseModel, Field


class PushKeysIn(BaseModel):
    p256dh: str = Field(min_length=1, max_length=512)
    auth: str = Field(min_length=1, max_length=512)


class PushSubscriptionIn(BaseModel):
    endpoint: str = Field(min_length=1, max_length=2048)
    keys: PushKeysIn


class PushUnsubscribeIn(BaseModel):
    endpoint: str = Field(min_length=1, max_length=2048)
