/**
 * Baseline allowlist for the RENDERED contrast sweep (#651); the token-value
 * sweep's list is in `__tests__/factionContrast.test.ts`.
 *
 * Key is the colour pair (`theme | text on backdrop @required`), not the DOM
 * node; `where` is only a breadcrumb. This list only shrinks: fixing a pair
 * means deleting its entry, and an allowlisted pair that passes fails the spec.
 * Never add entries for new work. Unmeasurable backdrops are not listed here
 * (#1675): `triageFindings` reports them and the spec ratchets them by count.
 */

import {
  compositeOver,
  contrastRatio,
  parseColor,
  relativeLuminance,
  type Rgba,
} from './contrast';
import type { Finding } from './contrastScan';

type BaselineEntry = {
  /** Measured ratio when this entry landed. */
  ratio: number;
  /** Issue owning the fix; 651 = found by the sweep, awaiting a child. */
  issue: number;
  where: string;
};

/**
 * `required` is part of the identity: one pair can pass as large type (3:1)
 * and fail as body copy (4.5:1).
 */
export function baselineKey(theme: string, text: string, background: string, required: number): string {
  return `${theme} | ${text} on ${background} @${required}`;
}

/**
 * Machine-produced, never hand-typed:
 * `CONTRAST_BASELINE_OUT=<path> bash frontend/e2e/run-e2e.sh contrast.spec.ts`.
 * No count written here on purpose (#1780). #649 entries are white
 * `--color-text-on-accent` on a faction fill.
 */
