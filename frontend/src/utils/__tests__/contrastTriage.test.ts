/**
 * Part D of the contrast foundation (#1675) — the triage policy.
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

import { RENDERED_BASELINE, baselineKey, triageFindings } from "../../../e2e/contrastBaseline";
import type { Finding } from "../../../e2e/contrastScan";

function finding(overrides: Partial<Finding> = {}): Finding {
  return {
    text: "rgb(0, 0, 0)",
    background: "rgb(255, 255, 255)",
    unresolved: null,
    unresolvedKind: null,
    backdropCss: null,
    ratio: 21,
    required: 4.5,
    fontSizePx: 16,
    fontWeight: 400,
    where: "div > div > span",
    sample: "some copy",
    ...overrides,
  };
}

/** A finding the scanner gave up on, over `css`. */
function unresolved(css: string): Finding {
  return finding({
    background: null,
    ratio: 0,
    unresolved: `div paints ${css}`,
    unresolvedKind: "opaque-gradient",
    backdropCss: css,
  });
}

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
    const { failures, unmeasurable } = triageFindings("light", [unresolved("linear-gradient(90deg, rgb(1, 2, 3), rgb(4, 5, 6))")]);

    expect(failures).toHaveLength(0);
    expect(unmeasurable.size).toBe(1);
  });

  it("counts one surface per distinct backdrop, however many nodes sit on it", () => {
    const gilt = "linear-gradient(160deg, rgb(1, 2, 3), rgb(4, 5, 6))";
    const rainbow = "linear-gradient(90deg, rgb(7, 8, 9), rgb(10, 11, 12))";
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
    // The old key shape put unresolved findings in RENDERED_BASELINE keyed on
    // the gradient CSS. Nothing may grandfather them any more — they are
    // ratcheted by count, so an allowlist hit here would double-count.
    const { failures, stale, unmeasurable } = triageFindings(allowedTheme, [
      { ...unresolved("linear-gradient(90deg, rgb(1, 2, 3), rgb(4, 5, 6))"), text: allowedText },
    ]);

    expect(failures).toHaveLength(0);
    expect(stale).toHaveLength(0);
    expect(unmeasurable.size).toBe(1);
  });
});
