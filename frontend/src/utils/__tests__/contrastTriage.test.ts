/**
 * Part D of the contrast foundation (#1675, #1762) — the triage policy.
 *
 * `e2e/contrast.spec.ts` can only run against Playwright, a live backend and a
 * seeded Postgres, so it runs nightly and nothing verifies it in a PR. The
 * decision it makes about each finding, though, is pure: fail a measured
 * pairing below AA, REPORT a backdrop the scanner refused to measure, and fail
 * an allowlist entry that has outlived its bug. That decision lives in
 * `triageFindings` precisely so it can be exercised here, in milliseconds,
 * with no browser.
 *
 * The load-bearing case is the first one: `background === null` means the
 * scanner could not resolve what is behind the text (a gradient with an opaque
 * stop, an image), NOT that it measured 0:1. Treating those two states as one
 * is what made the sweep unsatisfiable across all 28 of its tests.
 */
import { describe, expect, it } from "vitest";

import { RENDERED_BASELINE, baselineKey, resolveFillBand, triageFindings } from "../contrastBaseline";
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

/**
 * A finding the scanner gave up on, over `css`.
 *
 * `base` defaults to a transparent background-color, which is what a fill
 * element usually has: the gradient IS the surface.
 */
function unresolved(css: string, overrides: Partial<Finding> = {}): Finding {
  return finding({
    background: null,
    ratio: 0,
    unresolved: `div paints ${css}`,
    unresolvedKind: "opaque-gradient",
    backdropCss: css,
    backdropBase: "rgba(0, 0, 0, 0)",
    backdropOverlay: null,
    ...overrides,
  });
}

/** A two-stop ramp between two near-identical papers — UA's stock, in miniature. */
const PAPER_RAMP = "linear-gradient(180deg, rgb(253, 246, 234) 0%, rgb(236, 228, 210) 100%)";
/** Three opaque stops spanning most of the luminance range — the unaffiliated spectrum, in miniature. */
const RAINBOW = "linear-gradient(90deg, rgb(193, 39, 45) 0%, rgb(202, 138, 4) 50%, rgb(37, 99, 235) 100%)";
/** A translucent wash painted OVER an opaque white ramp — the paper-stock shape. */
const WASHED_PAPER =
  "radial-gradient(rgba(0, 0, 0, 0.5) 0%, rgba(0, 0, 0, 0) 70%), " +
  "linear-gradient(180deg, rgb(255, 255, 255) 0%, rgb(255, 255, 255) 100%)";
/**
 * Black to white. Every ink's luminance lies inside this band, so text over it
 * genuinely reaches 1:1 somewhere — the shape that must STAY unmeasurable
 * whatever else #1727 narrowed. Used wherever a test needs "the scanner gave
 * up and was right to".
 */
const STRADDLE = (deg: number) => `linear-gradient(${deg}deg, rgb(0, 0, 0) 0%, rgb(255, 255, 255) 100%)`;

/**
 * Take a real entry out of the allowlist rather than hard-coding a pair: the
 * list only ever shrinks, and a fixture naming one specific colour pairing
 * would start testing nothing the day that pairing gets fixed.
 */
const [allowlistedKey, allowlistedEntry] = Object.entries(RENDERED_BASELINE)[0];
const parsedKey = /^(\w+) \| (.+) on (rgba?\([^)]*\)) @([\d.]+)$/.exec(allowlistedKey);
if (parsedKey === null) throw new Error(`RENDERED_BASELINE key is not in baselineKey() form: ${allowlistedKey}`);
const [, allowedTheme, allowedText, allowedBackground, allowedRequired] = parsedKey;
const allowlisted = finding({
  text: allowedText,
  background: allowedBackground,
  required: Number(allowedRequired),
  ratio: allowlistedEntry.ratio,
});

