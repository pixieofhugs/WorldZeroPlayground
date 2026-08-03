"""Response shapes for the app-level routes that belong to no router."""

from typing import Literal

from pydantic import BaseModel


class HealthOut(BaseModel):
    """``GET /health`` — the liveness probe the host polls.

    ``status`` is a ``Literal`` rather than a bare ``str`` because the endpoint
    has exactly one success answer: it either returns ``"ok"`` or it does not
    return. Typing it as an open string would put a value in the generated
    client that nothing can ever produce, and invite a caller to branch on it.
    """

    status: Literal["ok"]
