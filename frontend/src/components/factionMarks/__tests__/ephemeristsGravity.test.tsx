/**
 * The gravity field (#1830): brass rows at 52px pitch bowed toward a well off
 * the right edge, plus three ochre rings. Geometry is invisible to `tsc`, so
 * the shape is asserted.
 */
import { renderToStaticMarkup } from "react-dom/server";
import { describe, it, expect } from "vitest";
import { GravityField } from "../ephemeristsPlate";

const WIDTH = 720;
const HEIGHT = 2400;

function field(): string {
  return renderToStaticMarkup(<GravityField width={WIDTH} height={HEIGHT} />);
}

/** Every row's `M-6 <y> C … <yEnd>` as a [start, end] pair. */
function rows(markup: string): Array<[number, number]> {
  return [...markup.matchAll(/d="M-6 (-?[\d.]+) C [\d.]+ -?[\d.]+ [\d.]+ (-?[\d.]+)/g)].map(
    (m) => [Number(m[1]), Number(m[2])],
  );
}

describe("the Ephemerists gravity field", () => {
  it("rules the whole canvas at the design's 52px pitch", () => {
    const starts = rows(field()).map(([y]) => y);
    expect(starts[0]).toBe(-52);
    expect(starts[1] - starts[0]).toBe(52);
    // One row past the top edge, then the whole canvas.
    expect(starts).toHaveLength(Math.ceil((HEIGHT + 52) / 52));
    expect(starts.at(-1)).toBeGreaterThan(HEIGHT - 52);
  });

  it("draws every row toward the well, and the well's own row flat", () => {
    const drawn = rows(field());
    const sag = new Map(drawn.map(([y, end]) => [y, end - y]));
    expect(sag.get(520)).toBe(0);
    // The sign flip reads as a mass, not a fan.
    expect(sag.get(468)).toBeGreaterThan(0);
    expect(sag.get(572)).toBeLessThan(0);
    // Toward the mass, never past it.
    for (const [y, end] of drawn) {
      expect(Math.abs(end - 520), `row ${y}`).toBeLessThanOrEqual(Math.abs(y - 520));
    }
  });

  it("fades the rows out with distance from the mass", () => {
    // Opacity = 0.1 + pull × 0.34.
    const opacities = new Map(
      [...field().matchAll(/M-6 (-?[\d.]+)[^/]*opacity="([\d.]+)"/g)].map((m) => [
        Number(m[1]),
        Number(m[2]),
      ]),
    );
    expect(opacities.get(520)!).toBeGreaterThan(opacities.get(-52)!);
    expect(opacities.get(520)!).toBeGreaterThan(opacities.get(2340)!);
    expect(opacities.get(520)!).toBeCloseTo(0.1 + 0.42 * 0.34, 5);
  });

  it("draws in the plate's rule brass, never an ink", () => {
    const markup = field();
    expect(markup).toContain('stroke="var(--faction-ephemerists-plate-brass)"');
    expect(markup).not.toContain("plate-ink");
    expect(markup).not.toContain("plate-quiet");
  });

  it("marks the well past the sheet's right edge, in ochre", () => {
    const markup = field();
    // The sheet's `overflow: hidden` crops them into arcs.
    const rings = [...markup.matchAll(/<circle cx="(\d+)"/g)].map((m) => Number(m[1]));
    expect(rings).toEqual([WIDTH + 12, WIDTH + 12, WIDTH + 12]);
    expect(markup).toContain('fill="var(--faction-ephemerists-plate-ochre)"');
  });

  it("anchors its canvas to the right edge so the well cannot drift", () => {
    const markup = field();
    expect(markup).toContain('preserveAspectRatio="xMaxYMin slice"');
    expect(markup).toContain(`viewBox="0 0 ${WIDTH + 40} ${HEIGHT}"`);
  });

  it("takes its width from the container, not from the viewBox (#2957)", () => {
    // An `<svg>` is replaced: with `width: auto` it takes the viewBox width
    // and `right` is dropped. `+40` is `WELL_MARGIN`.
    const markup = field();
    expect(markup).toContain("width:calc(100% + 40px)");
    expect(markup).not.toContain("right:");
  });

  it("is inert: decorative, unreachable and unable to eat a click", () => {
    const markup = field();
    expect(markup).toContain('aria-hidden="true"');
    expect(markup).toContain("pointer-events:none");
  });
});
