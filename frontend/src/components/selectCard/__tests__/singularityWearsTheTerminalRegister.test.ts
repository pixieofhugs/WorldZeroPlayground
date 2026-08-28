/**
 * THE SEAM: the tile and its task card must name ONE token family (#2326).
 *
 * A SOURCE sweep, not a ratio, and that is the whole point — a ratio is exactly
 * what cannot see this bug. The Singularity directory tile spent this epic
 * painted in `--faction-singularity-card-bg` / `-card-text` / `-card-muted` /
 * `-border-hard` / `-phosphor-dim`, every one theme-INVARIANT, while its own
 * task card had long been on `--faction-singularity-term-*`, "a real two-theme
 * contract" whose light half lifts the chassis to #07130c and walks two inks up
 * to pay for it. BOTH halves are real, declared tokens, so nothing in CI could
 * see the drift: every lint passed, every census counted them, and
 * `factionContrast.test.ts` dutifully measured each family against the ground
 * its own documentation named — and both families PASSED, in both themes. A
 * forked family is only visible as a pairing, or, cheaply, as this: does the
 * tile name a family its task card does not?
 *
 * The shape is #2322's, which seven sibling tiles copy (#2323-#2329).
 *
 * No DOM: `renderToStaticMarkup` is the harness's ceiling and nothing here even
 * needs that — reading the sources is enough.
 */
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, it, expect } from "vitest";

import { stripComments } from "../../../utils/__tests__/cssVars";
import { resolveRoleReads } from '../../../test/sourceScan'

const read = (relative: string): string =>
  readFileSync(fileURLToPath(new URL(relative, import.meta.url)), "utf8");

/** Comments are the decision record and cite the retired names on purpose. */
const code = (relative: string): string => stripComments(read(relative));

const TILE = "../SingularitySelectCard.tsx";

/**
 * THE REGISTER IS THE TASK CARD AS RENDERED, not the one file — the same call
 * #2322 had to make. `SingularityTaskCard` mounts its window chrome from
 * `cardMasthead/factionBands` and its points well and process light from
 * `factionMarks/`, and several of the register's inks are spelt only in those:
 * the chrome ground and the hairline rule in the band, and `-term-blue` in
 * {@link SingularityReadout}, which is where #2042 moved it when the well
 * became a shared mark. The card's own file still names it — in a COMMENT,
 * saying it left. Slicing the card alone reports those as inventions.
 *
 * `factionBands` holds all nine factions' bands, so only `SingularityBand`'s own
 * body counts: S.N.I.D.E.'s acid is not Singularity's register.
 */
function registerSource(): string {
  const bands = code("../../cardMasthead/factionBands.tsx");
  const at = bands.indexOf("function SingularityBand()");
  expect(at, "no `SingularityBand` in cardMasthead/factionBands.tsx").toBeGreaterThan(-1);
  return [
    code("../../taskCard/SingularityTaskCard.tsx"),
    code("../../factionMarks/SingularityReadout.tsx"),
    code("../../factionMarks/SingularityProcessLight.tsx"),
    bands.slice(at, bands.indexOf("\n}", at)),
    // The lit key, which stopped being spelt in the card in #2642: one CTA
    // constant per faction, spread by the card AND by the task detail so the
    // two can no longer drift. Same reach as the band above — the card AS
    // RENDERED — and `cardCta.ts` holds all nine, so only this one's body
    // counts.
    ctaSource("SINGULARITY_CARD_CTA"),
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

describe("the Singularity tile wears the terminal's register (#2326)", () => {
  it("names no token family its own task card does not", () => {
    const register = registerSource();
    const strays = propsIn(code(TILE))
      // House tokens — spacing, the type ramp, radii — are not a faction family
      // and are shared by every tile in the directory.
      .filter((prop) => prop.startsWith("--faction-") || prop.startsWith("--font-"))
      .filter((prop) => !register.includes(prop));

    expect(
      strays,
      `Each name is a token the DIRECTORY TILE paints with and the TASK CARD
never names — the shape #2321 calls a forked family. Both halves are real
tokens, so no lint, census or contrast sweep can see it; only this can.
Fix it by finding the \`--faction-singularity-term-*\` role that answers the
same question, not by widening this test.`,
    ).toEqual([]);
  });

  it("leaves no theme-INVARIANT Singularity family on the tile", () => {
    // The named half of the assertion above, spelt out so a failure says WHICH
    // fork returned. These five are the exact names the tile carried before
    // #2326; each is declared identically in `:root` and `[data-theme="dark"]`,
    // which is why a frozen tile could sit on a chassis that lifts by day and
    // no measurement anywhere would report it.
    const source = code(TILE);
    for (const frozen of [
      "--faction-singularity-card-bg",
      "--faction-singularity-card-text",
      "--faction-singularity-card-muted",
      "--faction-singularity-border-hard",
      "--faction-singularity-phosphor-dim",
    ]) {
      expect(source, `${frozen} does not flip; the chassis under it does`).not.toContain(frozen);
    }
  });

  it("spells the face as the faction's ROLE token, not the global family", () => {
    // The inverse of #2322's call: there, the role token named the face
    // directly and the unread global alias was retired. Here
    // `--faction-singularity-card-font` IS an alias to `--font-faction-terminal`,
    // so the family token keeps a reader and only the tile moves.
    // The tile asks for the `face` ROLE; `resolveRoleReads` folds that back to
    // the token the map names, so this still pins the alias and not a spelling.
    const source = resolveRoleReads(code(TILE));
    expect(source, "--font-faction-terminal is the raw family").not.toContain("--font-faction-terminal");
    expect(source).toContain("--faction-singularity-card-font");
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
