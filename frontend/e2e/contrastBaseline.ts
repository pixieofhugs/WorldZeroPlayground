/**
 * Part C of the contrast foundation (#651) — the baseline allowlist for the
 * RENDERED sweep. (The token-value sweep has its own list, in
 * `src/utils/__tests__/factionContrast.test.ts`.)
 *
 * `contrast.spec.ts` was red on landing: this bug family is real, pre-dates
 * the guard, and has already leaked past three hand audits. Blocking the guard
 * on the fixes would have kept the leak open, so the known failures are
 * enumerated here and the fixes land as children. Mirrors the repo's existing
 * `no-raw-style-values` ratchet doctrine — new violations blocked, known debt
 * tracked and visible.
 *
 * THE KEY IS THE COLOUR PAIR, NOT THE DOM NODE. A rendered failure IS a
 * (text, backdrop) pairing; which component happens to produce it is
 * incidental, changes with every copy edit, and would make this list rot. So
 * `theme | rgb(text) on rgb(backdrop)` is the identity, and `where` is only a
 * breadcrumb for whoever picks up the fix. Unresolved findings are keyed the
 * same way — on the CSS that defeated resolution, not on a DOM path.
 *
 * **This list only ever shrinks.** Fixing a pair means DELETING its entry, not
 * editing the ratio — an allowlisted pair that starts passing fails the spec
 * on purpose. Never add an entry for new work.
 */

export type BaselineEntry = {
  /** Measured ratio when this entry landed. `null` for an unresolved backdrop. */
  ratio: number | null;
  /** The issue that owns the fix. 651 = found by the sweep, awaiting a child. */
  issue: number;
  /** Where it was seen — a breadcrumb, not part of the identity. */
  where: string;
};

/**
 * Identity of a measured failure.
 *
 * `required` is part of the identity, not decoration: the same colour pair can
 * legitimately pass as 24px display type (3:1) and fail as body copy (4.5:1).
 * Without it, one node's large-text pass looks like the other node's entry
 * going stale, and the ratchet fights itself.
 */
export function baselineKey(theme: string, text: string, background: string, required: number): string {
  return `${theme} | ${text} on ${background} @${required}`;
}

/**
 * Identity of an unresolved backdrop — keyed on the CSS that defeated
 * resolution (stable) rather than the DOM path (rots on the next copy edit).
 */
export function unresolvedKey(theme: string, text: string, backdropCss: string, required: number): string {
  return `${theme} | ${text} over UNRESOLVED ${backdropCss} @${required}`;
}

/**
 * THE LIST. 269 entries, machine-produced by the sweep itself
 * (`CONTRAST_BASELINE_OUT=<path> bash frontend/e2e/run-e2e.sh contrast.spec.ts`),
 * never hand-typed — 269 hand-copied ratios would be wrong within a week,
 * which is this issue's whole thesis.
 *
 *   - 7 entries owned by #649 (white `--color-text-on-accent` on a faction
 *     fill). That issue's acceptance, measured as rendered.
 *   - 56 UNRESOLVED entries: text over a gradient with an OPAQUE stop — the
 *     WOW `.exe` title bars, the Ephemerists' celestial radial fields, the gilt
 *     wordmark. The colour genuinely varies under the text, so these stay loud
 *     rather than being measured against a guess. (Before the texture/fill
 *     split there were 134 of these, almost all paper grain.)
 *   - the rest await triage into children off #651.
 */
