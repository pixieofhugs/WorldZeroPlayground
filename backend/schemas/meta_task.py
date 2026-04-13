from pydantic import BaseModel, ConfigDict


class MetaTaskOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    name: str
    description: str
    faction_slug: str
    bonus_type: str
    bonus_value: float
    level_required: int