describe("triageFindings", () => {
  it("parses a real allowlist key back into the fixture it describes", () => {
    // Guards the three tests below: if this reverse-parse ever drifts from
    // baselineKey(), they would silently stop exercising the allowlist.
    expect(
      baselineKey(allowedTheme, allowlisted.text, allowedBackground, allowlisted.required),
    ).toBe(allowlistedKey);
    expect(allowlisted.ratio).toBeLessThan(allowlisted.required);
  });

  it("reports an unresolvable backdrop instead of failing it", () => {
    const { failures, unmeasurable } = triageFindings("light", [unresolved(STRADDLE(90))]);

    expect(failures).toHaveLength(0);
    expect(unmeasurable.size).toBe(1);
  });

  it("counts one surface per distinct backdrop, however many nodes sit on it", () => {
    const gilt = STRADDLE(160);
    const rainbow = STRADDLE(90);
    const { unmeasurable } = triageFindings("dark", [unresolved(gilt), unresolved(gilt), unresolved(rainbow)]);

    expect([...unmeasurable.keys()]).toEqual([gilt, rainbow]);
    expect(unmeasurable.get(gilt)).toHaveLength(2);
  });

  it("still fails a genuinely-measured pairing below AA", () => {
    const { failures, unmeasurable } = triageFindings("light", [finding({ ratio: 3.2, required: 4.5 })]);

    expect(failures).toHaveLength(1);
    expect(unmeasurable.size).toBe(0);
  });

  it("passes a measured pairing that clears its requirement", () => {
    const { failures, stale } = triageFindings("light", [finding({ ratio: 4.5, required: 4.5 })]);

    expect(failures).toHaveLength(0);
    expect(stale).toHaveLength(0);
  });

  it("holds its fire on a pairing that is still allowlisted", () => {
    const { failures, stale } = triageFindings(allowedTheme, [allowlisted]);

    expect(failures).toHaveLength(0);
    expect(stale).toHaveLength(0);
  });

  it("fails an allowlisted pairing that now clears AA — the list only shrinks", () => {
    const fixed = { ...allowlisted, ratio: allowlisted.required + 0.5 };
    const { failures, stale } = triageFindings(allowedTheme, [fixed]);

    expect(failures).toHaveLength(0);
    expect(stale).toHaveLength(1);
    expect(stale[0]).toContain(`#${allowlistedEntry.issue}`);
  });

  it("does not consult the allowlist for an unresolvable backdrop", () => {
    // #1762's defect, as a test. The old key shape put unresolved findings in
    // RENDERED_BASELINE keyed on the gradient CSS, and the spec's allowlist
    // check ran BEFORE the branch that collects the report — so 56 surfaces
    // were neither printed nor counted. Nothing may grandfather them now.
    const { failures, stale, unmeasurable } = triageFindings(allowedTheme, [
      { ...unresolved(STRADDLE(90)), text: allowedText },
    ]);

    expect(failures).toHaveLength(0);
    expect(stale).toHaveLength(0);
    expect(unmeasurable.size).toBe(1);
  });

  it("leaves a translucent-over-solid ground exactly where it was (#1715, #1579)", () => {
    // The two compositing near-misses this narrowing must not touch. The
    // scanner RESOLVES them — `--color-bg-surface-alt` over the page,
    // `--switch-thumb` over `--switch-well` over the page — so they arrive
    // with a background and a ratio, and the fill path below is never
    // consulted. This asserts the branch order, which is the whole risk.
    const composited = finding({ background: "rgb(247, 244, 238)", ratio: 4.12, required: 4.5 });
    const { failures, unmeasurable } = triageFindings("light", [composited]);

    expect(unmeasurable.size).toBe(0);
    expect(failures).toHaveLength(1);
    expect(failures[0].background).toBe("rgb(247, 244, 238)");
  });

  it("holds no ratio:null entry — one mechanism, not two", () => {
    // The structural half of #1762. An unmeasurable surface on this list is a
    // surface the report cannot see, whatever the spec does downstream.
    const unmeasurableEntries = Object.entries(RENDERED_BASELINE).filter(
      ([, entry]) => (entry.ratio as number | null) === null,
    );

    expect(unmeasurableEntries).toHaveLength(0);
  });
});

/**
 * Part E (#1727) — the narrowing, as a pure function.
 *
 * The scanner refuses to resolve a `background-image` with an opaque stop,
 * because the colour under the text genuinely varies. That refusal was too
 * coarse: a paper stock is a two-stop ramp between two near-identical creams,
 * and a ramp only defeats measurement when the TEXT's own luminance falls
 * inside the band it spans. Outside the band, the worst case is the band edge
 * nearest the ink, and it is exact.
 *
 * So the decision is structural — read off the fill's own computed CSS, with
 * no list of selectors and nothing for a new faction frame to register — and
 * it is here, node-side, rather than inside the `page.evaluate` payload that
 * nothing typechecks (#1780) and no PR runs.
 */
