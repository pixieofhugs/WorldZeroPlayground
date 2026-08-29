/**
 * A rendered praxis body wraps an unbroken string (#2268).
 *
 * `.markdown-preview` carried type-scale rules and no wrapping rule at all, so
 * `normal` wrapping applied — which breaks at word boundaries, and a pasted URL
 * or a keysmash has none. The body then ran straight out of its panel. Reported
 * on an Everymen duel rail; the class is mounted by eleven surfaces (the
 * composer's Preview tab, the duel/collab waiting panel, the Ephemerists
 * composer, and all eight praxis-detail archetypes), so it reproduced on all of
 * them.
 *
 * The seam under test is the STYLESHEET CONTRACT. This harness is
 * `renderToStaticMarkup` with no layout engine, so no test here can observe an
 * overflow (the limitation #1942 records) — what it can pin is that the one
 * shared class declares the one property, which is where all eleven surfaces
 * meet. Verified against the BUILT stylesheet by hand too, per #1941.
 *
 * `anywhere` rather than `break-word`, deliberately: `anywhere` also lets the
 * element's min-content width shrink, so a long token cannot force a flex or
 * grid sibling wider. The duel panels are a two-column pair, where `break-word`
 * would wrap the text and still blow the column out.
 *
 * NOT a licence to break words anywhere in the app — see WORLD_ZERO_STYLE.md
 * (#2000): a faction wordmark is a MARK and must never carry this. It belongs
 * on prose the player typed, which is exactly what this class dresses.
 */
import { describe, it, expect } from "vitest";
import { ruleBodies, stripComments } from "../../../utils/__tests__/cssVars";
import { readIndexCss } from "../../../test/indexCss";

const CSS = stripComments(
  readIndexCss(),
);

describe(".markdown-preview", () => {
  it("wraps an unbroken string rather than overflowing its panel", () => {
    const bodies = ruleBodies(CSS, ".markdown-preview");
    expect(bodies.length, "a bare `.markdown-preview` rule exists").toBe(1);
    expect(bodies[0]).toMatch(/overflow-wrap:\s*anywhere/);
  });

  it("keeps a code block scrolling instead, so a snippet is not broken mid-token", () => {
    // `pre` defaults to `white-space: pre`, which disallows wrapping outright —
    // so the inherited `overflow-wrap` above cannot reach it and the existing
    // `overflow-x-auto` is already the right answer. Pinned because deleting it
    // would silently hand code blocks the prose rule.
    const pre = ruleBodies(CSS, ".markdown-preview pre");
    expect(pre.length).toBe(1);
    expect(pre[0]).toContain("overflow-x-auto");
  });
});
