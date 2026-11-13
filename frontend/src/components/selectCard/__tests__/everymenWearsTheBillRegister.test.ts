/**
 * The Everymen tile and its task card name ONE register (#2327). Asked of the
 * NAME: `--everymen-field` equals the bill's red in light and diverges only in
 * dark, so a value check passes too. Register = `EverymenTaskCard` + bindings
 * `EverymenBand` reaches (its `POSTER` alias, #2325); marks are excluded.
 */
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, it, expect } from "vitest";

import { readThemes, resolveVar, stripComments } from "../../../utils/__tests__/cssVars";
import { resolveRoleReads } from '../../../test/sourceScan'
import { readIndexCss } from "../../../test/indexCss";

const read = (relative: string): string =>
  readFileSync(fileURLToPath(new URL(relative, import.meta.url)), "utf8");

/** Comments cite retired names on purpose. */
const code = (relative: string): string => stripComments(read(relative));

const TILE = "../EverymenSelectCard.tsx";

const themes = readThemes(readIndexCss());

/** Box + register invariants live in `everySelectTileWearsItsCardsRegister` (#2816). */
describe("the Everymen tile wears the bill's register (#2327)", () => {
  it("leaves the poster FIELD register off the tile for good", () => {
    // Named, so a failure says which fork came back.
    const source = code(TILE);
    for (const forked of ["--everymen-field", "--everymen-field-deep", "--everymen-cream"]) {
      expect(source, `${forked} is the poster field; the bill prints on the paper`).not.toContain(forked);
    }
    // A structure colour that does not flip; the sheet's ink must.
    expect(
      source,
      "the bill's ink is `--everymen-paper-text`, which flips with the paper",
    ).not.toMatch(/--everymen-ink\b/);
  });

  it("retires nothing: the field register keeps its own reader", () => {
    // `EverymenFactionHero` still paints the field, so it stays declared (#2321).
    const hero = code("../../factionHero/EverymenFactionHero.tsx");
    expect(hero).toContain("--everymen-field");
  });

  it("wears the card's poster face, and it is still Bebas in both cascades", () => {
    // The role token reaches Bebas via `--font-accent`; a repoint would silently
    // change the face. Per cascade: a bare-`:root` alias resolves once (#1839).
    for (const theme of ["light", "dark"] as const) {
      expect(
        resolveVar("--faction-everymen-card-font", theme, themes),
        `the bill's poster face is no longer Bebas in ${theme}`,
      ).toBe('"Bebas Neue", Impact, sans-serif');
    }
    const source = resolveRoleReads(code(TILE));
    expect(source, "the card names the faction's ROLE token").toContain("--faction-everymen-card-font");
    expect(source, "--font-faction-poster is retired, not merely unused here").not.toContain(
      'var(--font-faction-poster)',
    );
  });

  it("mounts the shared burst and draws no second one — #2393", () => {
    // One shared burst (#2195); geometry pinned in `everymenOneBurst.test.tsx`.
    expect(code(TILE), "either the shared burst, or plain — never a new transcription").not.toContain(
      "repeating-conic-gradient",
    );
    expect(code(TILE), "the tile mounts the kit's one ornament").toContain('className="em-burst"');
  });

  it("mounts the shared marks and re-draws neither", () => {
    const source = code(TILE);
    expect(source, "the identity mark is the canonical `EverymenSigil`").toContain("EverymenSigil");
    expect(source, "the furniture cog is the one drawing from #2121").toContain("EverymenCog");
    expect(source, "a surface that spells the cog's path is drawing it twice").not.toContain("EVERYMEN_COG_PATH");
  });
});
