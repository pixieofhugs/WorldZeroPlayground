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
 * The two invariants this file used to assert here — the fluid 360x300 box
 * (#732) and "names no token family its own task card does not" (#2321) — now
 * live in `everySelectTileWearsItsCardsRegister.test.ts`, derived over all
 * nine kits including the `Default`-backed tile this suite could not reach
 * (#2816). This file keeps everything bespoke to Singularity.
 */
describe("the Singularity tile wears the terminal's register (#2326)", () => {
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
});
