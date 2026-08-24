/**
 * Part E of the contrast foundation (#1780) — what one RUN of the rendered
 * sweep means.
 *
 * `contrastScan.ts` reports facts. `contrastBaseline.ts` decides what each
 * finding is. This decides what a whole `faction · theme · viewport` run is:
 * which pages it walks, which unmeasurable ceiling governs it, what it prints
 * on a green run, and which of its failures may be written back into the
 * baseline.
 *
 * IT IS HERE RATHER THAN IN THE SPEC because a decision that only a nightly
 * browser can execute is a decision nothing checks before merge. Molly's
 * ruling, 2026-08-18: *"move `e2e/`'s logic into plain modules under the app's
 * build graph, keep the spec as a thin Playwright driver, so the contrast
 * scanner becomes reachable from PR-time CI."* `e2e/contrast.spec.ts` now
 * acquires pages, hands the pixels to `assessSweep`, and asserts what comes
 * back — it holds no policy of its own.
 *
 * NOTHING HERE IMPORTS `@playwright/test`, and nothing here may. That import
 * is the line between a module and a spec; on this side of it `tsc --noEmit`,
 * `eslint src` and vitest all reach the code, and `contrastSweep.test.ts`
 * exercises it in milliseconds with no browser.
 *
 * Not in scope, and unchanged: the Playwright RUN. It is nightly-only on
 * purpose (`e2e.yml`'s own header) and is not a required check. What became
 * PR-reachable is the deciding, not the browsing.
 */

import { baselineKey, triageFindings } from './contrastBaseline';
import type { Finding } from './contrastScan';

/**
 * WHO IS SWEPT (#1903, closed by #1727). Nine slugs — every identity a
 * character can actually carry.
 *
 * `coven` and `na` were the gap. Coven is a registered faction with its own
 * CSS key and its own archetypes (CovenPraxisCard, CovenAvatar,
 * CovenBackdrop); `na` is the unaffiliated identity EVERY player starts in
 * (ADR-0030), reading the `--faction-default-*` set and the rainbow through
 * factionFill. Neither had ever been walked, so the most-worn skin in the app
 * was the one nothing measured. Narrowing what the sweep looks at while two
 * whole identities went unlooked-at would have been optimising the wrong axis.
 *
 * Both are in `CURRENT_ERA.factions`, so `/auth/dev-login?faction=` places a
 * character in either without a new seam. `na` has no faction page of its own
 * — `/factions/na` renders FactionDetail's not-found guard, which is a real
 * chrome surface and worth a look, just not the bespoke one the other eight
 * get.
 *
 * NEITHER HAS AN OBSERVED CEILING. They fall to the `default` row of
 * UNMEASURABLE_CEILING, which is a starting guess, not a measurement — the
 * first run that includes them is the measurement. If they blow it, the
 * failure message prints the whole population and says what to set.
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
  // Matches useFormFactor's single 767px breakpoint (#494) — no tablet tier.
  mobile: { width: 375, height: 812 },
  desktop: { width: 1280, height: 800 },
} as const;

export type SweepFaction = (typeof SWEEP_FACTIONS)[number];
export type SweepTheme = (typeof SWEEP_THEMES)[number];
export type SweepViewport = keyof typeof SWEEP_VIEWPORTS;

/** One cell of the 9 × 2 × 2 matrix. */
export type SweepRun = {
  faction: SweepFaction;
  theme: SweepTheme;
  viewport: SweepViewport;
};

/**
 * Routes whose chrome is skinned by the viewer's faction. `/factions/${slug}`
 * is added per-faction by {@link routesFor} — it is the faction's own bespoke
 * surface.
 *
 * WHAT THIS LIST CANNOT REACH, and why it matters (#694). Every route here is
 * a READ surface reachable from a fresh login. The composer, the collab
 * waiting surface and the praxis detail page are not, because each needs a
 * praxis the bot owns; and some of the worst pairings in the app only exist in
 * a STATE rather than on a route. #694's was one: the collab roster renders
 * nothing below two members, and its filled row only appears once some — not
 * all — of them have cast. No route walk produces that, so a 1.05:1 pairing
 * sat on a faction surface without either guard seeing it.
 *
 * Adding routes is not the fix; the fix is a fixture that puts a praxis into
 * each interesting state before the scan. Until then the token test
 * (`src/utils/__tests__/factionContrast.test.ts`) carries these surfaces, which
 * is why its ROSTER_PAIRS block measures a pairing rather than a documented
 * role — read that block's header before assuming a token is covered here.
 *
 * #1819 IS THE SECOND ONE OF THESE, and it is worth recording what the missing
 * fixture would have to do, because "add the composer" understates it by a lot.
 * The two composer notices — the room CONNECTING and the document FROZEN — sat
 * at 2.01:1 on the Ephemerists plate, and neither is route-reachable:
 *   - FROZEN needs a praxis whose `status !== 'in_progress'`, so the fixture
 *     must create AND submit one, per faction, and the composer must still be
 *     reachable afterwards.
 *   - CONNECTING is `room.body !== null && !room.seeded` — a socket that has
 *     OPENED and not yet been seeded. Blocking the WebSocket does not produce
 *     it (that leaves `body` null and no notice at all); it needs
 *     `page.routeWebSocket` proxying the real server and swallowing the seed
 *     frame. That is a fixture with its own failure modes, and a flaky nightly
 *     is worse than a documented gap.
 * Both are guarded meanwhile at their MOUNT, DOM-lessly and in the PR, by
 * `src/pages/editPraxis/archetypes/__tests__/composerQuietInk.test.tsx` — which
 * asserts the notices carry no inline ink, so the seam the ratio would measure
 * is at least reachable. A ratio still needs the nightly spec.
 */
