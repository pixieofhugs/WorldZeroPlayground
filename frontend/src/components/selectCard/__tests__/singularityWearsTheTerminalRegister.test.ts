/**
 * The Singularity tile and its task card name ONE token family (#2326). The
 * tile sat on theme-INVARIANT `card-*` tokens while the card used the flipping
 * `term-*` contract; both pass contrast, so only a source sweep sees the fork.
 */
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, it, expect } from "vitest";

import { stripComments } from "../../../utils/__tests__/cssVars";
import { resolveRoleReads } from '../../../test/sourceScan'

const read = (relative: string): string =>
  readFileSync(fileURLToPath(new URL(relative, import.meta.url)), "utf8");

/** Comments cite retired names on purpose. */
const code = (relative: string): string => stripComments(read(relative));

const TILE = "../SingularitySelectCard.tsx";

/** Box + register invariants live in `everySelectTileWearsItsCardsRegister` (#2816). */
describe("the Singularity tile wears the terminal's register (#2326)", () => {
  it("leaves no theme-INVARIANT Singularity family on the tile", () => {
    // Named, so a failure says which fork returned; each is theme-invariant.
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
    // `-card-font` aliases `--font-faction-terminal`; `resolveRoleReads` folds
    // the `face` role back to it.
    const source = resolveRoleReads(code(TILE));
    expect(source, "--font-faction-terminal is the raw family").not.toContain("--font-faction-terminal");
    expect(source).toContain("--faction-singularity-card-font");
  });
});
