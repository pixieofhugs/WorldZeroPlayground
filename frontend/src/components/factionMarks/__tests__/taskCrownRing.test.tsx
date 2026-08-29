/**
 * The Task Crown's RING is theme-invariant (#2134).
 *
 * The crown used to paint its rim with `--faction-default-rainbow-conic`, which
 * composes `--faction-default-stop-1…7` — and those seven flip with the theme
 * under #1219. The light seven are deliberately darkened so the spectrum stays
 * legible as ink and under text on white, so in light mode the rim read as one
 * muddy near-equal-value band. The rim carries nothing; it was paying a
 * contrast tax it does not owe. The owner ruling: the ring takes the BRIGHT
 * (dark-theme) hues in BOTH themes, while the disc and the fleur keep flipping.
 *
 * Two seams, and the second is the one with a future:
 *
 *   1. the component paints the ring with the invariant token, not the shared
 *      flipping conic; and
 *   2. that token is declared ONCE, so nothing can re-flip it — while the disc
 *      and the glyph still have their dark twins.
 *
 * (2) is a source scan because it is the assertion a render test cannot make: a
 * later `[data-theme="dark"] { --fdl-ring: … }` renders fine, typechecks fine,
 * and is only wrong when you hold the two themes side by side — exactly the
 * shape of the regression this issue reported.
 */
import { renderToStaticMarkup } from "react-dom/server";
import { describe, it, expect } from "vitest";

import { TaskCrown } from "../TaskCrown";
import { readIndexCss } from "../../../test/indexCss";

const CSS = readIndexCss();

/** How many times `--name:` is DECLARED (a `var(--name)` read does not count). */
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
    // The seven dark --faction-default-stop-* hues, in order, seam-closed on red.
    for (const hue of ["#e2433f", "#e07a3a", "#e6b94f", "#4ade80", "#3aa0a4", "#60a5fa", "#f472b6"]) {
      expect(value, `the bright ${hue}`).toContain(hue);
    }
    // And none of the muddy light seven that caused the report.
    for (const hue of ["#c1272d", "#c2541f", "#ca8a04", "#16a34a", "#1d6e72", "#2563eb", "#be185d"]) {
      expect(value, `the darkened light ${hue}`).not.toContain(hue);
    }
  });
});