const SHARED_ROUTES = ['/', '/tasks', '/praxis', '/leaderboard', '/factions'];

/** Every page one run walks: the shared chrome, then the faction's own page. */
export function routesFor(faction: SweepFaction): string[] {
  return [...SHARED_ROUTES, `/factions/${faction}`];
}

/**
 * The unmeasurable ratchet (#1675, owner ruling 2026-08-14).
 *
 * An unresolved backdrop used to FAIL. It cannot: the scanner is reporting that
 * it could not measure, not that it measured something bad, and "give every
 * gradient a solid backdrop" fights the faction skins the design system exists
 * to have. So an unmeasurable surface is now REPORTED instead — loudly, with a
 * count and a list, because a silent skip turns a red suite into a green one
 * that checks less.
 *
 * The ceiling is what stops that from being a hole. A NEW unmeasurable surface
 * is a regression in coverage even though it is not a contrast defect, so the
 * count may only ever go down.
 *
 * A SURFACE, NOT A FINDING (#1762). The unit is one distinct `backdropCss`,
 * however many text nodes sit on it. Counting findings made the ceiling churn
 * on every copy edit — add a line of body text to a card on the gilt wordmark
 * and the number moves — while the thing worth ratcheting, a NEW region of the
 * app going unchecked, is exactly one new surface. The report prints both, so
 * the node count is still visible; only the assertion is coarser.
 *
 * PROVENANCE (#1903). These are measured numbers, read off nightly run
 * 31931556465 (2026-08-16, `8153e246`), which prints the whole population per
 * test. That discharges the ponytail #1762 left here — it carried counts
 * guessed in a browserless worktree and said to correct them from the first
 * real run. Two real runs have now happened, and the guesses held exactly on
 * run 31869484266 (08-15): none of the 56 deleted `ratio: null` allowlist
 * entries moved a count, so the +4/+2 exposure it warned about never landed.
 *
 * WHY EVERY ROW WENT UP BY ONE on 08-16. The new surface is UA's three-stop
 * parchment ramp — `--faction-ua-card-parchment` on `UaTaskCard`'s article.
 * Neither that token nor the card changed; #1676 seeded a UA-faction task
 * (`ensure_duel_fixture_task`, dev-only, for the duel fixture) onto the board
 * the sweep walks, and a task card is skinned by the TASK's faction, not the
 * viewer's. So one seeded row put UA's paper stock on all seven runs at once:
 * 22 text nodes for the six non-UA viewers on both viewports, 44 desktop /
 * 37 mobile for a UA viewer, whose own feed and praxis chrome share the ramp
 * (`--faction-ua-parchment` computes byte-identical, so the report cannot tell
 * the two tokens apart — see #857's exception block).
 *
 * RAISED, NOT FLATTENED. The test's own message prefers a solid backdrop, and
 * that is the wrong trade here: the ramp is UA's paper stock, the archetype
 * itself, and "give every gradient a solid backdrop" is precisely the fight
 * the #1675 ruling declined to have. The cost is recorded rather than hidden —
 * 22 more text nodes per run now go unchecked, and `UaTaskCard`'s own header
 * already reasons about its darkest stop (2.93:1), so the token test carries
 * that pairing.
 *
 * THESE NUMBERS ARE NOW SLACK, DELIBERATELY (#1727). Every row above was
 * measured against a scanner that wrote off any fill with an opaque stop.
 * Banding resolves most of them, so the real counts are lower — probably much
 * lower — and the assertion is `<=`, so slack passes. It is not lowered here
 * because a ceiling set from arithmetic in a browserless worktree is the guess
 * #1762 already had to correct once. The next run prints the whole population
 * per test; lower each row to what it prints, then, and not before. Leaving it
 * slack for one night costs a night of ratchet; guessing it low costs a red
 * suite that says nothing about contrast.
 *
 * `coven` and `na` joined the roster in the same change and have no row of
 * their own, so they read `default` — the same guess, with the same
 * instruction.
 *
 * Lower one whenever a fix retires a surface. Raising one is a decision, not a
 * chore: it means a new fill is now hiding text from the sweep.
 */
const UNMEASURABLE_CEILING: Record<string, Record<SweepViewport, number>> = {
  // WOW's title bars and UA's gilt wordmark are the two kits with extra fills.
  wow: { desktop: 9, mobile: 8 },
  ua: { desktop: 9, mobile: 6 },
  default: { desktop: 8, mobile: 6 },
};

