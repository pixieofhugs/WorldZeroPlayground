/**
 * Part E of the contrast foundation (#1780) — the sweep's per-run verdict.
 *
 * `triageFindings` (part D, `contrastTriage.test.ts`) decides what each
 * FINDING is. This covers what a whole RUN is: which ceiling governs it, what
 * the report says when nothing went unmeasured, and which failures are
 * eligible to be written back into the baseline. Those decisions used to live
 * in the body of `e2e/contrast.spec.ts`, where the only thing that could
 * execute them was a nightly browser run — so a wrong ceiling row or a report
 * that quietly went silent on a green run was discoverable the morning after
 * merge and no sooner.
 *
 * The seam is `assessSweep`: findings in, verdict out, no page, no Playwright.
 */
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

import { assessSweep, routesFor, SWEEP_FACTIONS, SWEEP_VIEWPORTS } from "../contrastSweep";
import type { Finding } from "../contrastScan";

function finding(overrides: Partial<Finding> = {}): Finding {
  return {
    text: "rgb(0, 0, 0)",
    background: "rgb(255, 255, 255)",
    unresolved: null,
    unresolvedKind: null,
    backdropCss: null,
    backdropBase: null,
    backdropOverlay: null,
    ratio: 21,
    required: 4.5,
    fontSizePx: 16,
    fontWeight: 400,
    where: "div > div > span",
    sample: "some copy",
    ...overrides,
  };
}

/** A pairing far below AA that is not in RENDERED_BASELINE, so it must fail. */
function belowAA(overrides: Partial<Finding> = {}): Finding {
  return finding({
    text: "rgb(120, 120, 120)",
    background: "rgb(130, 130, 130)",
    ratio: 1.09,
    ...overrides,
  });
}

/** A fill the scanner refused to measure and banding cannot rescue (an image). */
function unmeasurable(css: string): Finding {
  return finding({
    background: null,
    ratio: 0,
    unresolved: "div paints an image",
    unresolvedKind: "other",
    backdropCss: css,
    backdropBase: null,
    backdropOverlay: null,
  });
}

const run = { faction: "snide", theme: "dark", viewport: "desktop" } as const;

describe("assessSweep", () => {
  it("fails a measured pairing below AA, and reports each distinct one once", () => {
    const verdict = assessSweep(run, [belowAA(), belowAA(), belowAA({ where: "div > p" })]);

    // Two distinct descriptions from three findings: the duplicate collapses,
    // the one at a different DOM path does not.
    expect(verdict.failures).toHaveLength(2);
    expect(verdict.failureMessage).toContain("snide/dark/desktop");
    expect(verdict.failureMessage).toContain("1.09:1");
  });

  it("is loud about unmeasured surfaces even when there are none", () => {
    const verdict = assessSweep(run, [finding()]);

    // The whole risk of the #1675 ruling is a suite that looks greener because
    // it checks less. A silent green run is that failure mode.
    expect(verdict.reports.join("\n")).toContain("0 unmeasurable surface(s)");
    expect(verdict.reports.join("\n")).toContain("(none)");
    expect(verdict.unmeasurableSurfaces).toBe(0);
  });

  it("counts one unmeasurable SURFACE per distinct CSS, not per text node", () => {
    const gilt = "linear-gradient(rgb(1, 2, 3), rgb(4, 5, 6))";
    const verdict = assessSweep(run, [
      unmeasurable(gilt),
      unmeasurable(gilt),
      unmeasurable("url(paper.png)"),
    ]);

    expect(verdict.unmeasurableSurfaces).toBe(2);
    expect(verdict.reports.join("\n")).toContain("2 unmeasurable surface(s)");
    expect(verdict.reports.join("\n")).toContain("3 text node(s) unchecked");
  });

  it("governs each faction by its own ceiling row, or by 'default'", () => {
    const wow = assessSweep({ faction: "wow", theme: "dark", viewport: "desktop" }, []);
    const coven = assessSweep({ faction: "coven", theme: "dark", viewport: "desktop" }, []);
    const covenMobile = assessSweep({ faction: "coven", theme: "dark", viewport: "mobile" }, []);

    expect(wow.ceiling).toBe(9);
    expect(coven.ceiling).toBe(8);
    expect(covenMobile.ceiling).toBe(6);
    // The message must name the row to edit, or a run that blows the ceiling
    // sends whoever reads it to the wrong line.
    expect(coven.ceilingMessage).toContain("'default'.desktop");
    expect(wow.ceilingMessage).toContain("'wow'.desktop");
  });

  it("emits a baseline entry for a measured failure and never for an unmeasurable one", () => {
    const verdict = assessSweep(run, [belowAA(), unmeasurable("linear-gradient(red, blue)")]);

    expect(verdict.baselineEntries).toHaveLength(1);
    expect(verdict.baselineEntries[0]).toContain(
      '"dark | rgb(120, 120, 120) on rgb(130, 130, 130) @4.5"',
    );
    expect(verdict.baselineEntries[0]).toContain("ratio: 1.09");
    expect(verdict.baselineEntries[0]).toContain("snide/dark/desktop");
  });

  /**
   * The invariant that let the scanner move out of `e2e/` at all (#1780), and
   * the one an ordinary refactor would break silently. `page.evaluate` ships
   * the function SOURCE, not its module graph, so an import added to
   * `contrastScan.ts` compiles, typechecks, lints, and then throws inside the
   * browser at 3am — the exact latency this issue exists to remove.
   *
   * Read off the file rather than the loaded module: an import that vitest has
   * already resolved is invisible to `Function.prototype.toString`.
   */
  it("keeps the scanner importless, because page.evaluate ships no module graph", () => {
    const scanner = readFileSync(
      fileURLToPath(new URL("../contrastScan.ts", import.meta.url)),
      "utf8",
    );
    // Strip block comments: the header talks ABOUT imports.
    const code = scanner.replace(/\/\*[\s\S]*?\*\//g, "");

    expect(code).not.toMatch(/^\s*import\s/m);
    expect(code).not.toMatch(/\brequire\s*\(/);
  });

  it("sweeps every faction on its own detail route plus the shared ones", () => {
    for (const faction of SWEEP_FACTIONS) {
      expect(routesFor(faction)).toContain(`/factions/${faction}`);
      expect(routesFor(faction)).toContain("/leaderboard");
    }
    // Both viewports, because the mobile archetypes are separate files (#565).
    expect(Object.keys(SWEEP_VIEWPORTS).sort()).toEqual(["desktop", "mobile"]);
  });
});
