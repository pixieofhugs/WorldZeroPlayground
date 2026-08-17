/**
 * The Ephemerists sigil — the kite, brushed and gilt (Sigil Studies v2,
 * redrawing #1635).
 *
 * The seam is the rendered SVG: a sigil has no behaviour, so the only thing
 * that can be wrong about it is the geometry it emits at a given `size`. What
 * is worth a test rather than an eyeball is the COUNT. This mark is six
 * separate brushed shapes and the design's band carries all six; a port that
 * dropped the crossbar, the crescent or the point would typecheck, render a
 * plausible kite, and pass any assertion that only looked for "a path". So the
 * count is asserted, and so is the fact that each of the six is present.
 *
 * The two properties #1635's version was tested for are asserted as ABSENCES,
 * because both were deliberately retired: the 486:560 frame (the mark is square
 * now) and the sub-20px reduced cut (nothing is stroked, so there is one
 * drawing at every size).
 *
 * What no test here can tell you: whether the mark READS at 15px. The harness
 * is `renderToStaticMarkup` — no DOM, no layout, no rasterisation.
 */
import { renderToStaticMarkup } from "react-dom/server";
import { describe, it, expect } from "vitest";
import { EphemeristsSigil } from "../EphemeristsSigil";

/** One distinctive opening move per shape, in the design's paint order. */
const SHAPE_HEADS = [
  ["the swept sail", "M19.1 30.8"],
  ["the horizon", "M9 75.5"],
  ["the spar", "M68 35"],
  ["the crossbar", "M55 45.4"],
  ["the crescent", "M56.5 18.9"],
  ["the point", "M73.9 6.8"],
] as const;

const pathCount = (html: string) => (html.match(/<path/g) ?? []).length;

describe("EphemeristsSigil — the drawing", () => {
  const html = renderToStaticMarkup(<EphemeristsSigil size={84} />);

  it("draws all six brushed shapes, not a subset", () => {
    expect(html).toContain('viewBox="0 0 100 100"');
    expect(pathCount(html)).toBe(6);
    for (const [name, head] of SHAPE_HEADS) expect(html, name).toContain(head);
  });

  it("is filled, not stroked — which is what removes the sub-pixel floor", () => {
    expect(html).not.toContain("stroke-width");
    expect(html).not.toContain("<circle");
    expect(html).toContain('fill-rule="evenodd"');
  });

  it("is no longer the ruled plumb-bob — no 486:560 frame, no vertex discs", () => {
    expect(html).not.toContain('viewBox="0 0 486 560"');
    expect(html).not.toContain("M243 120 L55 272 L243 490 L425 272 Z");
  });
});

describe("EphemeristsSigil — the frame", () => {
  it("is square at every size: one number in, one box out", () => {
    // The old mark handed back the design's non-square 486:560 frame; v2 draws
    // it square at 84, 34 and 15, so a caller's `size` is both dimensions.
    expect(renderToStaticMarkup(<EphemeristsSigil size={84} />)).toContain(
      'width="84" height="84"',
    );
    expect(renderToStaticMarkup(<EphemeristsSigil size={15} />)).toContain(
      'width="15" height="15"',
    );
  });

  it("draws the same mark at every size — there is no reduced cut", () => {
    // #1635 switched to a sparser drawing below 20px because its 26-unit
    // STROKE went sub-pixel there. Nothing is stroked now, so the threshold
    // has nothing to protect and one drawing serves the whole range.
    for (const size of [84, 34, 20, 19, 15]) {
      expect(pathCount(renderToStaticMarkup(<EphemeristsSigil size={size} />)), `${size}px`).toBe(6);
    }
  });
});

describe("EphemeristsSigil — ink", () => {
  it("takes one colour for the whole mark and hardcodes no hex", () => {
    const html = renderToStaticMarkup(
      <EphemeristsSigil size={84} color="var(--faction-ephemerists-metal-gold)" />,
    );
    expect(html).not.toContain("#");
    // One `fill` on the <svg>; the six shapes inherit it, so the mark
    // recolours whole rather than per shape.
    expect(html).toContain('fill="var(--faction-ephemerists-metal-gold)"');
  });

  it("inherits from the cascade when no colour is given", () => {
    // The design's own markup is `<svg fill="currentColor">` with the gold set
    // by the cell around it; the two mounts that pass nothing sit on the
    // neutral page, where a theme-invariant gold reads 1.69:1 in light.
    expect(renderToStaticMarkup(<EphemeristsSigil size={84} />)).toContain('fill="currentColor"');
  });
});
