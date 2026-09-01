/**
 * The gravity field (#1830) — the Ephemerists composer's ground.
 *
 * The design replaced the plate's ruled lines with a field: brass rows at a
 * fixed 52px pitch bowed toward a well off the sheet's right edge, each row
 * sagging by its distance from the mass, and three ochre rings marking where
 * the mass is. Its own comment is *"the plate's field, not lined paper"*.
 *
 * Geometry is the whole of this mark, and geometry is the one thing a `tsc`
 * pass cannot see, so what is asserted here is the SHAPE: that the sag peaks at
 * the well's latitude and falls away either side, that the rows are drawn in the
 * rule colour and never in an ink, and that the well sits past the right edge
 * where the sheet's clip will crop it. `renderToStaticMarkup`, no DOM, matching
 * the rest of this suite.
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
    // One row past the top edge, then the canvas: the field cannot stop short
    // of the sheet, which is why the canvas overruns the design's own 1500.
    expect(starts).toHaveLength(Math.ceil((HEIGHT + 52) / 52));
    expect(starts.at(-1)).toBeGreaterThan(HEIGHT - 52);
  });

  it("draws every row toward the well, and the well's own row flat", () => {
    const drawn = rows(field());
    const sag = new Map(drawn.map(([y, end]) => [y, end - y]));
    // A row THROUGH the well has nowhere to fall to.
    expect(sag.get(520)).toBe(0);
    // Rows above it sag DOWN toward it, rows below rise UP to it. That sign
    // flip is what makes the field read as a mass rather than as a fan.
    expect(sag.get(468)).toBeGreaterThan(0);
    expect(sag.get(572)).toBeLessThan(0);
    // And every row ends nearer the well's latitude than it started — the pull
    // is always toward the mass, never past it.
    for (const [y, end] of drawn) {
      expect(Math.abs(end - 520), `row ${y}`).toBeLessThanOrEqual(Math.abs(y - 520));
    }
  });

  it("fades the rows out with distance from the mass", () => {
    // Opacity tracks the pull itself (0.1 + pull × 0.34), so the field is
    // strongest at the well's latitude and thins toward the sheet's ends —
    // which is what stops a ruled ground from reading as ruled paper.
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
    // Three rings, all centred 12px beyond `width` — the sheet's own
    // `overflow: hidden` is what crops them into arcs.
    const rings = [...markup.matchAll(/<circle cx="(\d+)"/g)].map((m) => Number(m[1]));
    expect(rings).toEqual([WIDTH + 12, WIDTH + 12, WIDTH + 12]);
    expect(markup).toContain('fill="var(--faction-ephemerists-plate-ochre)"');
  });

  it("anchors its canvas to the right edge so the well cannot drift", () => {
    // A card wider than the nominal scales the rows up rather than stranding
    // the well mid-sheet.
    const markup = field();
    expect(markup).toContain('preserveAspectRatio="xMaxYMin slice"');
    expect(markup).toContain(`viewBox="0 0 ${WIDTH + 40} ${HEIGHT}"`);
  });

  it("takes its width from the container, not from the viewBox (#2957)", () => {
    // THE SEAM. An `<svg>` is a REPLACED element: with `width: auto` the used
    // width is the INTRINSIC one — the viewBox span — so `left` and `right`
    // are over-constrained and `right` is dropped. Measured in prod, the field
    // was 434px (394 + 40) on a 624px card: 0.696 coverage, and `slice` never
    // scaled anything because the element always matched its own viewBox.
    //
    // An explicit width is what stops the intrinsic size winning, and it is
    // the ONE declaration that makes the docblock above true. `100%` is the
    // container; the `+40` is `WELL_MARGIN`, the overhang the well is drawn in.
    const markup = field();
    expect(markup).toContain("width:calc(100% + 40px)");
    // And the offset pair is no longer set at all, so nothing can be dropped:
    // the box is `left` + `width`, which is never over-constrained.
    expect(markup).not.toContain("right:");
  });

  it("is inert: decorative, unreachable and unable to eat a click", () => {
    const markup = field();
    expect(markup).toContain('aria-hidden="true"');
    expect(markup).toContain("pointer-events:none");
  });
});
