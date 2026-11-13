/**
 * The composer sheet clips and is not a scroll container (#3078). The ground
 * overhangs (`inset: -30%`) and must be clipped (#1028), but `overflow: hidden`
 * made the overhang scrollable. `clip` clips without scrolling.
 */
import { renderToStaticMarkup } from "react-dom/server";
import { describe, it, expect } from "vitest";
import { ComposerGround, ComposerSheet, useComposerSizes } from "../shared";

function Sheet() {
  const sizes = useComposerSizes();
  return (
    <ComposerSheet sizes={sizes} ground={<ComposerGround />}>
      body
    </ComposerSheet>
  );
}

describe("the composer sheet", () => {
  const markup = renderToStaticMarkup(<Sheet />);
  // Found by structure: whatever directly parents the ground.
  const sheet = /<div style="([^"]*)"><div aria-hidden="true" style="position:absolute;/.exec(
    markup,
  );

  it("parents an overhanging ground", () => {
    expect(sheet, "the ground's parent carries an inline style").not.toBeNull();
    expect(markup).toContain("inset:-30%");
  });

  it("clips it without becoming a scroll container", () => {
    const overflow = /(?:^|;)overflow:([^;]+)/.exec(sheet![1])?.[1];
    expect(
      overflow,
      "hidden/auto/scroll make the overhang scrollable (#3078); visible lets it reach the viewport (#1028)",
    ).toBe("clip");
  });

  it("stays a formatting context of its own, as `hidden` made it", () => {
    // `clip` alone doesn't establish one; child margins would collapse through.
    expect(sheet![1]).toMatch(/(?:^|;)display:flow-root(?:;|$)/);
  });
});
