/**
 * What one RUN of the rendered contrast sweep means (#1780): which pages,
 * which unmeasurable ceiling, what it prints, which failures may be baselined.
 * Kept out of `e2e/contrast.spec.ts` (a thin Playwright driver) so PR-time CI
 * reaches it; must never import `@playwright/test`.
 */

import { baselineKey, bucket, triageFindings } from './contrastBaseline';
import type { Finding } from './contrastScan';

/**
 * Every identity a character can carry (#1903), including `na`, which every
 * player starts in (ADR-0030). `/factions/na` renders FactionDetail's
 * not-found guard. `coven` and `na` fall to the `default` ceiling row.
 */
export const SWEEP_FACTIONS = [
  'ua',
  'everymen',
  'wow',
  'snide',
  'ephemerists',
  'singularity',
  'albescent',
  'coven',
  'na',
] as const;

export const SWEEP_THEMES = ['light', 'dark'] as const;

export const SWEEP_VIEWPORTS = {
  // Matches useFormFactor's touch-gated 767px MOBILE_QUERY (#494, #3182) — no tablet tier.
  mobile: { width: 375, height: 812 },
  desktop: { width: 1280, height: 800 },
} as const;

export type SweepFaction = (typeof SWEEP_FACTIONS)[number];
export type SweepTheme = (typeof SWEEP_THEMES)[number];
export type SweepViewport = keyof typeof SWEEP_VIEWPORTS;

type SweepRun = {
  faction: SweepFaction;
  theme: SweepTheme;
  viewport: SweepViewport;
};

/**
 * Routes skinned by the viewer's faction; `routesFor` adds `/factions/${slug}`.
 *
 * Gap (#694, #1819): only read surfaces reachable from a fresh login. State-only
 * pairings (collab roster mid-cast, composer CONNECTING/FROZEN notices) need a
 * per-state fixture; until then `__tests__/factionContrast.test.ts` (ROSTER_PAIRS)
 * and `composerQuietInk.test.tsx` cover them.
 */
const SHARED_ROUTES = ['/', '/tasks', '/praxis', '/leaderboard', '/factions'];

export function routesFor(faction: SweepFaction): string[] {
  return [...SHARED_ROUTES, `/factions/${faction}`];
}

/**
 * Unmeasurable ratchet (#1675): an unresolved backdrop is reported, not failed,
 * and the count of distinct `backdropCss` SURFACES (not findings, #1762) may
 * only go down. A new one is lost coverage.
 *
 * Measured on nightly run 31931556465 (2026-08-16); UA's parchment ramp on a
 * seeded UA task card (#1676) added one surface to every row. Kept, not
 * flattened: the ramp is UA's archetype. Rows are slack since banding (#1727);
 * lower each to what a real run prints, never from arithmetic. Raising one is a
 * decision: a new fill is hiding text.
 */
const UNMEASURABLE_CEILING: Record<string, Record<SweepViewport, number>> = {
  // WOW's title bars and UA's gilt wordmark are the two kits with extra fills.
  wow: { desktop: 9, mobile: 8 },
  ua: { desktop: 9, mobile: 6 },
  default: { desktop: 8, mobile: 6 },
};

/**
 * Same ratchet for layers ruled clear of the text (#2453), keyed by CSS + owner
 * path. Run 38464670105 (2026-10-13): only the nav wordmark's rule, desktop only.
 */
const CLEARED_LAYER_CEILING: Record<SweepViewport, number> = { desktop: 1, mobile: 0 };

function ceilingKeyFor(faction: SweepFaction): string {
  return faction in UNMEASURABLE_CEILING ? faction : 'default';
}

function describeFinding(finding: Finding): string {
  const size = `${finding.fontSizePx}px/${finding.fontWeight}`;
  return `  ${finding.ratio.toFixed(2)}:1 (needs ${finding.required}:1) — ${finding.text} on ${finding.background}\n    ${finding.where} (${size}) "${finding.sample}"`;
}

/** One line per surface: node count plus one example. */
function describeSurface(css: string, over: Finding[]): string {
  const example = over[0];
  return (
    `  ${over.length} node(s) over ${css.slice(0, 120)}${css.length > 120 ? '…' : ''}\n` +
    `    e.g. ${example.where} (${example.fontSizePx}px/${example.fontWeight}) "${example.sample}"`
  );
}

function describeSurfaces(surfaces: Map<string, Finding[]>): string {
  if (surfaces.size === 0) return '  (none)\n';
  return `${[...surfaces].map(([css, over]) => describeSurface(css, over)).join('\n')}\n`;
}

function nodesIn(surfaces: Map<string, Finding[]>): number {
  return [...surfaces.values()].reduce((total, over) => total + over.length, 0);
}

