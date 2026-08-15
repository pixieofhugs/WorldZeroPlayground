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
 * breadcrumb for whoever picks up the fix.
 *
 * **This list only ever shrinks.** Fixing a pair means DELETING its entry, not
 * editing the ratio — an allowlisted pair that starts passing fails the spec
 * on purpose. Never add an entry for new work.
 *
 * UNMEASURABLE BACKDROPS ARE NOT ON THIS LIST (#1675). Text over a gradient
 * with an opaque stop has no single backdrop colour, so the scanner refuses to
 * measure it rather than guessing. It used to be enumerated here as a pair
 * keyed on the gradient CSS, which rotted on contact: every colour edit minted
 * a new key, and by 2026-08-14 not one of those 56 entries matched anything the
 * sweep still saw. Those findings are now REPORTED, and ratcheted by count
 * against `UNRESOLVED_SURFACE_CEILING` below.
 */

import type { Finding } from './contrastScan';

export type BaselineEntry = {
  /** Measured ratio when this entry landed. Every entry here was MEASURED. */
  ratio: number;
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
 * THE LIST. Machine-produced by the sweep itself
 * (`CONTRAST_BASELINE_OUT=<path> bash frontend/e2e/run-e2e.sh contrast.spec.ts`),
 * never hand-typed — 185 hand-copied ratios would be wrong within a week,
 * which is this issue's whole thesis.
 *
 *   - 7 entries owned by #649 (white `--color-text-on-accent` on a faction
 *     fill). That issue's acceptance, measured as rendered.
 *   - the rest await triage into children off #651.
 */
export const RENDERED_BASELINE: Record<string, BaselineEntry> = {
  "dark | rgb(111, 174, 0) on rgb(244, 241, 232) @3": { ratio: 2.41, issue: 651, where: 'snide/dark/desktop div > div > div > div' },
  "dark | rgb(111, 174, 0) on rgb(244, 241, 232) @4.5": { ratio: 2.41, issue: 651, where: 'snide/dark/desktop div > div > div > div' },
  "dark | rgb(12, 10, 6) on rgb(19, 18, 26) @3": { ratio: 1.06, issue: 651, where: 'ephemerists/dark/desktop div.wz-faction-grid > div > div > h2' },
  "dark | rgb(12, 10, 6) on rgb(33, 26, 16) @3": { ratio: 1.15, issue: 651, where: 'ephemerists/dark/desktop div > div > div > div' },
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

/**
 * Part D (#1675) — the coverage ratchet for backdrops the scanner REFUSES to
 * measure.
 *
 * `contrastScan` returns `background: null` when the thing behind the text is
 * a gradient with an opaque stop or an image: the colour genuinely varies
 * under the glyphs, so there is no ratio to compute. That refusal is correct —
 * the alternative is measuring against a guess — but treating it as a contrast
 * FAILURE made this spec unsatisfiable. World Zero's faction skins are built
 * out of exactly those fills, so all 28 tests were red from the day the guard
 * landed and stayed red (2026-08-14 nightly: 728 unmeasurable findings against
 * 168 genuinely-measured ones).
 *
 * Molly's ruling on #1675: report them, don't fail on them — but LOUDLY. A
 * silent skip turns a red suite into a green one that checks less. So the spec
 * prints every surface it could not resolve, and the count is ratcheted here.
 * Gaining a surface is a coverage regression even though it is not a contrast
 * defect, and it fails the run.
 *
 * WHY A COUNT AND NOT A LIST OF SURFACES. The obvious shape — allowlist the
 * gradient CSS, like `RENDERED_BASELINE` allowlists the colour pair — is what
 * this file used to do, and it rotted: the CSS embeds its colour stops, so
 * every palette edit minted a fresh key and the 56 grandfathered entries
 * matched nothing at all by the time they were deleted. A count survives a
 * restop; it still catches the thing that matters, which is a NEW region of the
 * app going unchecked.
 *
 * A surface is one distinct `backdropCss`, counted per test. A combination
 * with no entry here has a ceiling of 0 on purpose — add a faction or a
 * viewport and you must record what it costs in coverage.
 *
 * ponytail: these numbers were read off the failing 2026-08-14 nightly (run
 * 31779247838), not regenerated locally — a subagent worktree has no Playwright
 * browsers and no seeded Postgres. They are exact for that run's output, which
 * truncates each gradient to 80 characters; two surfaces agreeing to 80
 * characters would count as one and leave the ceiling one low. If the first
 * nightly after this lands reports a higher count, bump the offending entry to
 * the number the run prints — do not raise them speculatively.
 */
export const UNRESOLVED_SURFACE_CEILING: Record<string, number> = {
  'ua/light/mobile': 5,
  'ua/light/desktop': 8,
  'ua/dark/mobile': 5,
  'ua/dark/desktop': 8,
  'everymen/light/mobile': 5,
  'everymen/light/desktop': 7,
  'everymen/dark/mobile': 5,
  'everymen/dark/desktop': 7,
  'wow/light/mobile': 7,
  'wow/light/desktop': 8,
  'wow/dark/mobile': 7,
  'wow/dark/desktop': 8,
  'snide/light/mobile': 5,
  'snide/light/desktop': 7,
  'snide/dark/mobile': 5,
  'snide/dark/desktop': 7,
  'ephemerists/light/mobile': 5,
  'ephemerists/light/desktop': 7,
  'ephemerists/dark/mobile': 5,
  'ephemerists/dark/desktop': 7,
  'singularity/light/mobile': 5,
  'singularity/light/desktop': 7,
  'singularity/dark/mobile': 5,
  'singularity/dark/desktop': 7,
  'albescent/light/mobile': 5,
  'albescent/light/desktop': 7,
  'albescent/dark/mobile': 5,
  'albescent/dark/desktop': 7,
};

/** What the sweep does with one page's worth of findings. */
export type Triage = {
  /** Measured below AA and not grandfathered — these FAIL the run. */
  failures: Finding[];
  /** Grandfathered pairs that now clear AA — the list only shrinks, so these FAIL too. */
  stale: string[];
  /**
   * Text the scanner refused to measure, grouped by the CSS that defeated it.
   * One key = one unmeasurable SURFACE. Reported, and counted against
   * `UNRESOLVED_SURFACE_CEILING` — never a per-finding failure.
   */
  unmeasurable: Map<string, Finding[]>;
};

/**
 * Sort findings into the three buckets above. Pure, so the policy this spec
 * enforces can be exercised by `src/utils/__tests__/contrastTriage.test.ts`
 * without standing up Playwright, a backend and a seeded database.
 */
export function triageFindings(theme: string, findings: readonly Finding[]): Triage {
  const failures: Finding[] = [];
  const stale: string[] = [];
  const unmeasurable = new Map<string, Finding[]>();

  for (const finding of findings) {
    if (finding.background === null) {
      const surface = finding.backdropCss ?? 'unknown';
      const group = unmeasurable.get(surface);
      if (group) group.push(finding);
      else unmeasurable.set(surface, [finding]);
      continue;
    }

    const key = baselineKey(theme, finding.text, finding.background, finding.required);
    const allowed: BaselineEntry | undefined = RENDERED_BASELINE[key];

    if (finding.ratio >= finding.required) {
      // A pair that now passes but is still allowlisted is debt that got fixed
      // without the list being updated. Catch it: an allowlist that outlives
      // its bug stops being a ratchet.
      if (allowed) stale.push(`${key} now measures ${finding.ratio.toFixed(2)}:1 (owned by #${allowed.issue})`);
      continue;
    }
    if (allowed) continue;
    failures.push(finding);
  }

  return { failures, stale, unmeasurable };
}
