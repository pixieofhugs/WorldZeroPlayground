/**
 * WHICH PAGE GROUNDS ARE BUSY — the data half of the ornament alternation
 * (#2195). The law, owner 2026-08-17: **each faction has ONE ornament; a card on
 * an ornamented ground goes plain, a card on a plain ground wears it.**
 *
 * "Ornament" there means a card's BACKGROUND texture, never its frame, masthead,
 * points mark or divider. This file answers only the other half of the sentence:
 * is the GROUND the card is standing on a pattern, or a wash?
 *
 * It lives beside the eight backdrop components on purpose. The backdrop is the
 * only thing that knows whether it is busy, and the alternative — nine card
 * families each comparing slugs — spreads one judgement over nine files that
 * cannot see each other. A table can be read in one screen and a new backdrop
 * that forgets to file itself shows up as an absent row, which is the safe
 * answer (plain) rather than a wrong one.
 *
 * THE LINE: a PATTERN repeats across the whole field (rays, a grid, scanlines, a
 * hatch, a chart net). A WASH is flat colour plus soft figures — the owner named
 * Coven's candlelight and UA's mesa as washes explicitly, and both are exactly
 * that: one token plus blooms/figures held at 6–9% so an unrelated faction's
 * card can be read straight through them (ADR-0002).
 *
 * The predicate is ANY ornamented ground, not just the card's own faction
 * (owner ruled (a) over the narrower same-faction reading): a Coven card on the
 * Everymen wall is still two textures fighting, and "sometimes it alternates" is
 * a worse rule than "it always does".
 */

/**
 * The grounds that repeat a texture across the field. Every other slug — and
 * every route that themes nothing — is plain.
 *
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
 * `albescent` has a component of its own as of #2531 and is still the na
 * watercolour — the registration is a PASS-THROUGH, so the row above changes
 * where the answer comes from and not what it is. It stays off the list below
 * for the same reason it was never on it: the wash is what an unaffiliated
 * player's profile stands on, and Albescent must not be told apart from one.
 *
 * `wow` is the one row the owner did not name either way. It is filed as a
 * pattern because the gilt hatch is a `repeating-linear-gradient` over the
 * entire viewport, which is the same kind of thing as Everymen's hatch and not
 * the same kind of thing as Coven's four blooms. It changes nothing for a WOW
 * card (WOW wears no ornament, so alternation is a no-op for it) — it decides
 * only what ANOTHER faction's card does on a WOW player's profile.
 */
export const ORNAMENTED_BACKDROP_SLUGS: readonly string[] = [
  'everymen',
  'snide',
  'singularity',
  'ephemerists',
  'wow',
]

/**
 * Is the page ground for `slug` a pattern? `null` (no page themed the backdrop)
 * and any unregistered slug are the watercolour, which is a wash — so the
 * answer off a faction page is `false`, which is what keeps the alternation a
 * no-op on /tasks, Home, the FieldDesk and both detail pages.
 */
export function backdropIsOrnamented(slug: string | null | undefined): boolean {
  return slug != null && ORNAMENTED_BACKDROP_SLUGS.includes(slug)
}