describe("resolveFillBand", () => {
  it("resolves a two-stop paper ramp to its darkest and lightest stop", () => {
    const band = resolveFillBand(unresolved(PAPER_RAMP));

    expect(band).not.toBeNull();
    expect(band?.lo).toEqual({ r: 236, g: 228, b: 210, a: 1 });
    expect(band?.hi).toEqual({ r: 253, g: 246, b: 234, a: 1 });
  });

  it("composites a translucent wash over the opaque ramp beneath it", () => {
    // Layer order is the CSS one: first listed paints on TOP. Reading the
    // layers the other way round — or ignoring the wash — gives white, and
    // white is the answer that makes every ink look fine.
    const band = resolveFillBand(unresolved(WASHED_PAPER));

    expect(band?.hi).toEqual({ r: 255, g: 255, b: 255, a: 1 });
    expect(band?.lo).toEqual({ r: 127.5, g: 127.5, b: 127.5, a: 1 });
  });

  it("composites the translucent stack sitting ABOVE the fill", () => {
    const band = resolveFillBand(unresolved(PAPER_RAMP, { backdropOverlay: "rgba(0, 0, 0, 0.5)" }));

    // 236 * 0.5 = 118, 253 * 0.5 = 126.5 — the card over the fill is part of
    // the ground, exactly as it is for the resolved case.
    expect(band?.lo.r).toBeCloseTo(118, 5);
    expect(band?.hi.r).toBeCloseTo(126.5, 5);
  });

  it("refuses an image layer — there is no stop list to read", () => {
    expect(resolveFillBand(unresolved(`url("/media/plate.png"), ${PAPER_RAMP}`))).toBeNull();
  });

  it("refuses a fill that never reaches opacity — what is under it still shows", () => {
    const leaky = "linear-gradient(180deg, rgba(0, 0, 0, 0.2) 0%, rgb(1, 2, 3) 100%)";

    expect(resolveFillBand(unresolved(leaky))).toBeNull();
  });

  it("paints the fill over the element's own background-color", () => {
    // Same leaky ramp as above, now over an opaque background-color: the
    // translucent stop resolves against it (200 * 0.8 = 160) instead of
    // leaving the surface see-through.
    const leaky = "linear-gradient(180deg, rgba(0, 0, 0, 0.2) 0%, rgb(1, 2, 3) 100%)";
    const band = resolveFillBand(unresolved(leaky, { backdropBase: "rgb(200, 200, 200)" }));

    expect(band?.hi).toEqual({ r: 160, g: 160, b: 160, a: 1 });
    expect(band?.lo).toEqual({ r: 1, g: 2, b: 3, a: 1 });
  });
});

describe("triageFindings over a decorative fill (#1727)", () => {
  it("measures text on a paper ramp against the worst stop", () => {
    const ink = unresolved(PAPER_RAMP, { text: "rgb(28, 28, 26)" });
    const { failures, unmeasurable } = triageFindings("light", [ink]);

    expect(unmeasurable.size).toBe(0);
    expect(failures).toHaveLength(0);
  });

  it("fails ink that clears the light stop but not the dark one", () => {
    // 4.89:1 on rgb(253, 246, 234) and 4.15:1 on rgb(236, 228, 210). Taking
    // the lighter stop — or the average — would call this a pass, and the ink
    // is genuinely under AA over half the card.
    const ink = unresolved(PAPER_RAMP, { text: "rgb(108, 108, 108)" });
    const { failures, unmeasurable } = triageFindings("light", [ink]);

    expect(unmeasurable.size).toBe(0);
    expect(failures).toHaveLength(1);
    expect(failures[0].background).toBe("rgb(236, 228, 210)");
    expect(failures[0].ratio).toBeLessThan(4.5);
  });

  it("keeps a fill unmeasurable when the ink's luminance falls inside the band", () => {
    // The honest residue. Somewhere along this ramp the ink and the ground
    // have the same luminance and the ratio is 1:1 — there is no worst stop to
    // quote, so the sweep still reports rather than guessing.
    const ink = unresolved(RAINBOW, { text: "rgb(120, 120, 120)" });
    const { failures, unmeasurable } = triageFindings("light", [ink]);

    expect(failures).toHaveLength(0);
    expect(unmeasurable.size).toBe(1);
  });

  it("still measures white on that same spectrum — it is outside the band", () => {
    // White clears every stop's luminance, so the worst case is the lightest
    // stop and it is exact. This is the #1932 class: a faction hue meeting a
    // flat ink. A narrowing that exempted the whole gradient would lose it.
    const ink = unresolved(RAINBOW, { text: "rgb(255, 255, 255)" });
    const { failures, unmeasurable } = triageFindings("light", [ink]);

    expect(unmeasurable.size).toBe(0);
    expect(failures).toHaveLength(1);
    expect(failures[0].background).toBe("rgb(202, 138, 4)");
  });

  it("reports resolved fills separately so a new failure can be traced to this change", () => {
    const { resolvedFills } = triageFindings("light", [
      unresolved(PAPER_RAMP, { text: "rgb(28, 28, 26)" }),
      unresolved(PAPER_RAMP, { text: "rgb(28, 28, 26)" }),
      unresolved(STRADDLE(90)),
    ]);

    expect([...resolvedFills.keys()]).toEqual([PAPER_RAMP]);
    expect(resolvedFills.get(PAPER_RAMP)).toHaveLength(2);
  });

  it("does not grandfather a fill it could not resolve", () => {
    // #1762's rule, restated for the new branch: only a MEASURED pairing may
    // consult the allowlist, and a banded fill is measured or it is reported.
    const { failures, stale, unmeasurable } = triageFindings(allowedTheme, [
      { ...unresolved(STRADDLE(45)), text: allowedText, background: null },
    ]);

    expect(failures).toHaveLength(0);
    expect(stale).toHaveLength(0);
    expect(unmeasurable.size).toBe(1);
  });
});
