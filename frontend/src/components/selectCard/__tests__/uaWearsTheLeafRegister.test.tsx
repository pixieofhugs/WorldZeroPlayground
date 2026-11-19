/**
 * The UA tile and its task card name ONE register (#2324). The quiet case: the
 * tile named only flipping `--faction-ua-*` tokens but reached past the leaf's
 * answers (`-rule` for `-card-frame`, bare `--faction-ua` for the chip, a
 * hand-rolled gradient). Token-grained, off the render.
 */
import { describe, it, expect } from "vitest";

import { readIndexCss } from "../../../test/indexCss";
import { tileMarkup } from "./tileMarkup";

const markup = () => tileMarkup("ua");

/** Proven equal below, not waived: `-card-parchment` is the praxis-card-only exception's name. */
const GROUND_SYNONYM = ["--faction-ua-parchment", "--faction-ua-card-parchment"] as const;

/** The body of a `--custom-prop: ...;` declaration in index.css, whitespace-flattened. */
function declaration(css: string, name: string): string {
  const at = css.indexOf(`  ${name}:`);
  expect(at, `${name} is not declared in index.css`).toBeGreaterThan(-1);
  return css.slice(at + name.length + 3, css.indexOf(";", at)).replace(/\s+/g, " ").trim();
}

describe("the UA tile wears the vellum leaf's register (#2324)", () => {
  it("grounds on the leaf's own paper stock, under the name every UA surface may read", () => {
    const css = readIndexCss();
    const [publicName, cardName] = GROUND_SYNONYM;
    for (const html of markup()) {
      expect(html, "the tile must not read the praxis-card exception's name").not.toContain(cardName);
      expect(html).toContain(`var(${publicName})`);
    }
    expect(
      declaration(css, publicName),
      `${publicName} and ${cardName} have drifted — the tile is no longer on the leaf's stock`,
    ).toBe(declaration(css, cardName));
  });

  it("hand-rolls no ground of its own", () => {
    for (const html of markup()) {
      expect(html, "the paper stock is a token, not a call-site gradient").not.toMatch(
        /linear-gradient|radial-gradient|#[0-9a-f]{3,8}\b|rgba?\(/i,
      );
    }
  });

  it("paints the CTA as the leaf's chip, not as the bare faction fill", () => {
    for (const html of markup()) {
      const call = html.match(/<button[^>]*data-select-slot="call"[^>]*>/)?.[0] ?? "";
      expect(call).toContain("var(--faction-ua-card-chip-bg)");
      expect(call).toContain("var(--faction-ua-card-chip-ink)");
      const painted = html.replace(/--leaf-faction-select-card-[\w-]+:var\([^)]*\);?/g, "");
      expect(painted, "the bare fill / on-fill pair is the retired CTA").not.toMatch(
        /var\(--faction-ua\)|--faction-ua-on-fill/,
      );
    }
  });

  it("draws the canonical name once, and no second mark beside it (#3138)", () => {
    for (const html of markup()) expect(html.split("Unwavering Artisans")).toHaveLength(2);
  });
});
