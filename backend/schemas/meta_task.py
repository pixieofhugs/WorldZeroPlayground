from pydantic import BaseModel, ConfigDict, Field


class MetaTaskOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    name: str
    description: str
    faction_slug: str
    bonus_type: str
    bonus_value: float
    level_required: int


class MetaTaskCreate(BaseModel):
    name: str = Field(..., max_length=200)
    description: str
    faction_slug: str
    bonus_value: int = Field(..., gt=0)
    level_required: int = Field(0, ge=0)
