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
 * UNMEASURABLE BACKDROPS ARE NOT ON THIS LIST (#1675, #1762). Text over a
 * gradient with an opaque stop has no single backdrop colour, so the scanner
 * refuses to measure it rather than guessing. Those findings used to be
 * enumerated here too, keyed on the gradient CSS — 56 of them — which gave
 * unmeasurable surfaces TWO governing mechanisms at once. Worse, the older one
 * was invisible: `contrast.spec.ts` consulted this list BEFORE the branch that
 * collects the report, so an allowlisted unmeasurable surface was neither
 * printed nor counted against the ceiling. A silent skip is exactly what the
 * #1675 ruling forbade. They now go through one mechanism only — reported by
 * `triageFindings` below, ratcheted by count in the spec.
 */

import {
  compositeOver,
  contrastRatio,
  parseColor,
  relativeLuminance,
  type Rgba,
} from './contrast';
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
 * never hand-typed — hand-copied ratios would be wrong within a week, which is
 * this issue's whole thesis.
 *
 * NO COUNT IS WRITTEN HERE, deliberately (#1780). This header once claimed 269
 * entries while the object held 241, and nothing could notice. A count is
 * `Object.keys(RENDERED_BASELINE).length`, and the only honest place to say it
 * is code that derives it.
 *
 * Entries owned by #649 (white `--color-text-on-accent` on a faction fill) are
 * that issue's acceptance, measured as rendered; the rest await triage into
 * children off #651. Which is which is the `issue` field, not a tally.
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

/* ------------------------------------------------------------------------ *
 * #1727 — resolving a decorative fill, structurally.
 *
 * The scanner refuses a `background-image` with an opaque stop because the
 * colour under the text genuinely varies. That refusal is too coarse, and it
 * was costing 8-9 surfaces per faction: most of the app's "gradients" are
 * paper stocks — a two-stop ramp between two near-identical creams, under a
 * few translucent tints — and a ramp only defeats measurement when the INK's
 * own luminance falls inside the band the fill spans. Outside that band, the
 * worst case is the band edge nearest the ink, and it is exact rather than
 * estimated: interpolating a gradient is a per-channel lerp, so every colour
 * it paints has a luminance between its stops'.
 *
 * THIS IS THE STRUCTURAL EXEMPTION the issue asks for, and it is structural in
 * the strongest available sense: the marker is the fill's own computed CSS.
 * There is no list of selectors, no data attribute to remember, and a new
 * faction frame is classified on the day it ships without anyone editing this
 * file. A hand-maintained array would have rotted, and — worse — could have
 * exempted a ground that IS measurable, which is the failure mode the #1675
 * ruling called worse than the red.
 *
 * WHAT IT DELIBERATELY DOES NOT TOUCH. A finding that already carries a
 * `background` never reaches here: translucent-over-solid grounds (#1715's
 * `--color-bg-surface-alt` over the page, #1579's `--switch-thumb` over
 * `--switch-well`) are resolved by the scanner and measured exactly as before.
 * And a faction hue used as ink on a flat near-white ground (#1932) was never
 * an unresolved finding at all. Both classes are covered by tests in
 * `src/utils/__tests__/contrastTriage.test.ts` for exactly that reason.
 *
 * PURE, AND NODE-SIDE, ON PURPOSE (#1762, #1780). The scanner runs inside
 * `page.evaluate`, which no PR ever exercises. So the
 * scanner reports facts — the fill's CSS, the background-color under it, the
 * translucent stack over it — and every DECISION lives here, in milliseconds,
 * with no browser.
 * ------------------------------------------------------------------------ */

/**
 * The darkest and lightest opaque colour a fill can put under text. `lo`/`hi`
 * are ordered by WCAG relative luminance, not by stop order.
 */
export type FillBand = { lo: Rgba; hi: Rgba };

/** A finding whose ground is known — either resolved by the scanner or banded here. */
type Resolved = Finding & { background: string };

/**
 * Give up past this many distinct candidate colours. The paper stocks stack up
 * to seven gradient layers; the product of their stops is in the low hundreds,
 * and anything beyond this is a fill nobody should be putting text on.
 */
const MAX_CANDIDATES = 512;

/** `background-image` layers, in CSS order — the FIRST one paints on top. */
function splitLayers(css: string): string[] {
  const layers: string[] = [];
  let depth = 0;
  let start = 0;
  for (let index = 0; index < css.length; index += 1) {
    const char = css[index];
    if (char === '(') depth += 1;
    else if (char === ')') depth -= 1;
    else if (char === ',' && depth === 0) {
      layers.push(css.slice(start, index).trim());
      start = index + 1;
    }
  }
  layers.push(css.slice(start).trim());
  return layers.filter(Boolean);
}

/**
 * Every colour stop in one layer, or null if the layer is not a gradient we can
 * read — an image, or one whose stops we cannot parse. Never guess: a stop
 * silently dropped narrows the band, and a narrow band turns a real failure
 * into a pass.
 */
const STOP = /(?:rgba?|color)\([^()]*\)|\btransparent\b/g;

function stopsOf(layer: string): Rgba[] | null {
  if (layer === 'none') return [];
  if (!/gradient\(/.test(layer)) return null; // url(), cross-fade(), anything else
  const tokens = layer.match(STOP);
  if (!tokens) return null;
  const stops: Rgba[] = [];
  for (const token of tokens) {
    const color = parseColor(token);
    if (color === null) return null;
    stops.push(color);
  }
  return stops.length ? stops : null;
}

/**
 * Source-over where the BACKDROP may itself be translucent — `compositeOver`
 * in `./contrast` assumes an opaque ground and hard-codes `a: 1`,
 * which is right for its callers and wrong halfway up a stack of fills.
 */
function sourceOver(fore: Rgba, back: Rgba): Rgba {
  const alpha = fore.a + back.a * (1 - fore.a);
  if (alpha === 0) return { r: 0, g: 0, b: 0, a: 0 };
  const mix = (front: number, behind: number) =>
    (front * fore.a + behind * back.a * (1 - fore.a)) / alpha;
  return { r: mix(fore.r, back.r), g: mix(fore.g, back.g), b: mix(fore.b, back.b), a: alpha };
}

function dedupe(colors: Rgba[]): Rgba[] {
  const seen = new Map<string, Rgba>();
  for (const color of colors) {
    const key = [color.r, color.g, color.b, color.a].map((channel) => channel.toFixed(3)).join('|');
    if (!seen.has(key)) seen.set(key, color);
  }
  return [...seen.values()];
}

/**
 * The luminance band a decorative fill spans, or null when it cannot be pinned
 * down — an image layer, an unparseable stop, or a fill that never reaches
 * opacity, in which case whatever sits below the element is still showing
 * through and we do not know what that is.
 *
 * The candidate set is a deliberate over-estimate: it composites every stop of
 * every layer over every stop of the layer beneath, whether or not those two
 * points coincide on screen. Over-wide is the safe direction — it can only
 * push a fill back into the unmeasurable report, never quietly widen a passing
 * ratio.
 *
 * ponytail: stops only, ignoring geometry. A gradient's stop POSITIONS say
 * where each colour lands, and text usually covers a fraction of the element,
 * so the true band under one line is narrower than this. The ceiling is that a
 * fill can be called unmeasurable because of a corner the text never touches.
 * The upgrade path is the text node's own box against the fill's box and stop
 * offsets — which needs layout, so it belongs in the scanner, which is where
 * this file exists to avoid putting decisions.
 */
export function resolveFillBand(finding: Finding): FillBand | null {
  if (finding.backdropCss === null || finding.backdropBase === null) return null;

  const base = parseColor(finding.backdropBase);
  if (base === null) return null;

  let candidates: Rgba[] = [base];
  // Bottom layer first: the last one in the CSS list is painted first.
  for (const layer of splitLayers(finding.backdropCss).reverse()) {
    const stops = stopsOf(layer);
    if (stops === null) return null;
    if (stops.length === 0) continue;
    const next: Rgba[] = [];
    for (const stop of stops) for (const under of candidates) next.push(sourceOver(stop, under));
    candidates = dedupe(next);
    if (candidates.length > MAX_CANDIDATES) return null;
  }

  if (candidates.some((color) => color.a < 0.999)) return null;

  let opaque = candidates.map((color) => ({ ...color, a: 1 }));
  if (finding.backdropOverlay !== null) {
    const overlay = parseColor(finding.backdropOverlay);
    if (overlay === null) return null;
    opaque = opaque.map((color) => compositeOver(overlay, color));
  }

  let lo = opaque[0];
  let hi = opaque[0];
  for (const color of opaque) {
    if (relativeLuminance(color) < relativeLuminance(lo)) lo = color;
    if (relativeLuminance(color) > relativeLuminance(hi)) hi = color;
  }
  return { lo, hi };
}

/** Match the scanner's `show()` so a banded finding keys into the same baseline. */
function showOpaque(color: Rgba): string {
  const [r, g, b] = [color.r, color.g, color.b].map((channel) => Math.round(channel));
  return `rgb(${r}, ${g}, ${b})`;
}

/**
 * Measure a finding the scanner gave up on, against the worst point of the
 * fill beneath it — or return null when the fill genuinely defeats it.
 *
 * The one case that stays unmeasurable is the ink CROSSING the band: if the
 * text is lighter than the fill's dark end and darker than its light end, the
 * two match somewhere along the ramp and the true ratio there is 1:1. There is
 * no worst stop to quote, and quoting one would be a guess. That residue is
 * what the #1675 report should be left holding: the unaffiliated spectrum, the
 * gilt wordmark, the WOW title bars.
 *
 * Otherwise the ratio is monotone across the band, so its minimum is at the
 * edge nearest the ink, and that edge is the honest ground to record.
 */
export function measureOverFill(finding: Finding): Resolved | null {
  const band = resolveFillBand(finding);
  if (band === null) return null;

  const text = parseColor(finding.text);
  if (text === null) return null;

  const lift = (surface: Rgba) =>
    relativeLuminance(compositeOver(text, surface)) - relativeLuminance(surface);
  const atLo = lift(band.lo);
  const atHi = lift(band.hi);
  if (atLo === 0 || atHi === 0 || atLo > 0 !== atHi > 0) return null;

  const ratioLo = contrastRatio(text, band.lo);
  const ratioHi = contrastRatio(text, band.hi);
  const worst = ratioLo <= ratioHi ? band.lo : band.hi;
  return {
    ...finding,
    background: showOpaque(worst),
    ratio: Math.min(ratioLo, ratioHi),
    unresolved: null,
    unresolvedKind: null,
  };
}

/** What the sweep does with one test's worth of findings. */
export type Triage = {
  /** Measured below AA and not grandfathered — these FAIL the run. */
  failures: Finding[];
  /** Grandfathered pairs that now clear AA — the list only shrinks, so these FAIL too. */
  stale: string[];
  /**
   * Text the scanner refused to measure, grouped by the CSS that defeated it.
   * One key = one unmeasurable SURFACE. Reported and ratcheted by count in
   * `contrast.spec.ts` — never a per-finding failure, and never grandfathered.
   */
  unmeasurable: Map<string, Finding[]>;
  /**
   * Fills the scanner gave up on that THIS module resolved (#1727), grouped
   * the same way. They have already been measured — they are in `failures` if
   * they came up short — and this map exists so the report can say which
   * surfaces stopped being decorative-and-unchecked. Without it, a pairing that
   * appears for the first time after this change has no visible provenance.
   */
  resolvedFills: Map<string, Finding[]>;
};

/**
 * Sort one test's findings into the three outcomes above.
 *
 * Pure on purpose (#1762). The spec that calls this needs Playwright, a live
 * backend and a seeded Postgres, so it runs nightly and nothing exercises it in
 * a PR — but the DECISION it makes about each finding needs none of that, and
 * `src/utils/__tests__/contrastTriage.test.ts` covers it in vitest with no DOM.
 * #1749 argued that was impossible because the harness has no DOM; that was a
 * property of where the code sat, not of the harness.
 *
 * The load-bearing case is the first: `background === null` means the scanner
 * could not resolve what is behind the text, NOT that it measured 0:1. The
 * allowlist is deliberately not consulted for those — grandfathering an
 * unmeasurable surface here is what hid 56 of them from the report.
 */
export function triageFindings(theme: string, findings: readonly Finding[]): Triage {
  const failures: Finding[] = [];
  const stale: string[] = [];
  const unmeasurable = new Map<string, Finding[]>();
  const resolvedFills = new Map<string, Finding[]>();

  const bucket = (into: Map<string, Finding[]>, surface: string, entry: Finding) => {
    const over = into.get(surface);
    if (over) over.push(entry);
    else into.set(surface, [entry]);
  };

  for (const raw of findings) {
    let finding: Resolved;
    if (raw.background === null) {
      // The scanner could not resolve the ground. Try to band the fill (#1727)
      // before writing it off — most of them are paper stocks, and a stock the
      // sweep declines to look at is a stock nothing checks.
      const measured = measureOverFill(raw);
      const surface = raw.backdropCss ?? 'unknown';
      if (measured === null) {
        bucket(unmeasurable, surface, raw);
        continue;
      }
      bucket(resolvedFills, surface, measured);
      finding = measured;
    } else {
      finding = raw as Resolved;
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

  return { failures, stale, unmeasurable, resolvedFills };
}
