"""The base every request and response model in this app inherits (#1400).

WHAT IT FIXES
-------------
FastAPI derives an OpenAPI response schema's ``required`` list from Pydantic
FIELD DEFAULTS. A field written ``submitted_at: datetime | None = None``
therefore landed outside ``required``, and ``openapi-typescript`` faithfully
rendered it ``submitted_at?: string | null``.

That optionality was fiction. No route in this app passes
``response_model_exclude_unset`` or ``exclude_none``, so a response model always
serializes every field it declares — ``undefined`` is a shape this wire cannot
produce. The generated types were wrong and the hand-written ones they replaced
were right, which left the frontend maintaining a ``wireSent`` helper whose only
job was stripping the phantom ``?`` back off again.

``json_schema_serialization_defaults_required`` marks default-carrying fields as
required in the **serialization** JSON schema. FastAPI generates response models
in serialization mode, so responses become honest.

WHY THIS DOES NOT BREAK REQUEST BODIES
--------------------------------------
Request bodies generate in **validation** mode, which this setting does not
touch: ``TaskCreate.description`` with a default stays optional, and a partial
``PATCH`` body remains legal. The asymmetry is the whole reason this is a config
flag rather than deleting the defaults — deleting them would make the field
required at every *construction* site and raise ``ValidationError`` in services
that legitimately omit it.

The two modes are reconciled per-model, not per-app: a model used as BOTH a
request body and a response splits into ``X-Input`` and ``X-Output`` in the
schema, each with its own ``required``. No model in this app is dual-use today.

WHY ONE BASE, APPLIED TO EVERYTHING
-----------------------------------
The setting is **inert on a request-only model** — it only alters the
serialization schema, which is never emitted for a model that is never a
response. So there is no per-class judgement to make and no two-tier hierarchy
to keep sorted: every model inherits this, and the ones it does not concern are
unaffected. A shared "response base" that someone must correctly choose between
is exactly the thing that rots at model #91.

Pydantic merges ``model_config`` along the MRO, so a subclass declaring its own
``model_config = ConfigDict(from_attributes=True)`` keeps this setting as well —
none of the existing config lines needed changing.

Inheriting this is not enforced by the type system. It is enforced by
``tests/test_openapi_response_required.py``, which fails on any response field
the contract still calls optional, whichever model it came from.
"""

from pydantic import BaseModel, ConfigDict


class WireModel(BaseModel):
    """A model whose serialization schema admits it always sends what it declares."""

    model_config = ConfigDict(json_schema_serialization_defaults_required=True)