type SweepVerdict = {
  /** Deduped, human-described. Must be empty. */
  failures: string[];
  failureMessage: string;
  unmeasurableSurfaces: number;
  ceiling: number;
  ceilingMessage: string;
  clearedLayers: number;
  clearedLayerCeiling: number;
  clearedLayerMessage: string;
  stale: string[];
  staleMessage: string;
  /** Printed on every run, green included. */
  reports: string[];
  /** Ready-to-paste `RENDERED_BASELINE` lines, when regenerating the list. */
  baselineEntries: string[];
};

/** Reports are built unconditionally: printing what went unchecked is the defence (#1675). */
export function assessSweep(run: SweepRun, findings: readonly Finding[]): SweepVerdict {
  const combination = `${run.faction}/${run.theme}/${run.viewport}`;
  const { failures, stale, unmeasurable, resolvedFills } = triageFindings(run.theme, findings);

  const ceilingKey = ceilingKeyFor(run.faction);
  const ceiling = UNMEASURABLE_CEILING[ceilingKey][run.viewport];

  const described = [...new Set(failures.map(describeFinding))];

  // Keyed on owner AND CSS so a second surface drawing a shared token stays visible.
  const clearedLayers = new Map<string, Finding[]>();
  for (const finding of findings) {
    const layers = finding.clearedLayers.map((css, at) => `${finding.clearedLayerOwners[at]}\n${css}`);
    for (const layer of new Set(layers)) bucket(clearedLayers, layer, finding);
  }
  const clearedNodes = findings.filter((finding) => finding.clearedLayers.length > 0).length;
  const clearedLayerCeiling = CLEARED_LAYER_CEILING[run.viewport];
  const describedCleared = [...clearedLayers].map(([layer, over]) => {
    const [owner, css] = layer.split('\n');
    return `${describeSurface(css, over)}\n    drawn by ${owner}\n`;
  });

  return {
    failures: described,
    failureMessage: `${combination}: text below WCAG AA.\n\n${described.join('\n\n')}`,

    unmeasurableSurfaces: unmeasurable.size,
    ceiling,
    ceilingMessage:
      `${combination}: ${unmeasurable.size} unmeasurable surfaces, up from ${ceiling}. ` +
      `A new opaque-stop fill is now hiding text from the sweep — that is lost coverage, not a style bug.\n\n` +
      `TO CORRECT THIS CEILING from this run: the surfaces printed above are the whole population, so ` +
      `set '${ceilingKey}'.${run.viewport} in UNMEASURABLE_CEILING in src/utils/contrastSweep.ts ` +
      `to ${unmeasurable.size} — but only after checking the new surface against the list above. ` +
      `If it is one you can give a solid backdrop, do that instead; the ceiling only ever comes down.\n\n` +
      [...unmeasurable.keys()].join('\n'),

    clearedLayers: clearedLayers.size,
    clearedLayerCeiling,
    clearedLayerMessage:
      `${combination}: ${clearedLayers.size} layers ruled out as painting clear of the text, up from ${clearedLayerCeiling}. ` +
      `The scan is now stepping past a background it used to measure against — if it is wrong, that is a silent pass.\n\n` +
      `TO CORRECT THIS CEILING from this run: the layers printed below are the whole population, so ` +
      `set ${run.viewport} in CLEARED_LAYER_CEILING in src/utils/contrastSweep.ts ` +
      `to ${clearedLayers.size} — but only after LOOKING at the new one and seeing that the text does not touch it.\n\n` +
      describedCleared.join(''),

    stale: [...new Set(stale)],
    staleMessage:
      `These pairs are in RENDERED_BASELINE but now clear AA — delete their entries in ` +
      `src/utils/contrastBaseline.ts. The list only ever shrinks.`,

    reports: [
      `\n[contrast] ${combination}: ${unmeasurable.size} unmeasurable surface(s) ` +
        `(ceiling ${ceiling}), ${nodesIn(unmeasurable)} text node(s) unchecked.\n` +
        describeSurfaces(unmeasurable),
      // #1727: provenance for pairings newly measured by banding.
      `[contrast] ${combination}: ${resolvedFills.size} fill(s) resolved by banding, ` +
        `${nodesIn(resolvedFills)} text node(s) newly measured.\n` +
        describeSurfaces(resolvedFills),
      // #2453: if this grows past ornaments (a rule, a stripe), that is the bug.
      `[contrast] ${combination}: ${clearedLayers.size} layer(s) ruled out as painting clear of the text, ` +
        `${clearedNodes} text node(s) measured on the ground beneath (ceiling ${clearedLayerCeiling} layer(s)).\n` +
        (describedCleared.join('') || '  (none)\n'),
    ],

    // Unmeasurable findings are ratcheted, never baselined (#1762); belt-and-braces guard.
    baselineEntries: failures
      .filter((finding): finding is Finding & { background: string } => finding.background !== null)
      .map((finding) => {
        const key = baselineKey(run.theme, finding.text, finding.background, finding.required);
        const where = `${combination} ${finding.where}`.replace(/'/g, '');
        return `  ${JSON.stringify(key)}: { ratio: ${finding.ratio.toFixed(2)}, issue: 651, where: '${where}' },\n`;
      }),
  };
}
