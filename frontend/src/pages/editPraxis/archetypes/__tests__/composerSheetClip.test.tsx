/**
 * The composer sheet clips, and is not a scroll container (#3078).
 *
 * ## The seam
 *
 * `ComposerSheet`'s own rendered markup: the inline style of the one element
 * that parents the ground. Every composer — propose-task, the praxis composer,
 * character create and edit, in every faction skin — mounts its ground through
 * this component, so the element is the same one on all of them.
 *
 * ## Why both halves
 *
 * `ComposerGround` overhangs the sheet by design (`inset: -30%`). The sheet has
 * to CLIP that — the #1028 ruling, and what rounds the masthead band — but
 * `overflow: hidden` clips by making the box a scroll container, so the overhang
 * became scrollable width and a text selection dragged past the edge walked the
 * whole form sideways. `clip` is the one value that does the first without the
 * second. `visible` would let the ornaments out; `hidden`, `auto` and `scroll`
 * would let the content move.
 *
 * renderToStaticMarkup needs no DOM, matching the rest of this suite.
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
  // The sheet is whatever directly parents the ground — found by structure, so
  // the guard follows the element rather than a style string it could restate.
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
    // `clip` alone does not establish one, so a child's edge margin would
    // collapse through the sheet where it never used to.
    expect(sheet![1]).toMatch(/(?:^|;)display:flow-root(?:;|$)/);
  });
});
