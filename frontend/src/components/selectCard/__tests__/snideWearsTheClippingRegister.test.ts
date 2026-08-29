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
import { readIndexCss } from "../../../test/indexCss";

const read = (relative: string): string =>
  readFileSync(fileURLToPath(new URL(relative, import.meta.url)), "utf8");

/** Comments are the decision record and cite the retired names on purpose. */
const code = (relative: string): string => stripComments(read(relative));

const TILE = "../SnideSelectCard.tsx";

/**
 * The two invariants this file used to assert here — the fluid 360x300 box
 * (#732) and "names no token family its own task card does not" (#2321) — now
 * live in `everySelectTileWearsItsCardsRegister.test.ts`, derived over all
 * nine kits including the `Default`-backed tile this suite could not reach
 * (#2816). This file keeps everything bespoke to S.N.I.D.E.
 */
describe("the S.N.I.D.E. tile wears the clipping's register (#2322)", () => {
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
    const css = readIndexCss();
    for (const name of ["--snide-acid", "--snide-ink", "--snide-paper", "--snide-pink"]) {
      expect(css, `${name} is declared again in index.css`).not.toMatch(
        new RegExp(`^\\s*${name}\\s*:`, "m"),
      );
    }
  });
});
