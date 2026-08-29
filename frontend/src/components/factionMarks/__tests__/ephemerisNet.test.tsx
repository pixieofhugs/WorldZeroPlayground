/**
 * THE WARPED EPHEMERIS NET (#2144) — one drawing, mounted at ruled weights.
 *
 * THE SEAM: `a surface that wants the Ephemerists ground` → `the net it draws
 * there, and how far back it sits`. Two halves, because the ruling has two
 * halves and only one of them is markup.
 *
 * The JS half is the drawing itself and its two live mounts. What can silently
 * break is a mount going back to hand-rolling its own ruling — which is exactly
 * what the brief did before this issue (a `repeating-linear-gradient` pitched to
 * `BRIEF_LEADING`) and exactly the failure #2185 caught elsewhere in this kit:
 * one faction, two drawings, free to drift.
 *
 * The CSS half is `.eph-backdrop`. Its seven-layer wash is invisible to
 * `renderToStaticMarkup` — the page ground's whole metaphor lives in index.css —
 * so "the wash is gone and the sheet colour is not" is asserted against the
 * stylesheet on disk.
 *
 * The owner's three weights are the thing most likely to be edited back by
 * someone reading the design rather than the ruling (the design says 0.17 on a
 * card and 0.42 on the brief), so each is pinned to its number here.
 */
import { renderToStaticMarkup } from "react-dom/server";
import { describe, it, expect } from "vitest";
import EphemerisNet from "../EphemerisNet";
import EphemeristsBackdrop from "../../backdrop/EphemeristsBackdrop";
import { readIndexCss } from "../../../test/indexCss";

const CSS = readIndexCss();

/** The declaration body of one rule, by selector. */
function ruleFor(selector: string): string {
  const match = CSS.match(new RegExp(`\\${selector}\\s*\\{([^}]*)\\}`));
  if (!match) throw new Error(`no rule for ${selector} in index.css`);
  return match[1];
}

describe("the net is a ground, not a veil", () => {
  const html = renderToStaticMarkup(<EphemerisNet opacity={0.17} />);

  it("is inert: hidden from assistive tech, and untouchable", () => {
    expect(html).toContain('aria-hidden="true"');
    expect(html).toContain("pointer-events:none");
  });

  it("sits behind everything printed on its host", () => {
    expect(html).toContain("z-index:-1");
  });

  it("takes its ink from the plate's brass rather than a raw hue", () => {
    expect(html).toContain("var(--faction-ephemerists-plate-brass-light)");
    expect(html).not.toMatch(/#[0-9a-f]{3,8}\b/i);
  });

  it("stretches to its host's box rather than keeping the sheet's aspect", () => {
    expect(html).toContain('preserveAspectRatio="none"');
    expect(html).toContain('viewBox="0 0 1000 600"');
  });

  it("draws all three families — bent meridians, bent parallels, a straight fan", () => {
    // Curves are paths with one quadratic each; the fan is straight lines.
    expect((html.match(/<path/g) ?? []).length).toBeGreaterThan(20);
    expect((html.match(/<line/g) ?? []).length).toBeGreaterThan(8);
  });

  it("carries no opacity of its own — the mount decides how far back it sits", () => {
    expect(renderToStaticMarkup(<EphemerisNet opacity={0.1} />)).toContain("opacity:0.1");
    expect(html).toContain("opacity:0.17");
  });
});

describe("the page ground", () => {
  it("draws the net at the page's weight", () => {
    const html = renderToStaticMarkup(<EphemeristsBackdrop />);
    expect(html).toContain('class="eph-backdrop"');
    expect(html).toContain("opacity:0.17");
    expect(html).toContain('viewBox="0 0 1000 600"');
  });

  it("keeps the sheet colour and nothing else — the wash is gone", () => {
    const backdrop = ruleFor(".eph-backdrop");
    expect(backdrop).toContain("background-color: var(--faction-ephemerists-plate-page)");
    // The seven layers the net replaces. Any of these back means the page is
    // aged paper again rather than a chart.
    expect(backdrop).not.toContain("background-image");
    expect(backdrop).not.toContain("repeating-radial-gradient");
    expect(backdrop).not.toContain("repeating-linear-gradient");
  });
});
