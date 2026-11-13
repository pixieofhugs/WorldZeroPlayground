/**
 * The Ephemerists kite (Sigil Studies v2). The COUNT is asserted: a port missing
 * a shape still renders a plausible kite. The retired 486:560 frame and sub-20px
 * cut are asserted as absences. Legibility at 15px is beyond this harness.
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
    expect(renderToStaticMarkup(<EphemeristsSigil size={84} />)).toContain(
      'width="84" height="84"',
    );
    expect(renderToStaticMarkup(<EphemeristsSigil size={15} />)).toContain(
      'width="15" height="15"',
    );
  });

  it("draws the same mark at every size — there is no reduced cut", () => {
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
    expect(html).toContain('fill="var(--faction-ephemerists-metal-gold)"');
  });

  it("inherits from the cascade when no colour is given", () => {
    // A fallback only; see EphemeristsSigil (#2723).
    expect(renderToStaticMarkup(<EphemeristsSigil size={84} />)).toContain('fill="currentColor"');
  });
});