export const RENDERED_BASELINE: Record<string, BaselineEntry> = {
  "dark | rgb(196, 100, 138) over UNRESOLVED linear-gradient(135deg, rgb(57, 21, 42), rgb(42, 13, 28)) @4.5": { ratio: null, issue: 651, where: 'wow/dark/desktop div > div > div > div' },
  "dark | rgb(196, 100, 138) over UNRESOLVED repeating-linear-gradient(rgb(57, 21, 42), rgb(57, 21, 42) 25px, color(srgb 0.478431 0.2 0.345098 / 0.55) 25px, color(srgb 0.478431 0.2 0.345098 / 0.55) 26px) @4.5": { ratio: null, issue: 651, where: 'wow/dark/desktop div > div > div > p' },
  "dark | rgb(230, 194, 103) over UNRESOLVED radial-gradient(120% 130% at 50% 0%, rgb(79, 143, 176), rgb(10, 29, 42) 70%) @4.5": { ratio: null, issue: 651, where: 'ephemerists/dark/desktop a > div > div > div' },
  "dark | rgb(230, 194, 103) over UNRESOLVED radial-gradient(120% 140% at 82% 0%, rgb(79, 143, 176), rgb(10, 29, 42) 60%, rgb(5, 19, 28) 100%) @3": { ratio: null, issue: 651, where: 'ephemerists/dark/desktop div > div > div > span' },
  "dark | rgb(230, 194, 103) over UNRESOLVED radial-gradient(120% 140% at 82% 0%, rgb(79, 143, 176), rgb(10, 29, 42) 60%, rgb(5, 19, 28) 100%) @4.5": { ratio: null, issue: 651, where: 'ephemerists/dark/desktop header > div > div > div' },
  "dark | rgb(239, 227, 198) over UNRESOLVED radial-gradient(120% 130% at 50% 0%, rgb(79, 143, 176), rgb(10, 29, 42) 70%) @3": { ratio: null, issue: 651, where: 'ephemerists/dark/desktop a > div > div > div' },
  "dark | rgb(239, 227, 198) over UNRESOLVED radial-gradient(120% 140% at 82% 0%, rgb(79, 143, 176), rgb(10, 29, 42) 60%, rgb(5, 19, 28) 100%) @3": { ratio: null, issue: 651, where: 'ephemerists/dark/desktop header > div > div > h1' },
  "dark | rgb(240, 230, 208) over UNRESOLVED linear-gradient(rgb(19, 18, 26), rgb(19, 18, 26)), linear-gradient(90deg, rgb(79, 70, 229), rgb(190, 24, 93), rgb(249, 115, 22), rgb(22, 163, 74)) @4.5": { ratio: null, issue: 651, where: 'ua/dark/desktop nav.sticky.top-0 > div.max-w-5xl.mx-auto > a.shrink-0.leading-none > span.font-display.italic' },
  "dark | rgb(244, 114, 182) over UNRESOLVED linear-gradient(135deg, rgb(57, 21, 42), rgb(42, 13, 28)) @3": { ratio: null, issue: 651, where: 'wow/dark/desktop div > div > div > h1' },
  "dark | rgb(244, 114, 182) over UNRESOLVED linear-gradient(160deg, rgb(94, 42, 70), rgb(196, 100, 138) 60%, rgb(244, 114, 182)) @4.5": { ratio: null, issue: 651, where: 'wow/dark/mobile div.py-4 > section > div > p' },
  "dark | rgb(244, 114, 182) over UNRESOLVED repeating-linear-gradient(rgb(57, 21, 42), rgb(57, 21, 42) 23px, color(srgb 0.478431 0.2 0.345098 / 0.55) 23px, color(srgb 0.478431 0.2 0.345098 / 0.55) 24px) @3": { ratio: null, issue: 651, where: 'wow/dark/desktop div > div > div > div' },
  "dark | rgb(244, 114, 182) over UNRESOLVED repeating-linear-gradient(rgb(57, 21, 42), rgb(57, 21, 42) 23px, color(srgb 0.478431 0.2 0.345098 / 0.55) 23px, color(srgb 0.478431 0.2 0.345098 / 0.55) 24px) @4.5": { ratio: null, issue: 651, where: 'wow/dark/desktop div > div > a > span' },
  "dark | rgb(244, 114, 182) over UNRESOLVED repeating-linear-gradient(rgb(57, 21, 42), rgb(57, 21, 42) 25px, color(srgb 0.478431 0.2 0.345098 / 0.55) 25px, color(srgb 0.478431 0.2 0.345098 / 0.55) 26px) @3": { ratio: null, issue: 651, where: 'wow/dark/desktop div > div > div > div' },
  "dark | rgb(251, 207, 224) over UNRESOLVED repeating-linear-gradient(rgb(57, 21, 42), rgb(57, 21, 42) 23px, color(srgb 0.478431 0.2 0.345098 / 0.55) 23px, color(srgb 0.478431 0.2 0.345098 / 0.55) 24px) @4.5": { ratio: null, issue: 651, where: 'wow/dark/desktop div > div > a > span' },
  "dark | rgb(251, 214, 232) over UNRESOLVED linear-gradient(160deg, rgb(94, 42, 70), rgb(196, 100, 138) 60%, rgb(244, 114, 182)) @3": { ratio: null, issue: 651, where: 'wow/dark/mobile div.py-4 > section > div > h1' },
  "dark | rgb(251, 214, 232) over UNRESOLVED linear-gradient(rgb(94, 42, 70), rgb(65, 32, 58)) @4.5": { ratio: null, issue: 651, where: 'ua/dark/desktop div > div > div > span' },
  "dark | rgb(255, 255, 255) over UNRESOLVED linear-gradient(150deg, rgb(94, 42, 70), rgb(244, 114, 182)) @4.5": { ratio: null, issue: 651, where: 'wow/dark/mobile section.mt-6 > div.flex.flex-col > a > span' },
  "dark | rgb(255, 255, 255) over UNRESOLVED linear-gradient(rgb(244, 114, 182), rgb(196, 100, 138)) @4.5": { ratio: null, issue: 651, where: 'wow/dark/mobile main.flex-1.relative > div.page > div.flex.gap-2.5 > a' },
  "dark | rgb(255, 255, 255) over UNRESOLVED radial-gradient(circle at 35% 28%, rgb(94, 42, 70), rgb(244, 114, 182)) @3": { ratio: null, issue: 651, where: 'wow/dark/mobile div > div.flex.items-center > div.shrink-0 > span.flex.w-full' },
  "dark | rgb(57, 21, 42) over UNRESOLVED linear-gradient(150deg, rgb(94, 42, 70), rgb(244, 114, 182)) @3": { ratio: null, issue: 651, where: 'wow/dark/desktop a > div > div > span' },
  "dark | rgb(57, 21, 42) over UNRESOLVED linear-gradient(150deg, rgb(94, 42, 70), rgb(244, 114, 182)) @4.5": { ratio: null, issue: 651, where: 'wow/dark/desktop div > div > a > span' },
  "dark | rgb(79, 143, 176) over UNRESOLVED radial-gradient(120% 140% at 82% 0%, rgb(79, 143, 176), rgb(10, 29, 42) 60%, rgb(5, 19, 28) 100%) @3": { ratio: null, issue: 651, where: 'ephemerists/dark/desktop div > div > h1 > span' },
  "dark | rgba(239, 227, 198, 0.62) over UNRESOLVED radial-gradient(120% 140% at 82% 0%, rgb(79, 143, 176), rgb(10, 29, 42) 60%, rgb(5, 19, 28) 100%) @4.5": { ratio: null, issue: 651, where: 'ephemerists/dark/desktop div > div > p > span' },
  "dark | rgba(239, 227, 198, 0.7) over UNRESOLVED radial-gradient(120% 130% at 50% 0%, rgb(79, 143, 176), rgb(10, 29, 42) 70%) @4.5": { ratio: null, issue: 651, where: 'ephemerists/dark/desktop a > div > div > div' },
  "dark | rgba(239, 227, 198, 0.75) over UNRESOLVED radial-gradient(120% 140% at 82% 0%, rgb(79, 143, 176), rgb(10, 29, 42) 60%, rgb(5, 19, 28) 100%) @4.5": { ratio: null, issue: 651, where: 'ephemerists/dark/desktop div > div > div > span' },
  "dark | rgba(239, 227, 198, 0.92) over UNRESOLVED radial-gradient(120% 140% at 82% 0%, rgb(79, 143, 176), rgb(10, 29, 42) 60%, rgb(5, 19, 28) 100%) @4.5": { ratio: null, issue: 651, where: 'ephemerists/dark/desktop header > div > div > p' },
  "dark | rgba(251, 214, 232, 0.7) over UNRESOLVED linear-gradient(rgb(94, 42, 70), rgb(65, 32, 58)) @4.5": { ratio: null, issue: 651, where: 'ua/dark/desktop div > div > div > span' },
  "dark | rgba(251, 214, 232, 0.75) over UNRESOLVED linear-gradient(rgb(94, 42, 70), rgb(65, 32, 58)) @4.5": { ratio: null, issue: 651, where: 'ua/dark/desktop div > div > div > span' },
  "light | rgb(131, 24, 67) over UNRESOLVED linear-gradient(135deg, rgb(255, 253, 250), rgb(253, 238, 243)) @4.5": { ratio: null, issue: 651, where: 'wow/light/desktop div > div > div > div' },
  "light | rgb(131, 24, 67) over UNRESOLVED repeating-linear-gradient(rgb(255, 253, 250), rgb(255, 253, 250) 25px, color(srgb 0.952941 0.713726 0.823529 / 0.55) 25px, color(srgb 0.952941 0.713726 0.823529 / 0.55) 26px) @4.5": { ratio: null, issue: 651, where: 'wow/light/desktop div > div > div > p' },
  "light | rgb(142, 47, 92) over UNRESOLVED linear-gradient(160deg, rgb(251, 207, 226), rgb(131, 24, 67) 60%, rgb(236, 95, 153)) @3": { ratio: null, issue: 651, where: 'wow/light/mobile div.py-4 > section > div > h1' },
  "light | rgb(142, 47, 92) over UNRESOLVED linear-gradient(rgb(251, 207, 226), rgb(243, 166, 203)) @4.5": { ratio: null, issue: 651, where: 'ua/light/desktop div > div > div > span' },
  "light | rgb(212, 171, 85) over UNRESOLVED radial-gradient(120% 130% at 50% 0%, rgb(29, 79, 110), rgb(20, 59, 84) 70%) @4.5": { ratio: null, issue: 651, where: 'ephemerists/light/desktop a > div > div > div' },
  "light | rgb(212, 171, 85) over UNRESOLVED radial-gradient(120% 140% at 82% 0%, rgb(29, 79, 110), rgb(20, 59, 84) 60%, rgb(5, 19, 28) 100%) @3": { ratio: null, issue: 651, where: 'ephemerists/light/desktop div > div > div > span' },
  "light | rgb(212, 171, 85) over UNRESOLVED radial-gradient(120% 140% at 82% 0%, rgb(29, 79, 110), rgb(20, 59, 84) 60%, rgb(5, 19, 28) 100%) @4.5": { ratio: null, issue: 651, where: 'ephemerists/light/desktop header > div > div > div' },
  "light | rgb(236, 95, 153) over UNRESOLVED linear-gradient(135deg, rgb(255, 253, 250), rgb(253, 238, 243)) @3": { ratio: null, issue: 651, where: 'wow/light/desktop div > div > div > h1' },
  "light | rgb(236, 95, 153) over UNRESOLVED linear-gradient(160deg, rgb(251, 207, 226), rgb(131, 24, 67) 60%, rgb(236, 95, 153)) @4.5": { ratio: null, issue: 651, where: 'wow/light/mobile div.py-4 > section > div > p' },
  "light | rgb(236, 95, 153) over UNRESOLVED repeating-linear-gradient(rgb(255, 253, 250), rgb(255, 253, 250) 23px, color(srgb 0.952941 0.713726 0.823529 / 0.55) 23px, color(srgb 0.952941 0.713726 0.823529 / 0.55) 24px) @3": { ratio: null, issue: 651, where: 'wow/light/desktop div > div > div > div' },
  "light | rgb(236, 95, 153) over UNRESOLVED repeating-linear-gradient(rgb(255, 253, 250), rgb(255, 253, 250) 23px, color(srgb 0.952941 0.713726 0.823529 / 0.55) 23px, color(srgb 0.952941 0.713726 0.823529 / 0.55) 24px) @4.5": { ratio: null, issue: 651, where: 'wow/light/desktop div > div > a > span' },
  "light | rgb(236, 95, 153) over UNRESOLVED repeating-linear-gradient(rgb(255, 253, 250), rgb(255, 253, 250) 25px, color(srgb 0.952941 0.713726 0.823529 / 0.55) 25px, color(srgb 0.952941 0.713726 0.823529 / 0.55) 26px) @3": { ratio: null, issue: 651, where: 'wow/light/desktop div > div > div > div' },
  "light | rgb(241, 232, 207) over UNRESOLVED radial-gradient(120% 130% at 50% 0%, rgb(29, 79, 110), rgb(20, 59, 84) 70%) @3": { ratio: null, issue: 651, where: 'ephemerists/light/desktop a > div > div > div' },
  "light | rgb(241, 232, 207) over UNRESOLVED radial-gradient(120% 140% at 82% 0%, rgb(29, 79, 110), rgb(20, 59, 84) 60%, rgb(5, 19, 28) 100%) @3": { ratio: null, issue: 651, where: 'ephemerists/light/desktop header > div > div > h1' },
  "light | rgb(255, 253, 250) over UNRESOLVED linear-gradient(150deg, rgb(251, 207, 226), rgb(236, 95, 153)) @3": { ratio: null, issue: 651, where: 'wow/light/desktop a > div > div > span' },
  "light | rgb(255, 253, 250) over UNRESOLVED linear-gradient(150deg, rgb(251, 207, 226), rgb(236, 95, 153)) @4.5": { ratio: null, issue: 651, where: 'wow/light/desktop div > div > a > span' },
  "light | rgb(255, 255, 255) over UNRESOLVED linear-gradient(150deg, rgb(251, 207, 226), rgb(236, 95, 153)) @4.5": { ratio: null, issue: 651, where: 'wow/light/mobile section.mt-6 > div.flex.flex-col > a > span' },
  "light | rgb(255, 255, 255) over UNRESOLVED linear-gradient(rgb(236, 95, 153), rgb(131, 24, 67)) @4.5": { ratio: null, issue: 651, where: 'wow/light/mobile main.flex-1.relative > div.page > div.flex.gap-2.5 > a' },
  "light | rgb(255, 255, 255) over UNRESOLVED radial-gradient(circle at 35% 28%, rgb(251, 207, 226), rgb(236, 95, 153)) @3": { ratio: null, issue: 651, where: 'wow/light/mobile div > div.flex.items-center > div.shrink-0 > span.flex.w-full' },
  "light | rgb(26, 18, 9) over UNRESOLVED linear-gradient(rgb(247, 244, 238), rgb(247, 244, 238)), linear-gradient(90deg, rgb(79, 70, 229), rgb(190, 24, 93), rgb(249, 115, 22), rgb(22, 163, 74)) @4.5": { ratio: null, issue: 651, where: 'ua/light/desktop nav.sticky.top-0 > div.max-w-5xl.mx-auto > a.shrink-0.leading-none > span.font-display.italic' },
  "light | rgb(29, 79, 110) over UNRESOLVED radial-gradient(120% 140% at 82% 0%, rgb(29, 79, 110), rgb(20, 59, 84) 60%, rgb(5, 19, 28) 100%) @3": { ratio: null, issue: 651, where: 'ephemerists/light/desktop div > div > h1 > span' },
  "light | rgb(88, 28, 57) over UNRESOLVED repeating-linear-gradient(rgb(255, 253, 250), rgb(255, 253, 250) 23px, color(srgb 0.952941 0.713726 0.823529 / 0.55) 23px, color(srgb 0.952941 0.713726 0.823529 / 0.55) 24px) @4.5": { ratio: null, issue: 651, where: 'wow/light/desktop div > div > a > span' },
  "light | rgba(142, 47, 92, 0.7) over UNRESOLVED linear-gradient(rgb(251, 207, 226), rgb(243, 166, 203)) @4.5": { ratio: null, issue: 651, where: 'ua/light/desktop div > div > div > span' },
  "light | rgba(142, 47, 92, 0.75) over UNRESOLVED linear-gradient(rgb(251, 207, 226), rgb(243, 166, 203)) @4.5": { ratio: null, issue: 651, where: 'ua/light/desktop div > div > div > span' },
  "light | rgba(241, 232, 207, 0.62) over UNRESOLVED radial-gradient(120% 140% at 82% 0%, rgb(29, 79, 110), rgb(20, 59, 84) 60%, rgb(5, 19, 28) 100%) @4.5": { ratio: null, issue: 651, where: 'ephemerists/light/desktop div > div > p > span' },
  "light | rgba(241, 232, 207, 0.7) over UNRESOLVED radial-gradient(120% 130% at 50% 0%, rgb(29, 79, 110), rgb(20, 59, 84) 70%) @4.5": { ratio: null, issue: 651, where: 'ephemerists/light/desktop a > div > div > div' },
  "light | rgba(241, 232, 207, 0.75) over UNRESOLVED radial-gradient(120% 140% at 82% 0%, rgb(29, 79, 110), rgb(20, 59, 84) 60%, rgb(5, 19, 28) 100%) @4.5": { ratio: null, issue: 651, where: 'ephemerists/light/desktop div > div > div > span' },
  "light | rgba(241, 232, 207, 0.92) over UNRESOLVED radial-gradient(120% 140% at 82% 0%, rgb(29, 79, 110), rgb(20, 59, 84) 60%, rgb(5, 19, 28) 100%) @4.5": { ratio: null, issue: 651, where: 'ephemerists/light/desktop header > div > div > p' },
  "dark | rgb(111, 174, 0) on rgb(244, 241, 232) @3": { ratio: 2.41, issue: 651, where: 'snide/dark/desktop div > div > div > div' },
  "dark | rgb(111, 174, 0) on rgb(244, 241, 232) @4.5": { ratio: 2.41, issue: 651, where: 'snide/dark/desktop div > div > div > div' },
  "dark | rgb(12, 10, 6) on rgb(19, 18, 26) @3": { ratio: 1.06, issue: 651, where: 'ephemerists/dark/desktop div.wz-faction-grid > div > div > h2' },
  "dark | rgb(12, 10, 6) on rgb(33, 26, 16) @3": { ratio: 1.15, issue: 651, where: 'ephemerists/dark/desktop div > div > div > div' },
  "dark | rgb(122, 112, 96) on rgb(19, 18, 26) @4.5": { ratio: 3.82, issue: 651, where: 'ua/dark/mobile div.min-h-screen.flex > header.sticky.top-0 > div.flex.items-center > a.eyebrow' },
  "dark | rgb(122, 112, 96) on rgb(28, 27, 34) @4.5": { ratio: 3.51, issue: 651, where: 'ua/dark/desktop div.page > div > div > span' },
  "dark | rgb(122, 112, 96) on rgb(28, 27, 35) @4.5": { ratio: 3.49, issue: 651, where: 'ua/dark/mobile div.py-4 > div.flex.items-center > div.flex.gap-2 > button' },
  "dark | rgb(122, 112, 96) on rgb(38, 37, 44) @4.5": { ratio: 3.13, issue: 651, where: 'ua/dark/desktop section > div.grid.grid-cols-3 > div.text-center > div' },
  "dark | rgb(13, 9, 7) on rgb(19, 18, 26) @3": { ratio: 1.07, issue: 651, where: 'everymen/dark/desktop div > div > div > h2' },
  "dark | rgb(13, 9, 7) on rgb(23, 17, 13) @4.5": { ratio: 1.06, issue: 651, where: 'everymen/dark/mobile div > div.flex.gap-2 > div.text-center > div.truncate' },
  "dark | rgb(13, 9, 7) on rgb(33, 25, 21) @3": { ratio: 1.15, issue: 651, where: 'everymen/dark/mobile div > div.flex.items-center > div.min-w-0.flex-1 > a.block.truncate' },
  "dark | rgb(13, 9, 7) on rgb(33, 25, 21) @4.5": { ratio: 1.15, issue: 651, where: 'ua/dark/mobile div.mt-4 > div.flex.flex-col > a > h2' },
  "dark | rgb(13, 9, 7) on rgb(34, 26, 22) @4.5": { ratio: 1.16, issue: 651, where: 'everymen/dark/mobile div.py-4 > section.mt-6 > div > span' },
  "dark | rgb(143, 106, 58) on rgb(19, 18, 26) @4.5": { ratio: 3.80, issue: 651, where: 'ua/dark/desktop div.wz-faction-grid > div > div > p' },
  "dark | rgb(143, 106, 58) on rgb(236, 228, 210) @4.5": { ratio: 3.87, issue: 651, where: 'ua/dark/mobile main.flex-1.relative > div.py-4 > section.mt-6 > p' },
  "dark | rgb(143, 106, 58) on rgb(247, 240, 227) @4.5": { ratio: 4.32, issue: 651, where: 'ua/dark/mobile div > div.flex.items-center > div.min-w-0.flex-1 > div.truncate' },
  "dark | rgb(156, 106, 26) on rgb(236, 228, 210) @4.5": { ratio: 3.70, issue: 651, where: 'ua/dark/mobile div.min-h-screen.flex > main.flex-1.relative > div.py-4 > p' },
  "dark | rgb(156, 106, 26) on rgb(247, 240, 227) @4.5": { ratio: 4.12, issue: 651, where: 'ua/dark/desktop div > div > div > div' },
  "dark | rgb(156, 106, 26) on rgb(253, 246, 234) @4.5": { ratio: 4.35, issue: 651, where: 'ua/dark/mobile section.mt-6 > div.flex.flex-col > a > span' },
  "dark | rgb(156, 118, 38) on rgb(33, 26, 16) @4.5": { ratio: 4.13, issue: 651, where: 'ua/dark/desktop div > div > div > span' },
  "dark | rgb(168, 137, 90) on rgb(236, 228, 210) @4.5": { ratio: 2.60, issue: 651, where: 'ua/dark/mobile main.flex-1.relative > div.page > header > div' },
  "dark | rgb(168, 137, 90) on rgb(247, 240, 227) @4.5": { ratio: 2.90, issue: 651, where: 'ua/dark/mobile div > div > div.flex.items-center > span' },
  "dark | rgb(168, 137, 90) on rgb(253, 246, 234) @4.5": { ratio: 3.06, issue: 651, where: 'ua/dark/desktop div > div > div > span' },
  "dark | rgb(168, 137, 90) on rgb(254, 247, 234) @4.5": { ratio: 3.08, issue: 651, where: 'ua/dark/mobile div > div.flex.gap-2 > div.text-center > div' },
  "dark | rgb(182, 160, 121) on rgb(243, 231, 206) @4.5": { ratio: 2.07, issue: 651, where: 'everymen/dark/desktop div > div > div > span' },
  "dark | rgb(192, 83, 58) on rgb(24, 18, 8) @4.5": { ratio: 4.02, issue: 651, where: 'ephemerists/dark/mobile div.min-h-screen.flex > main.flex-1.relative > div.py-4 > p' },
  "dark | rgb(192, 83, 58) on rgb(33, 26, 16) @4.5": { ratio: 3.72, issue: 651, where: 'ua/dark/desktop div > div > div > div' },
  "dark | rgb(194, 84, 31) on rgb(247, 240, 227) @4.5": { ratio: 4.04, issue: 651, where: 'ua/dark/mobile div > div > div.flex.items-center > a' },
  "dark | rgb(194, 84, 31) on rgb(253, 246, 234) @4.5": { ratio: 4.27, issue: 651, where: 'ua/dark/mobile section.mt-6 > div.flex.flex-col > a > span' },
  "dark | rgb(194, 84, 31) on rgb(254, 247, 234) @4.5": { ratio: 4.30, issue: 651, where: 'ua/dark/mobile section.mt-6 > div.flex.flex-col > a > span' },
  "dark | rgb(194, 84, 31) on rgb(28, 27, 35) @4.5": { ratio: 3.71, issue: 651, where: 'ua/dark/desktop div > div > div.sidebar-card > a.font-display.italic' },
  "dark | rgb(196, 100, 138) on rgb(57, 21, 42) @4.5": { ratio: 4.21, issue: 651, where: 'ua/dark/mobile a > div > div > p' },
  "dark | rgb(196, 100, 138) on rgb(74, 29, 53) @4.5": { ratio: 3.64, issue: 651, where: 'wow/dark/mobile main.flex-1.relative > div.page > header > div.eyebrow' },
  "dark | rgb(226, 67, 63) on rgb(231, 185, 79) @4.5": { ratio: 2.24, issue: 651, where: 'everymen/dark/mobile section.mt-6 > div.flex.flex-col > a > span' },
  "dark | rgb(226, 67, 63) on rgb(243, 231, 206) @4.5": { ratio: 3.35, issue: 651, where: 'everymen/dark/desktop div > div > div > b' },
  "dark | rgb(226, 67, 63) on rgb(33, 25, 21) @4.5": { ratio: 4.21, issue: 651, where: 'everymen/dark/mobile div.page > div > div.flex.items-center > a' },
  "dark | rgb(226, 67, 63) on rgb(34, 26, 22) @4.5": { ratio: 4.16, issue: 651, where: 'ua/dark/desktop div > div.card-footer > div > span' },
  "dark | rgb(239, 227, 198) on rgb(192, 83, 58) @4.5": { ratio: 3.63, issue: 651, where: 'ephemerists/dark/mobile main.flex-1.relative > div.page > div.flex.gap-2.5 > a.flex-1.flex' },
  "dark | rgb(239, 227, 198) on rgb(79, 143, 176) @4.5": { ratio: 2.80, issue: 651, where: 'ephemerists/dark/desktop div.wz-faction-grid > div > div > div' },
  "dark | rgb(240, 230, 208) on rgb(250, 249, 247) @4.5": { ratio: 1.18, issue: 651, where: 'albescent/dark/mobile div.flex.flex-col > a.sidebar-card > div > div.font-display.italic' },
  "dark | rgb(243, 231, 206) on rgb(226, 67, 63) @4.5": { ratio: 3.35, issue: 651, where: 'ua/dark/desktop div > div > div.card-meta > span' },
  "dark | rgb(244, 241, 232) on rgb(255, 45, 139) @4.5": { ratio: 3.10, issue: 651, where: 'snide/dark/mobile main.flex-1.relative > div.page > div.flex.gap-2.5 > a.flex-1.flex' },
  "dark | rgb(253, 246, 234) on rgb(194, 84, 31) @4.5": { ratio: 4.27, issue: 651, where: 'ua/dark/desktop button.fielddesk-life > div > div > span' },
  "dark | rgb(254, 247, 234) on rgb(194, 84, 31) @4.5": { ratio: 4.30, issue: 651, where: 'ua/dark/mobile main.flex-1.relative > div.page > div.flex.gap-2.5 > a.flex-1.flex' },
  "dark | rgb(255, 255, 255) on rgb(136, 136, 136) @4.5": { ratio: 3.54, issue: 651, where: 'ua/dark/desktop div > div > div.sidebar-card > div' },
  "dark | rgb(255, 255, 255) on rgb(182, 255, 46) @4.5": { ratio: 1.21, issue: 649, where: 'ua/dark/mobile div.py-4 > div > a > span.font-display.italic' },
  "dark | rgb(255, 255, 255) on rgb(196, 154, 58) @4.5": { ratio: 2.62, issue: 651, where: 'ua/dark/desktop div > div > div.sidebar-card > div' },
  "dark | rgb(255, 255, 255) on rgb(239, 83, 80) @4.5": { ratio: 3.49, issue: 649, where: 'ua/dark/mobile div.py-4 > div > a > span.font-display.italic' },
  "dark | rgb(255, 255, 255) on rgb(240, 230, 208) @4.5": { ratio: 1.24, issue: 651, where: 'ua/dark/mobile div.py-4 > div.flex.items-center > div.flex.gap-2 > button' },
  "dark | rgb(255, 255, 255) on rgb(244, 114, 182) @3": { ratio: 2.65, issue: 651, where: 'ua/dark/desktop div > div > div > button' },
  "dark | rgb(255, 255, 255) on rgb(244, 114, 182) @4.5": { ratio: 2.65, issue: 649, where: 'ua/dark/mobile div.py-4 > div > a > span.font-display.italic' },
  "dark | rgb(255, 255, 255) on rgb(245, 158, 11) @4.5": { ratio: 2.15, issue: 651, where: 'ua/dark/desktop div > div > div.sidebar-card > div' },
  "dark | rgb(255, 255, 255) on rgb(255, 45, 139) @4.5": { ratio: 3.50, issue: 651, where: 'ua/dark/desktop a > div > span > span' },
  "dark | rgb(255, 255, 255) on rgb(58, 160, 164) @4.5": { ratio: 3.11, issue: 649, where: 'ua/dark/mobile div.py-4 > div > a > span.font-display.italic' },
  "dark | rgb(255, 255, 255) on rgb(96, 165, 250) @4.5": { ratio: 2.54, issue: 649, where: 'ua/dark/mobile div.py-4 > div > a > span.font-display.italic' },
  "dark | rgb(28, 28, 26) on rgb(28, 27, 35) @3": { ratio: 1.00, issue: 651, where: 'albescent/dark/desktop div > div > div.sidebar-card > div.font-display.italic' },
  "dark | rgb(28, 28, 26) on rgb(28, 27, 35) @4.5": { ratio: 1.00, issue: 651, where: 'albescent/dark/desktop div > div > div.sidebar-card > a.font-display.italic' },
  "dark | rgb(33, 26, 16) on rgb(192, 83, 58) @4.5": { ratio: 3.72, issue: 651, where: 'ephemerists/dark/desktop button.fielddesk-life > div > div > span' },
  "dark | rgb(34, 26, 22) on rgb(226, 67, 63) @4.5": { ratio: 4.16, issue: 651, where: 'ua/dark/desktop div > div.card-footer > div > span' },
  "dark | rgb(61, 36, 16) on rgb(19, 18, 26) @3": { ratio: 1.29, issue: 651, where: 'ua/dark/desktop div > div > div > h2' },
  "dark | rgb(74, 72, 96) on rgb(18, 17, 25) @4.5": { ratio: 2.13, issue: 651, where: 'ua/dark/desktop div.gap-4.items-start > main.min-w-0 > div.page > p' },
  "dark | rgb(74, 72, 96) on rgb(19, 18, 26) @4.5": { ratio: 2.11, issue: 651, where: 'ua/dark/mobile div.min-h-screen.flex > main.flex-1.relative > div.py-4 > p.eyebrow.mb-3' },
  "dark | rgb(74, 72, 96) on rgb(23, 32, 40) @4.5": { ratio: 1.87, issue: 651, where: 'ephemerists/dark/mobile div.mt-4 > div.flex.flex-col > a.sidebar-card > span.font-display.italic' },
  "dark | rgb(74, 72, 96) on rgb(27, 33, 48) @4.5": { ratio: 1.83, issue: 651, where: 'singularity/dark/mobile div.mt-4 > div.flex.flex-col > a.sidebar-card > span.font-display.italic' },
  "dark | rgb(74, 72, 96) on rgb(28, 27, 35) @4.5": { ratio: 1.93, issue: 651, where: 'ua/dark/mobile div.mt-4 > div.flex.flex-col > a.sidebar-card > span.font-display.italic' },
  "dark | rgb(74, 72, 96) on rgb(32, 33, 53) @4.5": { ratio: 1.80, issue: 651, where: 'ua/dark/desktop div.py-8 > div > div.flex-1 > span.eyebrow' },
  "dark | rgb(74, 72, 96) on rgb(33, 23, 26) @4.5": { ratio: 1.98, issue: 651, where: 'ua/dark/mobile div.mt-4 > div.flex.flex-col > a.sidebar-card > span.font-display.italic' },
  "dark | rgb(74, 72, 96) on rgb(36, 20, 28) @4.5": { ratio: 2.00, issue: 651, where: 'everymen/dark/mobile div.mt-4 > div.flex.flex-col > a.sidebar-card > span.font-display.italic' },
  "dark | rgb(74, 72, 96) on rgb(37, 26, 38) @4.5": { ratio: 1.91, issue: 651, where: 'wow/dark/mobile div.mt-4 > div.flex.flex-col > a.sidebar-card > span.font-display.italic' },
  "dark | rgb(74, 72, 96) on rgb(39, 46, 28) @4.5": { ratio: 1.59, issue: 651, where: 'snide/dark/mobile div.mt-4 > div.flex.flex-col > a.sidebar-card > span.font-display.italic' },
  "dark | rgba(122, 112, 96, 0.7) on rgb(33, 32, 39) @3": { ratio: 2.31, issue: 651, where: 'ua/dark/desktop div.page > div > div > div' },
  "dark | rgba(122, 112, 96, 0.7) on rgb(33, 32, 39) @4.5": { ratio: 2.31, issue: 651, where: 'ua/dark/desktop div > div > div > b' },
  "dark | rgba(136, 136, 136, 0.13) on rgb(28, 27, 35) @4.5": { ratio: 1.19, issue: 651, where: 'ua/dark/desktop div.py-8 > div > div > div' },
  "dark | rgba(196, 154, 58, 0.13) on rgb(33, 29, 29) @3": { ratio: 1.24, issue: 651, where: 'ua/dark/desktop div.py-8 > div > div > div' },
  "dark | rgba(226, 67, 63, 0.92) on rgb(34, 26, 22) @4.5": { ratio: 3.71, issue: 651, where: 'ua/dark/desktop div > div.card-footer > div > span' },
  "dark | rgba(245, 158, 11, 0.13) on rgb(37, 29, 25) @3": { ratio: 1.28, issue: 651, where: 'ua/dark/desktop div.py-8 > div > div > div' },
  "dark | rgba(255, 255, 255, 0.85) on rgb(182, 255, 46) @4.5": { ratio: 1.17, issue: 651, where: 'ua/dark/desktop div.py-8 > div.flex.flex-col > div.flex.gap-1 > button.pennant-shape' },
  "dark | rgba(255, 255, 255, 0.85) on rgb(194, 84, 31) @4.5": { ratio: 3.76, issue: 651, where: 'ua/dark/desktop div.py-8 > div.flex.flex-col > div.flex.gap-1 > button.pennant-shape' },
  "dark | rgba(255, 255, 255, 0.85) on rgb(239, 83, 80) @4.5": { ratio: 2.91, issue: 651, where: 'ua/dark/desktop div.py-8 > div.flex.flex-col > div.flex.gap-1 > button.pennant-shape' },
  "dark | rgba(255, 255, 255, 0.85) on rgb(244, 114, 182) @4.5": { ratio: 2.30, issue: 651, where: 'ua/dark/desktop div.py-8 > div.flex.flex-col > div.flex.gap-1 > button.pennant-shape' },
  "dark | rgba(255, 255, 255, 0.85) on rgb(58, 160, 164) @4.5": { ratio: 2.68, issue: 651, where: 'ua/dark/desktop div.py-8 > div.flex.flex-col > div.flex.gap-1 > button.pennant-shape' },
  "dark | rgba(255, 255, 255, 0.85) on rgb(96, 165, 250) @4.5": { ratio: 2.24, issue: 651, where: 'ua/dark/desktop div.py-8 > div.flex.flex-col > div.flex.gap-1 > button.pennant-shape' },
  "dark | rgba(28, 28, 26, 0.22) on rgb(255, 255, 255) @4.5": { ratio: 1.59, issue: 651, where: 'ua/dark/desktop div > div > div > span' },
  "dark | rgba(28, 28, 26, 0.24) on rgb(255, 255, 255) @4.5": { ratio: 1.66, issue: 651, where: 'ua/dark/mobile div.flex.flex-col > a > span > i' },
  "dark | rgba(28, 28, 26, 0.3) on rgb(247, 244, 238) @4.5": { ratio: 1.90, issue: 651, where: 'albescent/dark/mobile div.page > header > div > div' },
  "dark | rgba(28, 28, 26, 0.3) on rgb(255, 255, 255) @4.5": { ratio: 1.92, issue: 651, where: 'albescent/dark/mobile div.page > div > div.flex.items-center > span' },
  "dark | rgba(28, 28, 26, 0.4) on rgb(255, 255, 255) @4.5": { ratio: 2.49, issue: 651, where: 'albescent/dark/mobile div.page > div > div.flex.items-center > span' },
  "dark | rgba(28, 28, 26, 0.42) on rgb(255, 255, 255) @4.5": { ratio: 2.63, issue: 651, where: 'ua/dark/mobile div.mt-4 > div.flex.flex-col > a > p' },
  "dark | rgba(28, 28, 26, 0.45) on rgb(255, 255, 255) @4.5": { ratio: 2.86, issue: 651, where: 'albescent/dark/mobile main.flex-1.relative > div.page > div > p' },
  "dark | rgba(28, 28, 26, 0.5) on rgb(255, 255, 255) @4.5": { ratio: 3.30, issue: 651, where: 'albescent/dark/mobile div.page > div > div.flex.items-center > a' },
  "dark | rgba(28, 28, 26, 0.52) on rgb(255, 255, 255) @4.5": { ratio: 3.50, issue: 651, where: 'ua/dark/desktop div > div > div > span' },
  "dark | rgba(28, 28, 26, 0.55) on rgb(246, 246, 246) @4.5": { ratio: 3.75, issue: 651, where: 'albescent/dark/mobile div > div.flex.items-center > div.shrink-0.flex > span' },
  "dark | rgba(28, 28, 26, 0.55) on rgb(255, 255, 255) @4.5": { ratio: 3.84, issue: 651, where: 'ua/dark/mobile div.flex.flex-col > a > div.flex.items-center > span' },
  "dark | rgba(74, 222, 128, 0.4) on rgb(19, 18, 26) @4.5": { ratio: 2.64, issue: 651, where: 'singularity/dark/desktop div.wz-faction-grid > div > div > div' },
  "dark | rgba(74, 222, 128, 0.4) on rgb(5, 15, 8) @4.5": { ratio: 2.65, issue: 651, where: 'singularity/dark/desktop div > div > div > div' },
  "dark | rgba(74, 222, 128, 0.45) on rgb(19, 18, 26) @4.5": { ratio: 3.03, issue: 651, where: 'singularity/dark/desktop div.wz-faction-grid > div > div > p' },
  "dark | rgba(74, 222, 128, 0.45) on rgb(5, 15, 8) @4.5": { ratio: 3.06, issue: 651, where: 'singularity/dark/mobile div.page > div > div > p' },
  "dark | rgba(74, 222, 128, 0.5) on rgb(5, 15, 8) @4.5": { ratio: 3.51, issue: 651, where: 'singularity/dark/mobile main.flex-1.relative > div.py-4 > section.mt-6 > p' },
  "dark | rgba(74, 222, 128, 0.55) on rgb(5, 15, 8) @4.5": { ratio: 4.02, issue: 651, where: 'ua/dark/mobile div.mt-4 > div.flex.flex-col > a > p' },
  "dark | rgba(74, 222, 128, 0.6) on rgb(96, 165, 250) @4.5": { ratio: 1.23, issue: 651, where: 'singularity/dark/desktop div > div > div > span' },
  "dark | rgba(74, 72, 96, 0.7) on rgb(33, 32, 39) @4.5": { ratio: 1.51, issue: 651, where: 'ua/dark/desktop div.page > div > div > div' },
  "dark | rgba(96, 165, 250, 0.5) on rgb(14, 30, 32) @4.5": { ratio: 2.67, issue: 651, where: 'singularity/dark/desktop div > div > div > span' },
  "dark | rgba(96, 165, 250, 0.55) on rgb(14, 30, 32) @4.5": { ratio: 2.96, issue: 651, where: 'singularity/dark/desktop div > div > div > div' },
  "dark | rgba(96, 165, 250, 0.55) on rgb(5, 15, 8) @4.5": { ratio: 3.04, issue: 651, where: 'singularity/dark/desktop div > div > div > div' },
  "dark | rgba(96, 165, 250, 0.6) on rgb(12, 27, 27) @4.5": { ratio: 3.32, issue: 651, where: 'singularity/dark/mobile div > div.flex.gap-2 > div.text-center > div' },
  "dark | rgba(96, 165, 250, 0.6) on rgb(5, 15, 8) @4.5": { ratio: 3.41, issue: 651, where: 'ua/dark/mobile div.flex.flex-col > a > div.flex.items-center > span' },
  "dark | rgba(96, 165, 250, 0.7) on rgb(5, 15, 8) @4.5": { ratio: 4.24, issue: 651, where: 'singularity/dark/desktop header > div > div > div' },
  "light | rgb(108, 90, 64) on rgb(221, 206, 172) @4.5": { ratio: 4.25, issue: 651, where: 'everymen/light/mobile div > div.flex.gap-2 > div.text-center > div' },
  "light | rgb(111, 174, 0) on rgb(239, 236, 227) @4.5": { ratio: 2.30, issue: 651, where: 'snide/light/mobile div.min-h-screen.flex > main.flex-1.relative > div.py-4 > p' },
  "light | rgb(111, 174, 0) on rgb(244, 241, 232) @3": { ratio: 2.41, issue: 651, where: 'snide/light/desktop div > div > div > div' },
  "light | rgb(111, 174, 0) on rgb(244, 241, 232) @4.5": { ratio: 2.41, issue: 651, where: 'snide/light/desktop div > div > div > div' },
  "light | rgb(111, 174, 0) on rgb(253, 252, 250) @3": { ratio: 2.65, issue: 651, where: 'snide/light/desktop div > div > div.sidebar-card > div.font-display.italic' },
  "light | rgb(111, 174, 0) on rgb(253, 252, 250) @4.5": { ratio: 2.65, issue: 651, where: 'snide/light/desktop div > div > div.sidebar-card > a.font-display.italic' },
  "light | rgb(111, 92, 62) on rgb(220, 203, 162) @4.5": { ratio: 4.00, issue: 651, where: 'ephemerists/light/mobile div.page > header > div > span' },
  "light | rgb(124, 191, 153) on rgb(255, 253, 250) @3": { ratio: 2.12, issue: 651, where: 'wow/light/desktop div > div > div > span' },
  "light | rgb(138, 102, 34) on rgb(233, 220, 191) @4.5": { ratio: 3.86, issue: 651, where: 'ua/light/desktop div > div > div > span' },
  "light | rgb(143, 106, 58) on rgb(236, 228, 210) @4.5": { ratio: 3.87, issue: 651, where: 'ua/light/mobile main.flex-1.relative > div.py-4 > section.mt-6 > p' },
  "light | rgb(143, 106, 58) on rgb(247, 240, 227) @4.5": { ratio: 4.32, issue: 651, where: 'ua/light/mobile div > div.flex.items-center > div.min-w-0.flex-1 > div.truncate' },
  "light | rgb(143, 106, 58) on rgb(247, 244, 238) @4.5": { ratio: 4.46, issue: 651, where: 'ua/light/desktop div.wz-faction-grid > div > div > p' },
  "light | rgb(155, 142, 125) on rgb(225, 231, 226) @4.5": { ratio: 2.54, issue: 651, where: 'ephemerists/light/mobile div.mt-4 > div.flex.flex-col > a.sidebar-card > span.font-display.italic' },
  "light | rgb(155, 142, 125) on rgb(226, 230, 238) @4.5": { ratio: 2.55, issue: 651, where: 'singularity/light/mobile div.mt-4 > div.flex.flex-col > a.sidebar-card > span.font-display.italic' },
  "light | rgb(155, 142, 125) on rgb(234, 230, 237) @4.5": { ratio: 2.60, issue: 651, where: 'ua/light/desktop div.py-8 > div > div.flex-1 > span.eyebrow' },
  "light | rgb(155, 142, 125) on rgb(237, 246, 207) @4.5": { ratio: 2.84, issue: 651, where: 'snide/light/mobile div.mt-4 > div.flex.flex-col > a.sidebar-card > span.font-display.italic' },
  "light | rgb(155, 142, 125) on rgb(238, 235, 230) @4.5": { ratio: 2.70, issue: 651, where: 'ua/light/desktop div.gap-4.items-start > main.min-w-0 > div.page > p' },
  "light | rgb(155, 142, 125) on rgb(242, 224, 219) @4.5": { ratio: 2.50, issue: 651, where: 'everymen/light/mobile div.mt-4 > div.flex.flex-col > a.sidebar-card > span.font-display.italic' },
  "light | rgb(155, 142, 125) on rgb(243, 231, 221) @4.5": { ratio: 2.64, issue: 651, where: 'ua/light/mobile div.mt-4 > div.flex.flex-col > a.sidebar-card > span.font-display.italic' },
  "light | rgb(155, 142, 125) on rgb(246, 229, 230) @4.5": { ratio: 2.63, issue: 651, where: 'wow/light/mobile div.mt-4 > div.flex.flex-col > a.sidebar-card > span.font-display.italic' },
  "light | rgb(155, 142, 125) on rgb(247, 244, 238) @4.5": { ratio: 2.92, issue: 651, where: 'ua/light/mobile div.min-h-screen.flex > main.flex-1.relative > div.py-4 > p.eyebrow.mb-3' },
  "light | rgb(155, 142, 125) on rgb(250, 249, 247) @4.5": { ratio: 3.04, issue: 651, where: 'albescent/light/mobile div.mt-4 > div.flex.flex-col > a.sidebar-card > span.font-display.italic' },
  "light | rgb(155, 142, 125) on rgb(253, 252, 250) @4.5": { ratio: 3.12, issue: 651, where: 'ua/light/mobile div.mt-4 > div.flex.flex-col > a.sidebar-card > span.font-display.italic' },
  "light | rgb(156, 106, 26) on rgb(236, 228, 210) @4.5": { ratio: 3.70, issue: 651, where: 'ua/light/mobile div.min-h-screen.flex > main.flex-1.relative > div.py-4 > p' },
  "light | rgb(156, 106, 26) on rgb(247, 240, 227) @4.5": { ratio: 4.12, issue: 651, where: 'ua/light/desktop div > div > div > div' },
  "light | rgb(156, 106, 26) on rgb(253, 246, 234) @4.5": { ratio: 4.35, issue: 651, where: 'ua/light/mobile section.mt-6 > div.flex.flex-col > a > span' },
  "light | rgb(156, 54, 34) on rgb(220, 203, 162) @4.5": { ratio: 4.42, issue: 651, where: 'ephemerists/light/mobile div.min-h-screen.flex > main.flex-1.relative > div.py-4 > p' },
  "light | rgb(168, 137, 90) on rgb(236, 228, 210) @4.5": { ratio: 2.60, issue: 651, where: 'ua/light/mobile main.flex-1.relative > div.page > header > div' },
  "light | rgb(168, 137, 90) on rgb(247, 240, 227) @4.5": { ratio: 2.90, issue: 651, where: 'ua/light/mobile div > div > div.flex.items-center > span' },
  "light | rgb(168, 137, 90) on rgb(247, 244, 238) @4.5": { ratio: 2.99, issue: 651, where: 'ua/light/desktop div > div > div > div' },
  "light | rgb(168, 137, 90) on rgb(253, 246, 234) @4.5": { ratio: 3.06, issue: 651, where: 'ua/light/desktop div > div > div > span' },
  "light | rgb(168, 137, 90) on rgb(254, 247, 234) @4.5": { ratio: 3.08, issue: 651, where: 'ua/light/mobile div > div.flex.gap-2 > div.text-center > div' },
  "light | rgb(168, 58, 110) on rgb(251, 207, 226) @4.5": { ratio: 4.33, issue: 651, where: 'ua/light/desktop div > div > div > div' },
  "light | rgb(181, 88, 138) on rgb(255, 253, 250) @4.5": { ratio: 4.37, issue: 651, where: 'ua/light/desktop div > div > div > p' },
  "light | rgb(182, 255, 46) on rgb(239, 236, 227) @4.5": { ratio: 1.03, issue: 651, where: 'snide/light/mobile div.py-4 > section.mt-6 > div > span' },
  "light | rgb(182, 255, 46) on rgb(247, 244, 238) @3": { ratio: 1.10, issue: 651, where: 'snide/light/desktop div > div > div > span' },
  "light | rgb(193, 39, 45) on rgb(217, 154, 43) @4.5": { ratio: 2.39, issue: 651, where: 'everymen/light/mobile section.mt-6 > div.flex.flex-col > a > span' },
  "light | rgb(193, 39, 45) on rgb(224, 213, 187) @4.5": { ratio: 4.01, issue: 651, where: 'ua/light/mobile div.mt-4 > div.flex.flex-col > a > span' },
  "light | rgb(193, 39, 45) on rgb(236, 225, 198) @4.5": { ratio: 4.49, issue: 651, where: 'ua/light/desktop div > div.card-footer > div > span' },
  "light | rgb(194, 84, 31) on rgb(247, 240, 227) @4.5": { ratio: 4.04, issue: 651, where: 'ua/light/mobile div > div > div.flex.items-center > a' },
  "light | rgb(194, 84, 31) on rgb(253, 246, 234) @4.5": { ratio: 4.27, issue: 651, where: 'ua/light/mobile section.mt-6 > div.flex.flex-col > a > span' },
  "light | rgb(194, 84, 31) on rgb(253, 252, 250) @4.5": { ratio: 4.47, issue: 651, where: 'ua/light/desktop div > div > div.sidebar-card > a.font-display.italic' },
  "light | rgb(194, 84, 31) on rgb(254, 247, 234) @4.5": { ratio: 4.30, issue: 651, where: 'ua/light/mobile section.mt-6 > div.flex.flex-col > a > span' },
  "light | rgb(212, 171, 85) on rgb(233, 220, 191) @4.5": { ratio: 1.58, issue: 651, where: 'ua/light/desktop div > div > div > span' },
  "light | rgb(212, 171, 85) on rgb(29, 79, 110) @4.5": { ratio: 4.07, issue: 651, where: 'ua/light/desktop div > div > div > div' },
  "light | rgb(216, 214, 200) on rgb(239, 236, 227) @4.5": { ratio: 1.24, issue: 651, where: 'snide/light/mobile main.flex-1.relative > div.page > header > div' },
  "light | rgb(216, 214, 200) on rgb(247, 244, 238) @4.5": { ratio: 1.33, issue: 651, where: 'snide/light/desktop div.wz-faction-grid > div > div > p' },
  "light | rgb(217, 154, 43) on rgb(193, 39, 45) @4.5": { ratio: 2.39, issue: 651, where: 'everymen/light/desktop div > div > div > div' },
  "light | rgb(236, 225, 198) on rgb(193, 39, 45) @4.5": { ratio: 4.49, issue: 651, where: 'ua/light/desktop div > div.card-footer > div > span' },
  "light | rgb(236, 95, 153) on rgb(245, 208, 227) @4.5": { ratio: 2.26, issue: 651, where: 'ua/light/desktop div > div > div.card-footer > span' },
  "light | rgb(236, 95, 153) on rgb(253, 238, 243) @4.5": { ratio: 2.81, issue: 651, where: 'wow/light/desktop button.fielddesk-life > div > div > span' },
  "light | rgb(236, 95, 153) on rgb(253, 238, 246) @4.5": { ratio: 2.81, issue: 651, where: 'ua/light/mobile div > div > div.flex.items-center > span' },
  "light | rgb(236, 95, 153) on rgb(253, 252, 250) @4.5": { ratio: 3.07, issue: 651, where: 'wow/light/desktop div > div > div.sidebar-card > a.font-display.italic' },
  "light | rgb(236, 95, 153) on rgb(255, 253, 250) @4.5": { ratio: 3.10, issue: 651, where: 'ua/light/mobile a > div > div > span' },
  "light | rgb(244, 241, 232) on rgb(255, 45, 139) @4.5": { ratio: 3.10, issue: 651, where: 'snide/light/mobile main.flex-1.relative > div.page > div.flex.gap-2.5 > a.flex-1.flex' },
  "light | rgb(253, 238, 243) on rgb(236, 95, 153) @4.5": { ratio: 2.81, issue: 651, where: 'ua/light/desktop div > div > div.card-footer > span' },
  "light | rgb(253, 246, 234) on rgb(194, 84, 31) @4.5": { ratio: 4.27, issue: 651, where: 'ua/light/desktop button.fielddesk-life > div > div > span' },
  "light | rgb(254, 247, 234) on rgb(194, 84, 31) @4.5": { ratio: 4.30, issue: 651, where: 'ua/light/mobile main.flex-1.relative > div.page > div.flex.gap-2.5 > a.flex-1.flex' },
  "light | rgb(255, 255, 255) on rgb(111, 174, 0) @4.5": { ratio: 2.72, issue: 649, where: 'ua/light/mobile div.py-4 > div > a > span.font-display.italic' },
  "light | rgb(255, 255, 255) on rgb(136, 136, 136) @4.5": { ratio: 3.54, issue: 651, where: 'ua/light/desktop div > div > div.sidebar-card > div' },
  "light | rgb(255, 255, 255) on rgb(196, 154, 58) @4.5": { ratio: 2.62, issue: 651, where: 'ua/light/desktop div > div > div.sidebar-card > div' },
  "light | rgb(255, 255, 255) on rgb(236, 95, 153) @4.5": { ratio: 3.15, issue: 649, where: 'ua/light/mobile div.py-4 > div > a > span.font-display.italic' },
  "light | rgb(255, 255, 255) on rgb(245, 158, 11) @4.5": { ratio: 2.15, issue: 651, where: 'ua/light/desktop div > div > div.sidebar-card > div' },
  "light | rgb(255, 255, 255) on rgb(255, 45, 139) @4.5": { ratio: 3.50, issue: 651, where: 'ua/light/desktop a > div > span > span' },
  "light | rgb(255, 45, 139) on rgb(247, 244, 238) @4.5": { ratio: 3.19, issue: 651, where: 'snide/light/desktop div.wz-faction-grid > div > div > div' },
  "light | rgb(29, 110, 114) on rgb(233, 220, 191) @4.5": { ratio: 4.38, issue: 651, where: 'ua/light/mobile div.mt-4 > div.flex.flex-col > a > span' },
  "light | rgb(5, 15, 8) on rgb(37, 99, 235) @4.5": { ratio: 3.77, issue: 651, where: 'singularity/light/desktop div > div > div > span' },
  "light | rgb(74, 222, 128) on rgb(247, 244, 238) @3": { ratio: 1.59, issue: 651, where: 'singularity/light/desktop div > div > div > h2' },
  "light | rgba(107, 96, 80, 0.7) on rgb(240, 237, 230) @3": { ratio: 2.90, issue: 651, where: 'ua/light/desktop div.page > div > div > div' },
  "light | rgba(107, 96, 80, 0.7) on rgb(240, 237, 230) @4.5": { ratio: 2.90, issue: 651, where: 'ua/light/desktop div > div > div > b' },
  "light | rgba(111, 92, 62, 0.85) on rgb(233, 220, 191) @4.5": { ratio: 3.56, issue: 651, where: 'ua/light/desktop div > div > div > div' },
  "light | rgba(136, 136, 136, 0.13) on rgb(238, 235, 230) @4.5": { ratio: 1.13, issue: 651, where: 'ua/light/desktop div.py-8 > div > div > div' },
  "light | rgba(155, 142, 125, 0.7) on rgb(240, 237, 230) @4.5": { ratio: 1.95, issue: 651, where: 'ua/light/desktop div.page > div > div > div' },
  "light | rgba(193, 39, 45, 0.92) on rgb(236, 225, 198) @4.5": { ratio: 4.10, issue: 651, where: 'ua/light/desktop div > div.card-footer > div > span' },
  "light | rgba(196, 154, 58, 0.13) on rgb(243, 237, 224) @3": { ratio: 1.10, issue: 651, where: 'ua/light/desktop div.py-8 > div > div > div' },
  "light | rgba(212, 171, 85, 0.7) on rgb(29, 79, 110) @4.5": { ratio: 2.73, issue: 651, where: 'ua/light/desktop div > div > div > div' },
  "light | rgba(244, 236, 214, 0.9) on rgb(193, 39, 45) @4.5": { ratio: 4.26, issue: 651, where: 'ua/light/desktop div > div > div > div' },
  "light | rgba(245, 158, 11, 0.13) on rgb(247, 237, 220) @3": { ratio: 1.09, issue: 651, where: 'ua/light/desktop div.py-8 > div > div > div' },
  "light | rgba(255, 255, 255, 0.85) on rgb(111, 174, 0) @4.5": { ratio: 2.36, issue: 651, where: 'ua/light/desktop div.py-8 > div.flex.flex-col > div.flex.gap-1 > button.pennant-shape' },
  "light | rgba(255, 255, 255, 0.85) on rgb(194, 84, 31) @4.5": { ratio: 3.76, issue: 651, where: 'ua/light/desktop div.py-8 > div.flex.flex-col > div.flex.gap-1 > button.pennant-shape' },
  "light | rgba(255, 255, 255, 0.85) on rgb(236, 95, 153) @4.5": { ratio: 2.68, issue: 651, where: 'ua/light/desktop div.py-8 > div.flex.flex-col > div.flex.gap-1 > button.pennant-shape' },
  "light | rgba(255, 255, 255, 0.85) on rgb(37, 99, 235) @4.5": { ratio: 4.19, issue: 651, where: 'ua/light/desktop div.py-8 > div.flex.flex-col > div.flex.gap-1 > button.pennant-shape' },
  "light | rgba(28, 28, 26, 0.22) on rgb(255, 255, 255) @4.5": { ratio: 1.59, issue: 651, where: 'ua/light/desktop div > div > div > span' },
  "light | rgba(28, 28, 26, 0.24) on rgb(255, 255, 255) @4.5": { ratio: 1.66, issue: 651, where: 'ua/light/mobile div.flex.flex-col > a > span > i' },
  "light | rgba(28, 28, 26, 0.3) on rgb(247, 244, 238) @4.5": { ratio: 1.90, issue: 651, where: 'albescent/light/mobile div.page > header > div > div' },
  "light | rgba(28, 28, 26, 0.3) on rgb(255, 255, 255) @4.5": { ratio: 1.92, issue: 651, where: 'albescent/light/mobile div.page > div > div.flex.items-center > span' },
  "light | rgba(28, 28, 26, 0.4) on rgb(255, 255, 255) @4.5": { ratio: 2.49, issue: 651, where: 'albescent/light/mobile div.page > div > div.flex.items-center > span' },
  "light | rgba(28, 28, 26, 0.42) on rgb(255, 255, 255) @4.5": { ratio: 2.63, issue: 651, where: 'ua/light/mobile div.mt-4 > div.flex.flex-col > a > p' },
  "light | rgba(28, 28, 26, 0.45) on rgb(255, 255, 255) @4.5": { ratio: 2.86, issue: 651, where: 'albescent/light/mobile main.flex-1.relative > div.page > div > p' },
  "light | rgba(28, 28, 26, 0.5) on rgb(255, 255, 255) @4.5": { ratio: 3.30, issue: 651, where: 'albescent/light/mobile div.page > div > div.flex.items-center > a' },
  "light | rgba(28, 28, 26, 0.52) on rgb(255, 255, 255) @4.5": { ratio: 3.50, issue: 651, where: 'ua/light/desktop div > div > div > span' },
  "light | rgba(28, 28, 26, 0.55) on rgb(246, 246, 246) @4.5": { ratio: 3.75, issue: 651, where: 'albescent/light/mobile div > div.flex.items-center > div.shrink-0.flex > span' },
  "light | rgba(28, 28, 26, 0.55) on rgb(255, 255, 255) @4.5": { ratio: 3.84, issue: 651, where: 'ua/light/mobile div.flex.flex-col > a > div.flex.items-center > span' },
  "light | rgba(74, 222, 128, 0.4) on rgb(247, 244, 238) @4.5": { ratio: 1.23, issue: 651, where: 'singularity/light/desktop div.wz-faction-grid > div > div > div' },
  "light | rgba(74, 222, 128, 0.4) on rgb(5, 15, 8) @4.5": { ratio: 2.65, issue: 651, where: 'singularity/light/desktop div > div > div > div' },
  "light | rgba(74, 222, 128, 0.45) on rgb(247, 244, 238) @4.5": { ratio: 1.26, issue: 651, where: 'singularity/light/desktop div.wz-faction-grid > div > div > p' },
  "light | rgba(74, 222, 128, 0.45) on rgb(5, 15, 8) @4.5": { ratio: 3.06, issue: 651, where: 'singularity/light/mobile div.page > div > div > p' },
  "light | rgba(74, 222, 128, 0.5) on rgb(5, 15, 8) @4.5": { ratio: 3.51, issue: 651, where: 'singularity/light/mobile main.flex-1.relative > div.py-4 > section.mt-6 > p' },
  "light | rgba(74, 222, 128, 0.55) on rgb(5, 15, 8) @4.5": { ratio: 4.02, issue: 651, where: 'ua/light/mobile div.mt-4 > div.flex.flex-col > a > p' },
  "light | rgba(74, 222, 128, 0.6) on rgb(37, 99, 235) @4.5": { ratio: 1.90, issue: 651, where: 'singularity/light/desktop div > div > div > span' },
  "light | rgba(96, 165, 250, 0.5) on rgb(8, 23, 31) @4.5": { ratio: 2.71, issue: 651, where: 'singularity/light/desktop div > div > div > span' },
  "light | rgba(96, 165, 250, 0.55) on rgb(5, 15, 8) @4.5": { ratio: 3.04, issue: 651, where: 'singularity/light/desktop div > div > div > div' },
  "light | rgba(96, 165, 250, 0.55) on rgb(8, 23, 31) @4.5": { ratio: 3.02, issue: 651, where: 'singularity/light/desktop div > div > div > div' },
  "light | rgba(96, 165, 250, 0.6) on rgb(12, 27, 27) @4.5": { ratio: 3.32, issue: 651, where: 'singularity/light/mobile div > div.flex.gap-2 > div.text-center > div' },
  "light | rgba(96, 165, 250, 0.6) on rgb(5, 15, 8) @4.5": { ratio: 3.41, issue: 651, where: 'ua/light/mobile div.flex.flex-col > a > div.flex.items-center > span' },
  "light | rgba(96, 165, 250, 0.7) on rgb(5, 15, 8) @4.5": { ratio: 4.24, issue: 651, where: 'singularity/light/desktop header > div > div > div' },
};
