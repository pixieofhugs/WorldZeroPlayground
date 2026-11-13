"""Base for every request/response model (#1400).

``json_schema_serialization_defaults_required`` marks default-carrying fields
required in the serialization (response) schema only, so generated TS types drop
phantom ``?`` (no route uses exclude_unset/none). Request bodies use validation
mode and stay optional. Inert on request-only models, so everything inherits it;
a dual-use model splits into ``X-Input``/``X-Output``. Pydantic merges
``model_config`` along the MRO. Enforced by test_openapi_response_required.py.
"""

from pydantic import BaseModel, ConfigDict


class WireModel(BaseModel):
    model_config = ConfigDict(json_schema_serialization_defaults_required=True)
