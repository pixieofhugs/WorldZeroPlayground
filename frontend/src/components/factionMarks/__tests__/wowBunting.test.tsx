/**
 * WOW'S BUNTING, AND ITS TWO CLIPS (#2728).
 *
 * Both defects were measured in a browser and neither is visible to this
 * harness — the repo renders with `renderToStaticMarkup`, so there is no jsdom,
 * no layout and nothing to measure. What IS checkable is the arithmetic that
 * decides the count, which is pure, and the box model the container declares,
 * which is inline style and therefore in the markup.
 *
 *  • THE HORIZONTAL CLIP. A pennant is a CSS triangle — `border-left: 7px` plus
 *    `border-right: 7px` — and A BORDER CANNOT SHRINK, so the old `flex: 1;
 *    min-width: 0` was decorative: thirty pennants had a hard 536px floor and
 *    `overflow: hidden` ate the rest (measured `clientWidth 263 /
 *    scrollWidth 536` at a 593px window). The count is now measured off the
 *    container, the way `EphemeristsNotationBand` does it, and
 *    {@link buntingPennantCount} is that arithmetic. It is the seam: a strip
 *    that packs one pennant too many looks perfectly plausible and is the exact
 *    bug reported.
 *  • THE VERTICAL CLIP. Tailwind preflight makes everything `border-box`, so a
 *    mount passing padding shrank a fixed `height: 22` container's CONTENT box —
 *    `WowFactionBody` passes `var(--space-sm)` off the top and the strip
 *    measured `clientHeight 22 / scrollHeight 28`. The fix belongs to the
 *    component, not the mount, so no future mount can clip the pennants it is
 *    spacing: the well is `content-box`, and `min-height` rather than `height`.
 *
 * An unmeasured strip draws NOTHING — the band's rule, for the band's reason: a
 * strip that paints thirty pennants and then snaps to twelve is the twitch the
 * measurement exists to remove, and in a browser the layout effect runs before
 * paint so the empty state is never seen. That is why the count assertions
 * below are at the function and not in the markup.
 */
import type { CSSProperties } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, it, expect } from "vitest";

import { Bunting, buntingPennantCount, pennantStyle } from "../wowOrnament";

/** The pennant's own geometry, restated so this file is an independent check of
 *  it: 7px + 7px of mitre is the flag, `--space-xs` is the gap between two. */
const PENNANT = 14;
const GAP = 4;

/** What the strip must satisfy at every width: the pennants and their gaps fit
 *  inside the well, and one more pennant would not. */
function widthOf(count: number): number {
  return count <= 0 ? 0 : count * PENNANT + (count - 1) * GAP;
}

describe("buntingPennantCount — as many whole pennants as fit (#2728)", () => {
  it("draws nothing until it has been measured", () => {
    // Before the layout effect, under the Node harness where effects never run,
    // and in a container that has no width yet.
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
    // The reported measurement: a 593px window, `clientWidth 263 /
    // scrollWidth 536`. Thirty pennants never fit; this many do.
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
    // `flex: 1` stretched the CONTENT box of a zero-height bordered span, which
    // is what made a wide strip's flags read as trapezoids (33.5px on a 1121px
    // window). A pennant is 14px wide everywhere now.
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
    // Tailwind preflight's `border-box` is what let `WowFactionBody`'s padding
    // eat 8px of an 18px pennant.
    expect(html).toContain("box-sizing:content-box");
    // `min-height:22px` contains the substring, so the fixed height has to be
    // matched at a declaration boundary.
    expect(html, "a fixed height is the clip").not.toMatch(/[;"]height:22px/);
    expect(html).toContain("min-height:22px");
  });

  it("still lets a mount space it", () => {
    expect(markup({ padding: "var(--space-sm) var(--space-lg) 0" })).toContain(
      "padding:var(--space-sm) var(--space-lg) 0",
    );
  });
});
