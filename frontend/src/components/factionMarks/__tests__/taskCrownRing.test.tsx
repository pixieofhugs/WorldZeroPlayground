/**
 * The Task Crown's ring is theme-invariant (#2134): the flipping conic's
 * darkened light stops read as one muddy band, so the ring takes the bright
 * hues in both themes while disc and fleur still flip. The single-declaration
 * check is a source scan: a later dark override would render fine.
 */
import { renderToStaticMarkup } from "react-dom/server";
import { describe, it, expect } from "vitest";

import { TaskCrown } from "../TaskCrown";
import { readIndexCss } from "../../../test/indexCss";

const CSS = readIndexCss();

/** Declarations of `--name:` (reads don't count). */
function declarations(name: string): number {
  return CSS.split(`${name}:`).length - 1;
}

describe("the Task Crown ring", () => {
  it("paints the invariant token, not the flipping shared conic", () => {
    const markup = renderToStaticMarkup(<TaskCrown />);
    expect(markup, "the rim reads the crown's own invariant ramp").toContain("var(--fdl-ring)");
    expect(markup, "the shared conic flips with the theme — #2134").not.toContain(
      "--faction-default-rainbow-conic",
    );
  });

  it("still flips the disc and the fleur", () => {
    const markup = renderToStaticMarkup(<TaskCrown />);
    expect(markup).toContain("var(--fdl-disc)");
    expect(markup).toContain("var(--fdl-glyph)");
    expect(declarations("--fdl-disc"), "light + dark").toBe(2);
    expect(declarations("--fdl-glyph"), "light + dark").toBe(2);
  });

  it("declares --fdl-ring exactly once, so no theme can re-flip it", () => {
    expect(declarations("--fdl-ring")).toBe(1);
  });
});
