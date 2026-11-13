/**
 * The UA tile and its task card name ONE register (#2324). The quiet case: the
 * tile named only flipping `--faction-ua-*` tokens but reached past the leaf's
 * answers (`-rule` for `-card-frame`, bare `--faction-ua` for the chip, a
 * hand-rolled gradient). A token-grained source sweep catches that.
 */
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, it, expect } from "vitest";

import { stripComments } from "../../../utils/__tests__/cssVars";
import { readIndexCss } from "../../../test/indexCss";

const read = (relative: string): string =>
  readFileSync(fileURLToPath(new URL(relative, import.meta.url)), "utf8");

/** Comments cite retired names on purpose. */
const code = (relative: string): string => stripComments(read(relative));

const TILE = "../UaSelectCard.tsx";

function ctaSource(name: string): string {
  const module = code("../../taskCard/cardCta.ts");
  const at = module.indexOf(`export const ${name}`);
  expect(at, `no \`${name}\` in taskCard/cardCta.ts`).toBeGreaterThan(-1);
  return module.slice(at, module.indexOf("\n};", at));
}

/** Proven equal below, not waived: `-card-parchment` is the praxis-card-only exception's name. */
const GROUND_SYNONYM = ["--faction-ua-parchment", "--faction-ua-card-parchment"] as const;

/** The body of a `--custom-prop: ...;` declaration in index.css, whitespace-flattened. */
function declaration(css: string, name: string): string {
  const at = css.indexOf(`  ${name}:`);
  expect(at, `${name} is not declared in index.css`).toBeGreaterThan(-1);
  return css.slice(at + name.length + 3, css.indexOf(";", at)).replace(/\s+/g, " ").trim();
}

/** Box + register invariants live in `everySelectTileWearsItsCardsRegister` (#2816). */
describe("the UA tile wears the vellum leaf's register (#2324)", () => {
  it("grounds on the leaf's own paper stock, under the name every UA surface may read", () => {
    const css = readIndexCss();
    const [publicName, cardName] = GROUND_SYNONYM;
    expect(code(TILE), "the tile must not read the praxis-card exception's name").not.toContain(cardName);
    expect(code(TILE)).toContain(`var(${publicName})`);
    expect(
      declaration(css, publicName),
      `${publicName} and ${cardName} have drifted — the tile is no longer on the leaf's stock`,
    ).toBe(declaration(css, cardName));
  });

  it("hand-rolls no ground of its own", () => {
    expect(code(TILE), "the paper stock is a token, not a call-site gradient").not.toMatch(
      /linear-gradient|radial-gradient|#[0-9a-f]{3,8}\b|rgba?\(/i,
    );
  });

  it("paints the CTA as the leaf's chip, not as the bare faction fill", () => {
    // The sweep can't see `--faction-ua` (it reaches the register via `uaAtoms`),
    // so pin the chip at the constant (#2818) and sweep the tile for the fill.
    const cta = ctaSource("UA_CARD_CTA");
    expect(cta).toContain("var(--faction-ua-card-chip-bg)");
    expect(cta).toContain("var(--faction-ua-card-chip-ink)");
    expect(code(TILE), "the tile adds no CTA paint of its own").toContain(
      "...UA_CARD_CTA",
    );
    expect(code(TILE), "the bare fill / on-fill pair is the retired CTA").not.toMatch(
      /var\(--faction-ua\)|--faction-ua-on-fill/,
    );
  });

  it("draws the canonical name once, and no second mark beside it (#3138)", () => {
    // Via `redactableText` (#2806), never `factionName`.
    const source = code(TILE);
    expect(source.split('redactableText("factions:names.ua")')).toHaveLength(2);
  });
});