export const RENDERED_BASELINE: Record<string, BaselineEntry> = {
  "dark | rgb(111, 174, 0) on rgb(244, 241, 232) @3": { ratio: 2.41, issue: 651, where: 'snide/dark/desktop div > div > div > div' },
  "dark | rgb(111, 174, 0) on rgb(244, 241, 232) @4.5": { ratio: 2.41, issue: 651, where: 'snide/dark/desktop div > div > div > div' },
  "dark | rgb(12, 10, 6) on rgb(19, 18, 26) @3": { ratio: 1.06, issue: 651, where: 'ephemerists/dark/desktop div.wz-faction-grid > div > h2' },
  "dark | rgb(12, 10, 6) on rgb(33, 26, 16) @3": { ratio: 1.15, issue: 651, where: 'ephemerists/dark/desktop div > div > div > div' },
  "dark | rgb(13, 9, 7) on rgb(19, 18, 26) @3": { ratio: 1.07, issue: 651, where: 'everymen/dark/desktop div > div > div > h2' },
  "dark | rgb(13, 9, 7) on rgb(23, 17, 13) @4.5": { ratio: 1.06, issue: 651, where: 'everymen/dark/mobile div > div.flex.gap-2 > div.text-center > div.truncate' },
  "dark | rgb(13, 9, 7) on rgb(33, 25, 21) @3": { ratio: 1.15, issue: 651, where: 'everymen/dark/mobile div > div.flex.items-center > div.min-w-0.flex-1 > a.block.truncate' },
  "dark | rgb(13, 9, 7) on rgb(33, 25, 21) @4.5": { ratio: 1.15, issue: 651, where: 'ua/dark/mobile div.mt-4 > div.flex.flex-col > a > h2' },
  "dark | rgb(13, 9, 7) on rgb(34, 26, 22) @4.5": { ratio: 1.16, issue: 651, where: 'everymen/dark/mobile div.py-4 > section.mt-6 > div > span' },
  "dark | rgb(143, 106, 58) on rgb(19, 18, 26) @4.5": { ratio: 3.80, issue: 651, where: 'ua/dark/desktop div.wz-faction-grid > div > p' },
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
  "dark | rgb(239, 227, 198) on rgb(79, 143, 176) @4.5": { ratio: 2.80, issue: 651, where: 'ephemerists/dark/desktop div.wz-faction-grid > div > div' },
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
  "dark | rgba(74, 222, 128, 0.4) on rgb(19, 18, 26) @4.5": { ratio: 2.64, issue: 651, where: 'singularity/dark/desktop div.wz-faction-grid > div > div' },
  "dark | rgba(74, 222, 128, 0.4) on rgb(5, 15, 8) @4.5": { ratio: 2.65, issue: 651, where: 'singularity/dark/desktop div > div > div > div' },
  "dark | rgba(74, 222, 128, 0.45) on rgb(19, 18, 26) @4.5": { ratio: 3.03, issue: 651, where: 'singularity/dark/desktop div.wz-faction-grid > div > p' },
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
  "light | rgb(143, 106, 58) on rgb(247, 244, 238) @4.5": { ratio: 4.46, issue: 651, where: 'ua/light/desktop div.wz-faction-grid > div > p' },
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
  "light | rgb(216, 214, 200) on rgb(247, 244, 238) @4.5": { ratio: 1.33, issue: 651, where: 'snide/light/desktop div.wz-faction-grid > div > p' },
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
  "light | rgb(255, 45, 139) on rgb(247, 244, 238) @4.5": { ratio: 3.19, issue: 651, where: 'snide/light/desktop div.wz-faction-grid > div > div' },
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
  "light | rgba(74, 222, 128, 0.4) on rgb(247, 244, 238) @4.5": { ratio: 1.23, issue: 651, where: 'singularity/light/desktop div.wz-faction-grid > div > div' },
  "light | rgba(74, 222, 128, 0.4) on rgb(5, 15, 8) @4.5": { ratio: 2.65, issue: 651, where: 'singularity/light/desktop div > div > div > div' },
  "light | rgba(74, 222, 128, 0.45) on rgb(247, 244, 238) @4.5": { ratio: 1.26, issue: 651, where: 'singularity/light/desktop div.wz-faction-grid > div > p' },
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

/*
 * #1727: resolve a decorative gradient fill. Interpolation is a per-channel
 * lerp, so every painted colour's luminance lies between its stops'; unless
 * the ink's luminance falls inside that band, the band edge nearest the ink is
 * an exact worst case. Classified from the fill's computed CSS, never a
 * selector list. Findings that already carry a `background` never reach here.
 * Pure and node-side (#1762): the scanner reports facts, decisions live here;
 * tested in `__tests__/contrastTriage.test.ts`.
 */

/** Darkest/lightest opaque colour under text, by WCAG luminance, not stop order. */
type FillBand = { lo: Rgba; hi: Rgba };

type Resolved = Finding & { background: string };

/** Paper stocks stack up to seven layers; their stop products are in the low hundreds. */
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

/** Null for an unreadable layer: a dropped stop narrows the band and hides a failure. */
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

/** Source-over with a possibly translucent backdrop (`compositeOver` assumes opaque). */
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
 * Luminance band of a fill, or null (image layer, unparseable stop, or never
 * opaque). Candidates over-estimate (every stop over every stop below), which
 * can only push a fill to unmeasurable, never widen a passing ratio.
 *
 * ponytail: stops only, ignoring geometry; a corner the text never touches can
 * make a fill unmeasurable. Upgrade: text box vs fill box + stop offsets, in the scanner.
 */
export function resolveFillBand(finding: Finding): FillBand | null {
  if (finding.backdropCss === null || finding.backdropBase === null) return null;

  const base = parseColor(finding.backdropBase);
  if (base === null) return null;

  let candidates: Rgba[] = [base];
  // Bottom layer first: the last CSS layer paints first.
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

/** Matches the scanner's `show()` so keys line up. */
function showOpaque(color: Rgba): string {
  const [r, g, b] = [color.r, color.g, color.b].map((channel) => Math.round(channel));
  return `rgb(${r}, ${g}, ${b})`;
}

/**
 * Measure against the fill's worst point, or null when the ink's luminance
 * crosses the band (somewhere it is 1:1). Otherwise the ratio is monotone and
 * its minimum is at the band edge nearest the ink.
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
type Triage = {
  /** Below AA and not grandfathered: fail. */
  failures: Finding[];
  /** Grandfathered pairs that now pass: fail too. */
  stale: string[];
  /** Unmeasurable text keyed by the defeating CSS (one key = one surface); ratcheted by count. */
  unmeasurable: Map<string, Finding[]>;
  /** Fills resolved here (#1727), already measured; kept so the report shows provenance. */
  resolvedFills: Map<string, Finding[]>;
};

export function bucket(into: Map<string, Finding[]>, surface: string, entry: Finding): void {
  const over = into.get(surface);
  if (over) over.push(entry);
  else into.set(surface, [entry]);
}

/**
 * Pure so vitest covers it (#1762). `background === null` means unresolved, not
 * 0:1, and the allowlist is never consulted for those.
 */
export function triageFindings(theme: string, findings: readonly Finding[]): Triage {
  const failures: Finding[] = [];
  const stale: string[] = [];
  const unmeasurable = new Map<string, Finding[]>();
  const resolvedFills = new Map<string, Finding[]>();

  for (const raw of findings) {
    let finding: Resolved;
    if (raw.background === null) {
      // Try to band the fill (#1727); most are paper stocks.
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
      if (allowed) stale.push(`${key} now measures ${finding.ratio.toFixed(2)}:1 (owned by #${allowed.issue})`);
      continue;
    }
    if (allowed) continue;
    failures.push(finding);
  }

  return { failures, stale, unmeasurable, resolvedFills };
}
