/**
 * The Ephemerists sigil (#1635) — the kite mark, and its REDUCED-DETAIL CUT.
 *
 * The seam is the rendered SVG: a sigil has no behaviour, so the only thing
 * that can be wrong about it is the geometry it emits at a given `size`. Two
 * claims are worth a test rather than an eyeball. The mark is **not square**,
 * so a caller that hands it one number must still get the design's 486:560
 * frame back — that is what makes the masthead's 54x62 and 38x44 mounts
 * (#1634) buildable from `size` alone. And below the threshold the component
 * must draw a DIFFERENT mark, not the same one smaller; a scaled-down full cut
 * is exactly the failure this cut exists to prevent, and it looks identical to
 * a working one in any snapshot that does not count elements.
 */
import { renderToStaticMarkup } from "react-dom/server";
import { describe, it, expect } from "vitest";
import { EphemeristsSigil } from "../EphemeristsSigil";

const KITE = "M243 120 L55 272 L243 490 L425 272 Z";
const AXIS_V = "M243 120 L243 490";
const AXIS_H = "M100 272 L392 272";

const discCount = (html: string) => (html.match(/<circle/g) ?? []).length;
const pathCount = (html: string) => (html.match(/<path/g) ?? []).length;

describe("EphemeristsSigil — the full cut", () => {
  const html = renderToStaticMarkup(<EphemeristsSigil size={62} />);

  it("draws the design's kite, crossed axes and five discs", () => {
    expect(html).toContain('viewBox="0 0 486 560"');
    expect(html).toContain(KITE);
    expect(html).toContain(AXIS_V);
    expect(html).toContain(AXIS_H);
    expect(discCount(html)).toBe(5);
    expect(pathCount(html)).toBe(3);
  });

  it("keeps the design's stroke weight and round caps at page scale", () => {
    expect(html).toContain('stroke-width="26"');
    expect(html).toContain('stroke-linecap="round"');
    expect(html).toContain('stroke-linejoin="round"');
  });

  it("is no longer the watching wanderer — the eye and its orbital ring are gone", () => {
    expect(html).not.toContain("<ellipse");
    expect(html).not.toContain('viewBox="0 0 24 24"');
  });
});

describe("EphemeristsSigil — the frame", () => {
  it("returns the design's 486:560 box from a single size, at every mount the masthead uses", () => {
    // #1634 mounts it at a page scale, a card scale and inline; all three are
    // one `size` away, which is why the component owns the ratio.
    expect(renderToStaticMarkup(<EphemeristsSigil size={62} />)).toContain('width="54" height="62"');
    expect(renderToStaticMarkup(<EphemeristsSigil size={44} />)).toContain('width="38" height="44"');
    expect(renderToStaticMarkup(<EphemeristsSigil size={13} />)).toContain('width="11" height="13"');
  });
});

describe("EphemeristsSigil — the reduced cut", () => {
  const small = renderToStaticMarkup(<EphemeristsSigil size={13} />);

  it("drops the crossed axes and the four vertex discs below the threshold", () => {
    expect(small).toContain(KITE);
    expect(small).not.toContain(AXIS_V);
    expect(small).not.toContain(AXIS_H);
    expect(pathCount(small)).toBe(1);
    // The apex disc survives: it is the silhouette's distinguishing feature.
    expect(discCount(small)).toBe(1);
  });

  it("thickens the stroke rather than scaling it, so the kite never goes sub-pixel", () => {
    // 26 units at 13px is 0.6 rendered px — a grey smear. The cut floors both
    // the rule and the disc at a device pixel instead.
    const width = Number(small.match(/stroke-width="([\d.]+)"/)?.[1]);
    expect(width).toBeGreaterThan(26);
    expect((width * 13) / 560).toBeGreaterThanOrEqual(1);
  });

  it("switches on the threshold, not on the caller", () => {
    expect(renderToStaticMarkup(<EphemeristsSigil size={20} />)).toContain(AXIS_H);
    expect(renderToStaticMarkup(<EphemeristsSigil size={19} />)).not.toContain(AXIS_H);
  });
});

describe("EphemeristsSigil — ink", () => {
  it("takes one colour for the whole mark and hardcodes no hex", () => {
    const html = renderToStaticMarkup(
      <EphemeristsSigil size={62} color="var(--faction-ephemerists-plate-gold)" />,
    );
    expect(html).not.toContain("#");
    // Stroked geometry and filled discs are the same ink — it recolours whole.
    expect(html).toContain('stroke="var(--faction-ephemerists-plate-gold)"');
    expect(html).toContain('fill="var(--faction-ephemerists-plate-gold)"');
  });

  it("inherits from the cascade when no colour is given", () => {
    expect(renderToStaticMarkup(<EphemeristsSigil size={62} />)).toContain('stroke="currentColor"');
  });
});
