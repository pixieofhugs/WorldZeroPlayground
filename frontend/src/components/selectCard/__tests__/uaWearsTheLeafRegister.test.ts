/**
 * THE SEAM: the tile and its task card must name ONE register (#2324).
 *
 * This is a SOURCE sweep, not a ratio, and that is the whole point — the same
 * shape `snideWearsTheClippingRegister.test.ts` set for #2322. A ratio cannot
 * see a register drift, because both halves are real declared tokens: every
 * lint passes, every census counts them, and `factionContrast.test.ts` measures
 * both against the grounds their own documentation names.
 *
 * UA IS THE QUIET CASE, and it is why the guard is worth having on a faction
 * with no fork at all. S.N.I.D.E.'s tile named a whole retired family; UA's
 * named only `--faction-ua-*` tokens, all of which flip, so nothing looked
 * wrong. What it actually did was reach PAST the leaf's answers to lower-level
 * pieces of the same kit — the neutral `-rule` where the card is bound in
 * `-card-frame`, the bare `--faction-ua` fill where the card had already
 * decided the button is a chip — and hand-roll a gradient the kit names. A
 * family-granular check would have called that clean. Asking "does the tile
 * name a token its task card does not?" catches it.
 *
 * No DOM: `renderToStaticMarkup` is the harness's ceiling and nothing here even
 * needs that — reading the sources is enough.
 */
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, it, expect } from "vitest";

import { stripComments } from "../../../utils/__tests__/cssVars";

const read = (relative: string): string =>
  readFileSync(fileURLToPath(new URL(relative, import.meta.url)), "utf8");

/** Comments are the decision record and cite the retired names on purpose. */
const code = (relative: string): string => stripComments(read(relative));

const TILE = "../UaSelectCard.tsx";

/** One faction's CTA constant, sliced out of the module that holds all eight. */
function ctaSource(name: string): string {
  const module = code("../../taskCard/cardCta.ts");
  const at = module.indexOf(`export const ${name}`);
  expect(at, `no \`${name}\` in taskCard/cardCta.ts`).toBeGreaterThan(-1);
  return module.slice(at, module.indexOf("\n};", at));
}

/**
 * The one SYNONYM, and it is proven below rather than waived.
 *
 * The leaf grounds on `--faction-ua-card-parchment`, which lives inside the
 * praxis-card-only exception block index.css asks in writing not to widen; that
 * block names `--faction-ua-parchment` for any other UA surface and declares it
 * as the same three-stop stock. A fixture that merely trusts a synonym stops
 * measuring the site the day one of the two moves, so the pair gets its own
 * assertion that the two declarations are equal.
 */
const GROUND_SYNONYM = ["--faction-ua-parchment", "--faction-ua-card-parchment"] as const;

/** The body of a `--custom-prop: ...;` declaration in index.css, whitespace-flattened. */
function declaration(css: string, name: string): string {
  const at = css.indexOf(`  ${name}:`);
  expect(at, `${name} is not declared in index.css`).toBeGreaterThan(-1);
  return css.slice(at + name.length + 3, css.indexOf(";", at)).replace(/\s+/g, " ").trim();
}

/**
 * The two invariants this file used to assert here — the fluid 360x300 box
 * (#732) and "names no token its own task card does not" (#2321) — now live
 * in `everySelectTileWearsItsCardsRegister.test.ts`, derived over all nine
 * kits including the `Default`-backed tile this suite could not reach
 * (#2816). This file keeps everything bespoke to UA.
 */
describe("the UA tile wears the vellum leaf's register (#2324)", () => {
  it("grounds on the leaf's own paper stock, under the name every UA surface may read", () => {
    const css = read("../../../index.css");
    const [publicName, cardName] = GROUND_SYNONYM;
    expect(code(TILE), "the tile must not read the praxis-card exception's name").not.toContain(cardName);
    expect(code(TILE)).toContain(`var(${publicName})`);
    expect(
      declaration(css, publicName),
      `${publicName} and ${cardName} have drifted — the tile is no longer on the leaf's stock`,
    ).toBe(declaration(css, cardName));
  });

  it("hand-rolls no ground of its own", () => {
    // The defect this tile actually had: a two-stop `linear-gradient(160deg,
    // -lift, -card-bg 60%)` written at the call site, where the kit names a
    // three-stop stock. An inline gradient is a register invented in a `.tsx`.
    expect(code(TILE), "the paper stock is a token, not a call-site gradient").not.toMatch(
      /linear-gradient|radial-gradient|#[0-9a-f]{3,8}\b|rgba?\(/i,
    );
  });

  it("paints the CTA as the leaf's chip, not as the bare faction fill", () => {
    // `--faction-ua` is a FILL and reaches the register through `uaAtoms`'
    // ink column, so the sweep above cannot see it here. The card had already
    // decided this control is a chip; pin that decision directly.
    //
    // READ AT THE CONSTANT SINCE #2818, for the reason the S.N.I.D.E. and
    // Singularity files already read theirs there: the tile spreads
    // `UA_CARD_CTA` and adds no paint, so the chip pair is spelt once. The tile
    // is still swept for the retired fill — that half is about what the TILE may
    // not say, and it stays where it can go wrong.
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

  it("draws the wordmark, not the faction name (#2332)", () => {
    // `names.ua` became "Unwavering Artisans", the longest in the game; this
    // tile's display type is the letterspaced two-glyph mark, a separate key.
    const source = code(TILE);
    expect(source).toContain('i18n.t("feed:factionSelect.ua.wordmark")');
    expect(source, "factionName() would draw the 19-character name in 42px display type").not.toContain(
      "factionName",
    );
  });
});
