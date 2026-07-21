/**
 * FactionSigil dispatcher (#659, ADR-0040). Confirms the map resolves the
 * bespoke sigil per faction slug and falls back to the unaffiliated
 * seven-segment `DefaultSigil` ring for an unknown/null slug — the same
 * fallback contract as `FactionAvatar` (see factionAvatar.test.tsx).
 */
import { renderToStaticMarkup } from "react-dom/server";
import { describe, it, expect } from "vitest";
import "../../../i18n";
import FactionSigil from "../FactionSigil";
import UaMandala from "../UaMandala";

describe("FactionSigil dispatcher (#659)", () => {
  it("renders the UA ensō for the ua slug", () => {
    const html = renderToStaticMarkup(<FactionSigil slug="ua" />);
    // The ensō is two arcs on a square viewBox, not the old 100x120 shield.
    expect(html).toContain('viewBox="0 0 200 200"');
    expect(html).toContain('d="M134 41.2 A68 68 0 1 1 66 158.8"');
    expect(html).toContain('d="M66 158.8 A68 68 0 0 1 66 41.2"');
  });

  it("tapers the ensō by stroke-width and leaves the circle open", () => {
    const html = renderToStaticMarkup(<FactionSigil slug="ua" />);
    // The heavy sweep and the light return — the taper is two widths, not a
    // variable-width outline. Two arcs only means the gap survives.
    expect(html).toContain('stroke-width="22"');
    expect(html).toContain('stroke-width="10"');
    expect(html.match(/<path/g) ?? []).toHaveLength(2);
    // Hand-drawn, not geometry.
    expect(html).toContain("rotate(-7 100 100)");
  });

  it("draws the ensō in the ornament token so it follows the dark cascade", () => {
    const html = renderToStaticMarkup(<FactionSigil slug="ua" />);
    expect(html).toContain("var(--faction-ua-glow)");
    // The salon is dead: no gilt shield, no legacy gold, no raw hex.
    expect(html).not.toMatch(/var\(--ua-[a-z]/); // the whole legacy family, deleted in #853
    expect(html).not.toContain("#");
  });

  it("renders the S.N.I.D.E. circled-A for the snide slug", () => {
    const html = renderToStaticMarkup(<FactionSigil slug="snide" />);
    expect(html).toContain('viewBox="0 0 48 48"');
    expect(html).toContain("var(--faction-snide-acid)");
  });

  it("renders the Everymen union cog for the everymen slug", () => {
    const html = renderToStaticMarkup(<FactionSigil slug="everymen" />);
    expect(html).toContain("var(--everymen-red)");
    expect(html).toContain("var(--everymen-cream)");
  });

  it("falls back to the unaffiliated ring for an unknown slug", () => {
    const html = renderToStaticMarkup(<FactionSigil slug="totally-unknown" />);
    expect(html).toContain("var(--faction-default-ring)");
    expect(html).not.toContain("var(--faction-snide-acid)");
    expect(html).not.toMatch(/var\(--ua-[a-z]/); // the whole legacy family, deleted in #853
    expect(html).not.toContain("var(--everymen-red)");
  });

  it("falls back to the unaffiliated ring for a null slug", () => {
    const html = renderToStaticMarkup(<FactionSigil slug={null} />);
    expect(html).toContain("var(--faction-default-ring)");
  });
});

/** Count petal paths — every band draws its petals as <path> elements. */
function petalCount(html: string): number {
  return (html.match(/<path/g) ?? []).length;
}

describe("UaMandala primitive (#849)", () => {
  it("renders nothing at all for the absent strength", () => {
    // Dense/text-heavy surfaces ask for `absent` and must get no figure —
    // not a transparent one still costing a hundred paths.
    expect(renderToStaticMarkup(<UaMandala strength="absent" />)).toBe("");
  });

  it("is faint texture at 6-22% by default and solid at full strength", () => {
    const texture = renderToStaticMarkup(<UaMandala />);
    const opacity = Number(texture.match(/opacity:([\d.]+)/)?.[1]);
    expect(opacity).toBeGreaterThanOrEqual(0.06);
    expect(opacity).toBeLessThanOrEqual(0.22);
    expect(renderToStaticMarkup(<UaMandala strength="full" />)).toContain("opacity:1");
  });

  it("draws rings x petals-per-ring petals, both parameterized", () => {
    expect(petalCount(renderToStaticMarkup(<UaMandala rings={3} petalsPerRing={12} />))).toBe(36);
    expect(petalCount(renderToStaticMarkup(<UaMandala rings={5} petalsPerRing={8} />))).toBe(40);
  });

  it("applies rotation to the figure", () => {
    expect(renderToStaticMarkup(<UaMandala rotation={18} />)).toContain("rotate(18 50 50)");
  });

  it("takes its colour from a token, never a hex", () => {
    const html = renderToStaticMarkup(<UaMandala strength="full" />);
    expect(html).toContain("var(--faction-ua-glow)");
    expect(html).not.toContain("#");
  });

  it("keeps motion in the shared reduced-motion-gated class, never inline", () => {
    const still = renderToStaticMarkup(<UaMandala strength="full" />);
    expect(still).not.toContain("ua-mandala-ring");
    const spinning = renderToStaticMarkup(<UaMandala strength="full" spin />);
    expect(spinning).toContain('class="ua-mandala-ring"');
    // The keyframes live in index.css; the component only hands over tempo.
    expect(spinning).not.toContain("animation:");
    expect(spinning).toContain("--ua-spin-dur");
  });
});
