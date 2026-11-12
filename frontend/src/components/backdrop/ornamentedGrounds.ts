/**
 * Which page grounds are busy — the data half of the ornament alternation
 * (#2195). Owner law: each faction has ONE ornament; a card on an ornamented
 * ground goes plain (background texture only, never chrome).
 *
 * Here, beside the backdrops, because only the backdrop knows if it is busy;
 * a forgotten row defaults to plain. A PATTERN repeats across the field; a
 * WASH is flat colour plus soft figures at 6–9%. ANY ornamented ground counts,
 * not just the card's own faction (owner ruling).
 */

/**
 * | slug | what it draws | verdict |
 * |---|---|---|
 * | everymen | `.em-backdrop`: the shared `.em-burst` rays + 6px dot grid + ±45° hatch | pattern |
 * | snide | `.snide-backdrop`: 5px dot grid + 28°/-19° crosshatch | pattern |
 * | singularity | `SingularityBackdrop`: 32px circuit grid + 4px scanlines | pattern |
 * | ephemerists | `EphemeristsBackdrop`: the `EphemerisNet` chart at 0.17 | pattern |
 * | wow | `.wow-backdrop`: 135° gilt hatch every 24px, + the checker rail | pattern |
 * | coven | `.coven-backdrop`: flat ward-page + four drifting blooms | WASH |
 * | ua | `UaBackdrop`: flat mesa sand + mandala/ensō at 6–7% | WASH |
 * | albescent | `AlbescentBackdrop`: `WatercolorBackground`, byte-identical (#2531) | WASH |
 * | na, anything else | `WatercolorBackground`, na's own `backdrop` row (#2530) | wash |
 *
 * Albescent must never be told apart from an unaffiliated profile. `wow`
 * wasn't named by the owner; filed as pattern (full-viewport repeating hatch).
 */
export const ORNAMENTED_BACKDROP_SLUGS: readonly string[] = [
  'everymen',
  'snide',
  'singularity',
  'ephemerists',
  'wow',
]

/** `null` and unregistered slugs are the watercolour wash, so this is a no-op off profiles. */
export function backdropIsOrnamented(slug: string | null | undefined): boolean {
  return slug != null && ORNAMENTED_BACKDROP_SLUGS.includes(slug)
}
