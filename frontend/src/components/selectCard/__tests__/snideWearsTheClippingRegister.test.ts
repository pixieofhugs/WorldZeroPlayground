/**
 * THE SEAM: the tile and its task card must name ONE token family (#2322).
 *
 * This is a SOURCE sweep, not a ratio, and that is the whole point. S.N.I.D.E.'s
 * directory tile spent this epic painted in `--snide-ink` / `-paper` / `-acid` /
 * `-pink` while its own task card had moved to `--faction-snide-note-*`, which
 * unlike the older family FLIPS. Both halves were real, declared tokens, so
 * NOTHING IN CI COULD SEE THE DRIFT: every lint passed, every census counted
 * them, and `factionContrast.test.ts` dutifully measured both families against
 * the grounds their own documentation named. A forked family is only visible as
 * a pairing in both themes — or, cheaply, as this: does the tile name a family
 * its task card does not?
 *
 * Seven sibling tiles follow this one out of `FactionSelectCard.tsx` (#2321).
 * The rule this file encodes is the one they are all copying, so a sibling that
 * reintroduces the old family here goes red rather than merging green.
 *
 * No DOM: `renderToStaticMarkup` is the harness's ceiling and nothing here even
 * needs that — reading the four sources is enough.
 */
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, it, expect } from "vitest";

import { stripComments } from "../../../utils/__tests__/cssVars";

const read = (relative: string): string =>
  readFileSync(fileURLToPath(new URL(relative, import.meta.url)), "utf8");

/** Comments are the decision record and cite the retired names on purpose. */
const code = (relative: string): string => stripComments(read(relative));

const TILE = "../SnideSelectCard.tsx";

/**
 * THE REGISTER IS THE TASK CARD AS RENDERED, not the one file. `SnideTaskCard`
 * mounts its masthead from `cardMasthead/factionBands` and its wall and its
 * points mark from `factionMarks/snideAtoms`, so two of the register's inks —
 * the bar's ordinal and the walked pink — are spelt in those modules and never
 * in the card. Slicing the card alone would report them as inventions.
 *
 * `factionBands` holds all nine factions' bands, so only `SnideBand`'s own body
 * counts; UA's brass is not S.N.I.D.E.'s register.
 */
function registerSource(): string {
  const bands = code("../../cardMasthead/factionBands.tsx");
  const at = bands.indexOf("function SnideBand()");
  expect(at, "no `SnideBand` in cardMasthead/factionBands.tsx").toBeGreaterThan(-1);
  return [
    code("../../taskCard/SnideTaskCard.tsx"),
    code("../../factionMarks/snideAtoms.tsx"),
    bands.slice(at, bands.indexOf("\n}", at)),
    // The sprayed stencil, which stopped being spelt in the card in #2642: one
    // CTA constant per faction, spread by the card AND by the task detail so
    // the two can no longer drift. Same reach as the band above — the card AS
    // RENDERED — and `cardCta.ts` holds all nine, so only this one's body
    // counts.
    ctaSource("SNIDE_CARD_CTA"),
  ].join("\n");
}

/** One faction's CTA constant, sliced out of the module that holds all eight. */
function ctaSource(name: string): string {
  const module = code("../../taskCard/cardCta.ts");
  const at = module.indexOf(`export const ${name}`);
  expect(at, `no \`${name}\` in taskCard/cardCta.ts`).toBeGreaterThan(-1);
  return module.slice(at, module.indexOf("\n};", at));
}

/** Every custom property named in a source, in document order, deduplicated. */
const propsIn = (source: string): string[] => [
  ...new Set([...source.matchAll(/--[a-z0-9-]+/g)].map((match) => match[0])),
];

describe("the S.N.I.D.E. tile wears the clipping's register (#2322)", () => {
  it("names no token family its own task card does not", () => {
    const register = registerSource();
    const strays = propsIn(code(TILE))
      // House tokens — spacing, the type ramp, radii — are not a faction family
      // and are shared by every tile in the directory.
      .filter((prop) => prop.startsWith("--faction-") || prop.startsWith("--font-") || prop.startsWith("--snide-"))
      .filter((prop) => !register.includes(prop));

    expect(
      strays,
      `Each name is a token the DIRECTORY TILE paints with and the TASK CARD
never names — the shape #2321 calls a forked family. Both halves are real
tokens, so no lint, census or contrast sweep can see it; only this can.
Fix it by finding the \`--faction-snide-note-*\` role that answers the same
question, not by widening this test.`,
    ).toEqual([]);
  });

  it("spells the faces as the faction's own font tokens, not the global names", () => {
    const source = code(TILE);
    for (const [global, faction] of [
      ["--font-faction-anton", "--faction-snide-font-impact"],
      ["--font-faction-typewriter", "--faction-snide-font-type"],
      ["--font-faction-marker", "--faction-snide-font-marker"],
    ] as const) {
      expect(source, `${global} is the raw family; ${faction} is the ROLE`).not.toContain(global);
      expect(source).toContain(faction);
    }
  });

  it("leaves no bare `--snide-*` consumer anywhere in selectCard/", () => {
    // The dispatcher is swept too: it is where the seven siblings land next, and
    // it carried this tile until #2322.
    for (const relative of [TILE, "../FactionSelectCard.tsx", "../DefaultSelectCard.tsx"]) {
      expect(code(relative), `${relative} still reads the retired family`).not.toMatch(/--snide-/);
    }
  });

  it("keeps the retired names undeclared, which is what stops the fork returning", () => {
    const css = read("../../../index.css");
    for (const name of ["--snide-acid", "--snide-ink", "--snide-paper", "--snide-pink"]) {
      expect(css, `${name} is declared again in index.css`).not.toMatch(
        new RegExp(`^\\s*${name}\\s*:`, "m"),
      );
    }
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
});
