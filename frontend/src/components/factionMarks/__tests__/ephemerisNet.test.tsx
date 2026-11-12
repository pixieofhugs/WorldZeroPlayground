/**
 * The warped ephemeris net (#2144): one drawing, mounted at ruled weights.
 * The JS half guards against a mount hand-rolling its own ruling again; the
 * CSS half checks `.eph-backdrop`'s old wash is gone, on the stylesheet since
 * it's invisible to markup. Weights are pinned because the design's numbers
 * differ from the owner's ruling.
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
    expect(backdrop).not.toContain("background-image");
    expect(backdrop).not.toContain("repeating-radial-gradient");
    expect(backdrop).not.toContain("repeating-linear-gradient");
  });
});
