/**
 * `.markdown-preview` wraps an unbroken string (#2268); a stylesheet contract,
 * since this harness has no layout engine.
 *
 * `anywhere`, not `break-word`: it also shrinks min-content width, so a long
 * token can't widen a flex/grid sibling (the two-column duel panels). Never on
 * a faction wordmark (STYLE, #2000).
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
    // `pre` (white-space: pre) can't wrap; it must keep `overflow-x-auto`.
    const pre = ruleBodies(CSS, ".markdown-preview pre");
    expect(pre.length).toBe(1);
    expect(pre[0]).toContain("overflow-x-auto");
  });
});
