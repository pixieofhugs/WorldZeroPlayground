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

/**
 * THE REGISTER IS THE TASK CARD AS RENDERED, not the one file. `UaTaskCard`
 * mounts its two faces and its ensō from `factionMarks/uaAtoms` and its
 * masthead from `cardMasthead/factionBands`, so `--faction-ua-card-font` and
 * `--faction-ua-body-font` are spelt in the atoms and never in the card.
 * Slicing the card alone would report them as inventions.
 *
 * `factionBands` holds all nine factions' bands, so only `UaBand`'s own body
 * counts; S.N.I.D.E.'s acid is not UA's register.
 */
function registerSource(): string {
  const bands = code("../../cardMasthead/factionBands.tsx");
  const at = bands.indexOf("function UaBand()");
  expect(at, "no `UaBand` in cardMasthead/factionBands.tsx").toBeGreaterThan(-1);
  return [
    code("../../taskCard/UaTaskCard.tsx"),
    code("../../factionMarks/uaAtoms.tsx"),
    bands.slice(at, bands.indexOf("\n}", at)),
  ].join("\n");
}

/** Every custom property named in a source, in document order, deduplicated. */
const propsIn = (source: string): string[] => [
  ...new Set([...source.matchAll(/--[a-z0-9-]+/g)].map((match) => match[0])),
];

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

describe("the UA tile wears the vellum leaf's register (#2324)", () => {
  it("names no token its own task card does not", () => {
    const register = registerSource();
    const strays = propsIn(code(TILE))
      // House tokens — spacing, the type ramp, radii, the shared cast — are not
      // a faction register and are worn by every tile in the directory.
      .filter((prop) => prop.startsWith("--faction-") || prop.startsWith("--font-"))
      .filter((prop) => prop !== GROUND_SYNONYM[0])
      .filter((prop) => !register.includes(prop));

    expect(
      strays,
      `Each name is a token the DIRECTORY TILE paints with and the TASK CARD
never names — the drift #2321 is about. Both halves are real tokens, so no
lint, census or contrast sweep can see it; only this can. Fix it by finding
the role on \`UaTaskCard.tsx\` that answers the same question, not by
widening this test.`,
    ).toEqual([]);
  });

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
    const source = code(TILE);
    expect(source).toContain("var(--faction-ua-card-chip-bg)");
    expect(source).toContain("var(--faction-ua-card-chip-ink)");
    expect(source, "the bare fill / on-fill pair is the retired CTA").not.toMatch(
      /var\(--faction-ua\)|--faction-ua-on-fill/,
    );
  });

  it("keeps the fluid 360x300 box the directory grid is built on (#732)", () => {
    // Not a colour question, and the one geometry the epic promised not to move:
    // the 375px single-column mobile directory depends on all three.
    const source = code(TILE);
    expect(source).toContain('width: "100%"');
    expect(source).toContain("maxWidth: 360");
    expect(source).toContain("minHeight: 300");
    expect(source, "a fixed height would break the phone column").not.toMatch(/\bheight: 300\b/);
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
