/**
 * WoW's bunting and its two clips (#2728), both measured in a browser; here
 * only the count arithmetic and the inline box model are checkable.
 *
 *  • Horizontal: pennants are border triangles, which can't shrink, so the
 *    count is measured off the container ({@link buntingPennantCount}).
 *  • Vertical: preflight's `border-box` let mount padding shrink a fixed
 *    height; the well is `content-box` with `min-height`.
 *
 * Unmeasured draws nothing (no 30-then-12 snap), so counts are tested at the
 * function.
 */
import type { CSSProperties } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, it, expect } from "vitest";

import { Bunting, buntingPennantCount, pennantStyle } from "../wowOrnament";

/** Restated independently: 7px + 7px flag, `--space-xs` gap. */
const PENNANT = 14;
const GAP = 4;

function widthOf(count: number): number {
  return count <= 0 ? 0 : count * PENNANT + (count - 1) * GAP;
}

describe("buntingPennantCount — as many whole pennants as fit (#2728)", () => {
  it("draws nothing until it has been measured", () => {
    expect(buntingPennantCount(0)).toBe(0);
    expect(buntingPennantCount(-1)).toBe(0);
    expect(buntingPennantCount(Number.NaN)).toBe(0);
  });

  it("takes the pennant's 14px floor seriously", () => {
    expect(buntingPennantCount(13), "narrower than one flag").toBe(0);
    expect(buntingPennantCount(14), "exactly one flag").toBe(1);
    expect(buntingPennantCount(31), "one flag and most of a gap").toBe(1);
    expect(buntingPennantCount(32), "two flags and the gap between them").toBe(2);
  });

  it("never overflows, and never leaves room for one more", () => {
    for (let width = 320; width <= 1440; width += 1) {
      const count = buntingPennantCount(width);
      expect(widthOf(count), `${width}px overflows`).toBeLessThanOrEqual(width);
      expect(widthOf(count + 1), `${width}px has room for another`).toBeGreaterThan(width);
    }
  });

  it("fits the strip that was clipped in half on prod", () => {
    // Reported: `clientWidth 263 / scrollWidth 536`.
    expect(widthOf(buntingPennantCount(263))).toBeLessThanOrEqual(263);
    expect(buntingPennantCount(263)).toBeLessThan(30);
  });
});

describe("pennantStyle — the flag itself is unchanged (#2728)", () => {
  it("alternates gold and plum and keeps the 2px stagger", () => {
    expect(pennantStyle(0).borderTop).toContain("--faction-wow-chronicle-gold");
    expect(pennantStyle(1).borderTop).toContain("--faction-wow-card-accent");
    expect(pennantStyle(0).transform).toBe("translateY(0px)");
    expect(pennantStyle(1).transform).toBe("translateY(2px)");
  });

  it("draws a triangle rather than a flexed trapezoid", () => {
    // `flex: 1` stretched flags into trapezoids.
    const style = pennantStyle(0);
    expect(style.flex, "a border cannot shrink, so flex was always a lie").toBeUndefined();
    expect(style.borderLeft).toBe("7px solid transparent");
    expect(style.borderRight).toBe("7px solid transparent");
  });
});

describe("the bunting's well cannot be clipped by a mount's padding (#2728)", () => {
  const markup = (style?: CSSProperties) =>
    renderToStaticMarkup(<Bunting style={style} />);

  it("sizes its well by the content box, not the border box", () => {
    const html = markup();
    expect(html).toContain("box-sizing:content-box");
    // Boundary-anchored: `min-height:22px` contains the substring.
    expect(html, "a fixed height is the clip").not.toMatch(/[;"]height:22px/);
    expect(html).toContain("min-height:22px");
  });

  it("still lets a mount space it", () => {
    expect(markup({ padding: "var(--space-sm) var(--space-lg) 0" })).toContain(
      "padding:var(--space-sm) var(--space-lg) 0",
    );
  });
});
