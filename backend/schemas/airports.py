from pydantic import BaseModel


class NearbyAirportsOut(BaseModel):
    """Codes near the viewer's carried character; ``None`` when they have none
    or it is not a recognised airport."""

    codes: list[str] | None
