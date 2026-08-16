/**
 * Own-property-only lookup guard for a module table keyed by a wire string
 * (#1821).
 *
 * A bracket read on an object literal walks `Object.prototype`, so
 * `TABLE["constructor"]` hands back the `Object` function rather than
 * `undefined` — and every `?? fallback` / `|| fallback` / `?.` guard in the app
 * waves a function through. The symptom depends on the table: a garbage
 * `var(--faction-function Object() ...)`, a function rendered as a React
 * component, or a `TypeError` one property deeper.
 *
 * ponytail: this is `Object.hasOwn` spelled the long way. `tsconfig.json` sets
 * `lib: ES2020`, where `Object.hasOwn` (ES2022) is neither typed nor present in
 * Vite's default build target (`safari14`, `firefox78`), so calling it would
 * typecheck-fail here and throw there. Swap the body for
 * `Object.hasOwn(table, key)` when that `lib` moves — the call sites do not
 * change.
 */
export function hasOwnKey(
  table: object,
  key: string | null | undefined,
): key is string {
  return key != null && Object.prototype.hasOwnProperty.call(table, key);
}
