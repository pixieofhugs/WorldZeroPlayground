from datetime import datetime

from pydantic import BaseModel, ConfigDict


class TauntMessageOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    from_character_id: int
    to_character_id: int
    message: str
    trigger_type: str
    created_at: datetime
