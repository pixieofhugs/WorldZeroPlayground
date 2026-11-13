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

  it("carries the DARK stop values, not the light ones", () => {
    const ring = CSS.slice(CSS.indexOf("--fdl-ring:"));
    const value = ring.slice(0, ring.indexOf(";"));
    for (const hue of ["#e2433f", "#e07a3a", "#e6b94f", "#4ade80", "#3aa0a4", "#60a5fa", "#f472b6"]) {
      expect(value, `the bright ${hue}`).toContain(hue);
    }
    for (const hue of ["#c1272d", "#c2541f", "#ca8a04", "#16a34a", "#1d6e72", "#2563eb", "#be185d"]) {
      expect(value, `the darkened light ${hue}`).not.toContain(hue);
    }
  });
});
