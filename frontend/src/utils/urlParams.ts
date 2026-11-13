/**
 * Whitelist for untrusted URL params, shared by both browse pages (#1537). The
 * list routes 422 on unknown values; a stale bookmark should get the default
 * view instead. Absent and blank values both fall back.
 */
export function readOneOf<T extends string>(
  raw: string | null,
  allowed: readonly T[],
  fallback: T,
): T {
  return allowed.includes(raw as T) ? (raw as T) : fallback
}
