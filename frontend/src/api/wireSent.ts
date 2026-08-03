/**
 * One narrowing, for one known imprecision in the generated schema (#1400).
 *
 * THE IMPRECISION
 * ---------------
 * FastAPI derives a response schema's `required` list from Pydantic FIELD
 * DEFAULTS, not from what the response serializer emits. A field written
 * `submitted_at: datetime | None = None` therefore lands OUTSIDE `required`, and
 * `openapi-typescript` faithfully renders it `submitted_at?: string | null`.
 *
 * But no route in this app passes `response_model_exclude_unset` or
 * `exclude_none`, so a response model always serializes every field it declares.
 * `undefined` is a shape the wire cannot produce. The hand-written interfaces —
 * `submitted_at: string | null` — are the ACCURATE ones here, and widening them
 * to match the schema would push `?? null` into every reader for a case that
 * cannot happen.
 *
 * WHAT THIS DOES AND DOES NOT HIDE
 * --------------------------------
 * It removes the optional modifier and nothing else. A renamed field, a dropped
 * field, a changed value type or a widened enum still fails `tsc` at the call
 * site exactly as this issue intends — which a blanket `as PraxisOut` would not.
 *
 * It reaches all the way down because the rule does: a `PraxisOut` carries
 * `TaskOut` rows and `PraxisMemberOut` rows, and each of those is serialized
 * whole by the same machinery for the same reason.
 *
 * ponytail: this disappears when the SCHEMA stops being imprecise, which is a
 * backend change and a cheaper one than it looks — Pydantic's
 * `ConfigDict(json_schema_serialization_defaults_required=True)` on a shared
 * response base marks default-carrying fields required in the SERIALIZATION
 * schema, which is the mode FastAPI generates response models in. Regenerate and
 * `submitted_at?: string | null` becomes `submitted_at: string | null`, at which
 * point every call below is a bare `return data` and this file deletes. Deleting
 * the 26 `= None` defaults instead would risk a `ValidationError` at every
 * construction site, so it is the wrong lever.
 *
 * The premise above is unguarded, and that is the risk worth knowing: add
 * `response_model_exclude_none=True` to any route and this type would assert an
 * absent field into existence, silently, everywhere it is used. Until then it is
 * the one place the difference is written down.
 */

/**
 * The payload with the optionality the wire never actually exercises removed.
 *
 * `-?` strips the `undefined` a `?` adds, so a `string | null` field stays
 * exactly `string | null`. Primitives fall through the object branch untouched,
 * which is what stops this from being a general-purpose type laundry.
 */
export type WireSent<Payload> = Payload extends readonly (infer Element)[]
  ? WireSent<Element>[]
  : Payload extends object
    ? { [Key in keyof Payload]-?: WireSent<Payload[Key]> }
    : Payload

/** Read a generated payload as the response model actually sends it. */
export function wireSent<Payload>(payload: Payload): WireSent<Payload> {
  return payload as WireSent<Payload>
}
