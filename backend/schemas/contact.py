from datetime import datetime

from pydantic import ConfigDict, Field
from schemas.base import WireModel


class ContactMessageIn(WireModel):
    name: str = Field(..., min_length=1, max_length=100)
    email: str = Field(..., min_length=1, max_length=254)
    message: str = Field(..., min_length=1, max_length=5000)


class ContactMessageOut(WireModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    created_at: datetime
