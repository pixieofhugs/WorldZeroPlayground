/**
 * Own-property lookup for tables keyed by a wire string (#1821): a bracket read
 * of "constructor" returns the `Object` function, which `??` waves through.
 *
 * ponytail: `Object.hasOwn` spelled long; `lib: ES2020` and Vite's safari14
 * target lack it. Swap the body when `lib` moves.
 */
export function hasOwnKey(
  table: object,
  key: string | null | undefined,
): key is string {
  return key != null && Object.prototype.hasOwnProperty.call(table, key);
}
