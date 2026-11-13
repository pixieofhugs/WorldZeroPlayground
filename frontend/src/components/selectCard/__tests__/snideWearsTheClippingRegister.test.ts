/**
 * The S.N.I.D.E. tile and its task card name ONE token family (#2322): the tile
 * sat on the old non-flipping `--snide-*` family while the card moved to
 * `--faction-snide-note-*`. Both pass contrast; only a source sweep sees the fork.
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

const TILE = "../SnideSelectCard.tsx";

/** Box + register invariants live in `everySelectTileWearsItsCardsRegister` (#2816). */
describe("the S.N.I.D.E. tile wears the clipping's register (#2322)", () => {
  it("spells the faces as the faction's own font tokens, not the global names", () => {
    const source = code(TILE);
    for (const [global, faction] of [
      ["--font-faction-anton", "--faction-snide-font-black"],
      ["--font-faction-typewriter", "--faction-snide-font-type"],
      ["--font-faction-marker", "--faction-snide-font-marker"],
    ] as const) {
      expect(source, `${global} is the raw family; ${faction} is the ROLE`).not.toContain(global);
      expect(source).toContain(faction);
    }
  });

  it("leaves no bare `--snide-*` consumer anywhere in selectCard/", () => {
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
