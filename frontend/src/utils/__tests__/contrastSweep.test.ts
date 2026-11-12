/**
 * The sweep's per-RUN verdict (#1780): ceiling, report, baseline candidates.
 * Per-finding triage is `contrastTriage.test.ts`. `assessSweep` is pure.
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
    clearedLayers: [],
    clearedLayerOwners: [],
    ratio: 21,
    required: 4.5,
    fontSizePx: 16,
    fontWeight: 400,
    where: "div > div > span",
    sample: "some copy",
    ...overrides,
  };
}

/** Far below AA and not baselined: must fail. */
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

    // Duplicate collapses; a different DOM path does not.
    expect(verdict.failures).toHaveLength(2);
    expect(verdict.failureMessage).toContain("snide/dark/desktop");
    expect(verdict.failureMessage).toContain("1.09:1");
  });

  it("is loud about unmeasured surfaces even when there are none", () => {
    const verdict = assessSweep(run, [finding()]);

    // A silent green run could hide checking less (#1675).
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

  it("prints every layer the scanner ruled out as painting clear of the text (#2453)", () => {
    const rule = "linear-gradient(90deg, rgb(193, 39, 45), rgb(37, 99, 235))";
    const report = assessSweep(run, [
      finding({ clearedLayers: [rule], where: "nav > a > span", sample: "World Zero" }),
      finding({ clearedLayers: [rule] }),
      finding(),
    ]).reports.join("\n");

    expect(report).toContain("1 layer(s) ruled out as painting clear of the text, 2 text node(s)");
    expect(report).toContain(rule);
    expect(report).toContain('"World Zero"');
    expect(assessSweep(run, [finding()]).reports.join("\n")).toContain("0 layer(s) ruled out");
  });

  it("tells two surfaces drawing the same shared token apart, and counts each text node once (#2453)", () => {
    const rule = "linear-gradient(90deg, rgb(193, 39, 45), rgb(37, 99, 235))";
    const onNav = { clearedLayers: [rule], clearedLayerOwners: ["nav > a > span"] };
    const verdict = assessSweep(run, [
      finding(onNav),
      finding({ clearedLayers: [rule], clearedLayerOwners: ["main > h1"] }),
      // One node over both surfaces (one twice): still one node.
      finding({ clearedLayers: [rule, rule, rule], clearedLayerOwners: ["nav > a > span", "nav > a > span", "main > h1"] }),
    ]);
    const report = verdict.reports.join("\n");

    expect(verdict.clearedLayers).toBe(2);
    expect(report).toContain("2 layer(s) ruled out as painting clear of the text, 3 text node(s)");
    expect(report).toContain("2 node(s) over " + rule);
    expect(report).toContain("drawn by nav > a > span");
    expect(report).toContain("drawn by main > h1");
  });

  it("ratchets the ruled-out layers per viewport: the wordmark's rule on desktop, none on mobile (#2453)", () => {
    const rule = "linear-gradient(90deg, rgb(193, 39, 45), rgb(37, 99, 235))";
    const wordmark = finding({ clearedLayers: [rule], clearedLayerOwners: ["nav > a > span"] });
    const stripe = finding({ clearedLayers: [rule], clearedLayerOwners: ["main > article"] });
    const on = (viewport: "desktop" | "mobile", ...findings: Finding[]) =>
      assessSweep({ faction: "ua", theme: "light", viewport }, findings);

    const desktop = on("desktop", wordmark);
    expect(desktop.clearedLayers).toBeLessThanOrEqual(desktop.clearedLayerCeiling);
    expect(on("mobile").clearedLayerCeiling).toBe(0);

    const grown = on("desktop", wordmark, stripe);
    expect(grown.clearedLayers).toBeGreaterThan(grown.clearedLayerCeiling);
    expect(grown.clearedLayerMessage).toContain("CLEARED_LAYER_CEILING");
    expect(grown.clearedLayerMessage).toContain("main > article");
    const phone = on("mobile", wordmark);
    expect(phone.clearedLayers).toBeGreaterThan(phone.clearedLayerCeiling);
  });

  it("governs each faction by its own ceiling row, or by 'default'", () => {
    const wow = assessSweep({ faction: "wow", theme: "dark", viewport: "desktop" }, []);
    const coven = assessSweep({ faction: "coven", theme: "dark", viewport: "desktop" }, []);
    const covenMobile = assessSweep({ faction: "coven", theme: "dark", viewport: "mobile" }, []);

    expect(wow.ceiling).toBe(9);
    expect(coven.ceiling).toBe(8);
    expect(covenMobile.ceiling).toBe(6);
    // The message names the row to edit.
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
   * `page.evaluate` ships function SOURCE, not modules, so an import in
   * `contrastScan.ts` passes every check and throws in the browser (#1780).
   * Read the file: vitest-resolved imports are invisible to `toString`.
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
    // Mobile archetypes are separate files (#565).
    expect(Object.keys(SWEEP_VIEWPORTS).sort()).toEqual(["desktop", "mobile"]);
  });
});
