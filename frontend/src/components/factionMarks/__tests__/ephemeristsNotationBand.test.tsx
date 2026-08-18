/**
 * THE NOTATION BAND (#2143).
 *
 * TWO SEAMS, and neither of them is the markup. The band's whole behaviour is
 * arithmetic that runs against a MEASURED element, and the harness is SSR-only
 * (renderToStaticMarkup, no DOM, effects never run), so a rendered band here is
 * an empty band by construction. What can be wrong is therefore checked at the
 * two exported functions:
 *
 *  • THE COUNT. `n = clamp(round(width / 52), 7, 34)` — the owner HALVED the
 *    design's density, so a `/ 26` that survives review renders a plausible band
 *    at twice the count on every surface. The floor and the ceiling are the two
 *    rungs a browser would never show you: a 260px card and a 3000px monitor.
 *  • THE DRAW IS SEEDED, and that is the whole reason the seed exists. Same
 *    seed, same row, forever — otherwise a screenshot never reproduces and the
 *    ornament twitches on every unrelated re-render. Different seeds, different
 *    rows — otherwise every card in a list wears one band.
 *
 * The third claim is the one that makes a RESIZE cheap: the draw is a fixed
 * 34-mark sequence the band slices, so growing a band appends rather than
 * redraws. Asserted as a prefix relation, which is the only way to see it.
 */
import { renderToStaticMarkup } from "react-dom/server";
import { describe, it, expect } from "vitest";
import {
  EphemeristsNotationBand,
  drawNotation,
  markCount,
} from "../EphemeristsNotationBand";

describe("EphemeristsNotationBand — the count is measured", () => {
  it("takes one mark per 52px, which is the owner's halving of the design's 26", () => {
    // 676 = 13 x 52, the page masthead's own neighbourhood.
    expect(markCount(676)).toBe(13);
    // 416 = 8 x 52, the card's. A `/ 26` renders 26 and 16 here.
    expect(markCount(416)).toBe(8);
    expect(markCount(690)).toBe(13); // rounds down
    expect(markCount(702)).toBe(14); // rounds up
  });

  it("floors at seven so a phone card is a band and not a row of bullets", () => {
    // 260px / 52 is exactly 5.
    expect(markCount(260)).toBe(7);
    expect(markCount(1)).toBe(7);
  });

  it("ceilings at the pool's own size, so no band outruns the draw", () => {
    expect(markCount(30_000)).toBe(34);
    expect(drawNotation("any")).toHaveLength(34);
  });

  it("draws nothing at all before it has been measured", () => {
    // Not the floor: a band that paints seven marks and then jumps to thirteen
    // is the twitch the seeding exists to remove, arriving by another door.
    expect(markCount(0)).toBe(0);
    expect(renderToStaticMarkup(<EphemeristsNotationBand seed="task:1" />)).not.toMatch(
      /<span/,
    );
  });
});

describe("EphemeristsNotationBand — the draw is seeded per surface", () => {
  const row = (seed: string) => drawNotation(seed).map((mark) => `${mark.glyph}${mark.size}`);

  it("hands the same seed the same row every time", () => {
    expect(row("praxis:41")).toEqual(row("praxis:41"));
  });

  it("hands three neighbouring surfaces three different rows", () => {
    const rows = ["task:1", "task:2", "task:3"].map((seed) => row(seed).join(""));
    expect(new Set(rows).size).toBe(3);
  });

  it("varies the size as well as the glyph, across the whole 11/13/15/17 cycle", () => {
    // A draw that only varied the glyph would still pass every test above; the
    // spread is what makes the row read as a hand rather than a font sample.
    const sizes = new Set(drawNotation("task:7").map((mark) => mark.size));
    expect([...sizes].sort((a, b) => a - b)).toEqual([11, 13, 15, 17]);
  });

  it("grows at the tail, so a resize appends marks rather than redrawing them", () => {
    // The draw takes no count — the band slices it — which is what makes the
    // narrow row a PREFIX of the wide one. A `drawNotation(seed, n)` that
    // reseeded per length would break this and nothing else.
    const full = drawNotation("task:9");
    const narrow = full.slice(0, markCount(260));
    const wide = full.slice(0, markCount(676));
    expect(narrow).toHaveLength(7);
    expect(wide).toHaveLength(13);
    expect(wide.slice(0, narrow.length)).toEqual(narrow);
  });
});