/** Which row of the table governs this faction — named, so a failure can quote it. */
function ceilingKeyFor(faction: SweepFaction): string {
  return faction in UNMEASURABLE_CEILING ? faction : 'default';
}

function describeFinding(finding: Finding): string {
  const size = `${finding.fontSizePx}px/${finding.fontWeight}`;
  return `  ${finding.ratio.toFixed(2)}:1 (needs ${finding.required}:1) — ${finding.text} on ${finding.background}\n    ${finding.where} (${size}) "${finding.sample}"`;
}

/**
 * One line per surface the scanner refused to measure: how many text nodes sit
 * on it, and one of them so a human can go and look. The CSS is the identity,
 * so it leads. Printing every finding instead repeated the same gradient 14-25
 * times per test, which is a report nobody reads.
 */
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

/** Everything one run of the sweep concluded. The spec asserts on it and prints it. */
export type SweepVerdict = {
  /** Distinct AA failures, already deduped and human-described. Must be empty. */
  failures: string[];
  failureMessage: string;
  /** Distinct surfaces the scanner and the banding both gave up on. */
  unmeasurableSurfaces: number;
  ceiling: number;
  ceilingMessage: string;
  /** Allowlisted pairs that now pass — the list only shrinks, so these fail too. */
  stale: string[];
  staleMessage: string;
  /** Printed on EVERY run, green included — see below. */
  reports: string[];
  /** Ready-to-paste `RENDERED_BASELINE` lines, when regenerating the list. */
  baselineEntries: string[];
};

/**
 * Turn one run's findings into a verdict.
 *
 * The two report blocks are built unconditionally, and that is load-bearing
 * rather than tidy: the whole risk of the #1675 ruling is a suite that looks
 * greener because it checks less, and the only defence against it is printing
 * what went unchecked every time, including on a green run.
 */
export function assessSweep(run: SweepRun, findings: readonly Finding[]): SweepVerdict {
  const combination = `${run.faction}/${run.theme}/${run.viewport}`;
  const { failures, stale, unmeasurable, resolvedFills } = triageFindings(run.theme, findings);

  const ceilingKey = ceilingKeyFor(run.faction);
  const ceiling = UNMEASURABLE_CEILING[ceilingKey][run.viewport];

  const described = [...new Set(failures.map(describeFinding))];

  return {
    failures: described,
    failureMessage: `${combination}: text below WCAG AA.\n\n${described.join('\n\n')}`,

    unmeasurableSurfaces: unmeasurable.size,
    ceiling,
    // Gaining a surface is a coverage regression, not a contrast defect: a
    // region of the app just stopped being checked at all. Losing one is
    // progress, and only asks for the ceiling to come down.
    ceilingMessage:
      `${combination}: ${unmeasurable.size} unmeasurable surfaces, up from ${ceiling}. ` +
      `A new opaque-stop fill is now hiding text from the sweep — that is lost coverage, not a style bug.\n\n` +
      `TO CORRECT THIS CEILING from this run: the surfaces printed above are the whole population, so ` +
      `set '${ceilingKey}'.${run.viewport} in UNMEASURABLE_CEILING in src/utils/contrastSweep.ts ` +
      `to ${unmeasurable.size} — but only after checking the new surface against the list above. ` +
      `If it is one you can give a solid backdrop, do that instead; the ceiling only ever comes down.\n\n` +
      [...unmeasurable.keys()].join('\n'),

    stale: [...new Set(stale)],
    staleMessage:
      `These pairs are in RENDERED_BASELINE but now clear AA — delete their entries in ` +
      `src/utils/contrastBaseline.ts. The list only ever shrinks.`,

    reports: [
      `\n[contrast] ${combination}: ${unmeasurable.size} unmeasurable surface(s) ` +
        `(ceiling ${ceiling}), ${nodesIn(unmeasurable)} text node(s) unchecked.\n` +
        describeSurfaces(unmeasurable),
      // The other half of the same honesty (#1727). These fills used to be in
      // the block above; they are now measured against their worst stop, so
      // any pairing appearing here for the first time has its provenance
      // printed next to it rather than arriving as a mystery failure.
      `[contrast] ${combination}: ${resolvedFills.size} fill(s) resolved by banding, ` +
        `${nodesIn(resolvedFills)} text node(s) newly measured.\n` +
        describeSurfaces(resolvedFills),
    ],

    // An unmeasurable backdrop has no ratio to record and is ratcheted by
    // count, not allowlisted — emitting one would recreate the second
    // mechanism #1762 deleted. `triageFindings` only ever puts measured
    // findings in `failures`; the guard is belt-and-braces.
    baselineEntries: failures
      .filter((finding): finding is Finding & { background: string } => finding.background !== null)
      .map((finding) => {
        const key = baselineKey(run.theme, finding.text, finding.background, finding.required);
        const where = `${combination} ${finding.where}`.replace(/'/g, '');
        return `  ${JSON.stringify(key)}: { ratio: ${finding.ratio.toFixed(2)}, issue: 651, where: '${where}' },\n`;
      }),
  };
}
