/**
 * THE SEAM: the tile and its task card must name ONE register (#2327).
 *
 * A SOURCE sweep, never a ratio, and Everymen is the clearest case for why. The
 * directory tile printed on `--everymen-field` / `-field-deep` / `--everymen-
 * cream`; the HELP WANTED BILL prints on `--everymen-paper` / `-paper-text`.
 * Both halves are real, declared, measured tokens — `factionContrast.test.ts`
 * has carried `everymen poster field, cream` (4.95 light / 13.14 dark) for as
 * long as it has carried `everymen paper` — so every lint, every census and
 * every contrast sweep passed while the two drifted.
 *
 * AND A VALUE CHECK WOULD HAVE PASSED TOO, in the cascade anyone looks at
 * first: `--everymen-field` is `#c1272d` in light, which is exactly
 * `--everymen-red` and exactly `--faction-everymen-bill-mast`. It diverges only
 * at night (`#3c1416` against `#e2433f` / `#c1272d`). So the question has to be
 * asked of the NAME — does the tile name a token its task card does not? — and
 * a healthy tile's names are a strict SUBSET of its card's.
 *
 * The shape is #2322's, which the sibling tiles copy (#2323-#2329), with the
 * two riders those children paid for:
 *
 *   1. A SYNONYM IS PROVEN, NOT WAIVED. The tile's display face was
 *      `--font-faction-poster` where the card's is
 *      `--faction-everymen-card-font`. That looks like a rename and was one —
 *      but "looks like" is how a fork gets waived, so the two declarations were
 *      resolved and compared, in both cascades, before the swap. The tile was
 *      that alias's LAST reader, so `fontsLoaded.test.ts` then required its
 *      deletion; the live half of the proof is below.
 *   2. RESOLVE THE KIT'S BINDINGS TRANSITIVELY. `EverymenBand` keeps its poster
 *      face in a module-level `POSTER` beside it rather than in its own body —
 *      the same shape that hid half of Coven's register (#2325) — so the
 *      register is gathered by following each binding the band reaches, not by
 *      slicing the function.
 *
 * WHAT COUNTS AS THE TASK CARD'S REGISTER is the card AS RENDERED:
 * `EverymenTaskCard.tsx` plus `EverymenBand` in `cardMasthead/factionBands`,
 * which is where the whole masthead register is spelt. It is NOT "every module
 * the card mounts" — `EverymenCog` and `EverymenSigil` are MARKS, take their
 * paint as props, and a mark's interior is its own business (#2325 drew that
 * edge deliberately after Coven's cauldron nearly pronounced a bad chip legal).
 * `factionBands` holds all nine bands, so the reach starts at `EverymenBand`
 * and goes outward from there: S.N.I.D.E.'s acid is not this faction's
 * register.
 *
 * No DOM — reading the sources is enough, which is well under the harness's
 * `renderToStaticMarkup` ceiling.
 */
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, it, expect } from "vitest";

import { readThemes, resolveVar, stripComments } from "../../../utils/__tests__/cssVars";
import { resolveRoleReads } from '../../../test/sourceScan'

const read = (relative: string): string =>
  readFileSync(fileURLToPath(new URL(relative, import.meta.url)), "utf8");

/** Comments are the decision record and cite the retired names on purpose. */
const code = (relative: string): string => stripComments(read(relative));

const TILE = "../EverymenSelectCard.tsx";

const themes = readThemes(read("../../../index.css"));

/**
 * The two invariants this file used to assert here — the fluid 360x300 box
 * (#732) and "names no token its own task card does not" (#2321) — now live
 * in `everySelectTileWearsItsCardsRegister.test.ts`, derived over all nine
 * kits including the `Default`-backed tile this suite could not reach
 * (#2816). This file keeps everything bespoke to Everymen.
 */
describe("the Everymen tile wears the bill's register (#2327)", () => {
  it("leaves the poster FIELD register off the tile for good", () => {
    // The specific fork, named, so a failure says WHICH one came back. The
    // sweep above would also go quiet if the task card ever gained one of
    // these; this says the tile does not want them either way.
    const source = code(TILE);
    for (const forked of ["--everymen-field", "--everymen-field-deep", "--everymen-cream"]) {
      expect(source, `${forked} is the poster field; the bill prints on the paper`).not.toContain(forked);
    }
    // `--everymen-ink` is the one the card's own head warns about: a near-black
    // STRUCTURE colour that does not flip, where the sheet's ink must.
    expect(
      source,
      "the bill's ink is `--everymen-paper-text`, which flips with the paper",
    ).not.toMatch(/--everymen-ink\b/);
  });

  it("retires nothing: the field register keeps its own reader", () => {
    // Deleting tokens is a consequence, not the rule (#2321, from Snide's four
    // against Singularity's eight-plus). `EverymenFactionHero` still paints the
    // poster field, so the family stays declared and this tile simply stops
    // being a second, contradictory reader of it.
    const hero = code("../../factionHero/EverymenFactionHero.tsx");
    expect(hero).toContain("--everymen-field");
  });

  it("wears the card's poster face, and it is still Bebas in both cascades", () => {
    // Rider 1 (#2321): a synonym is PROVEN, not waived. The tile named
    // `--font-faction-poster`, the card names `--faction-everymen-card-font`.
    // Both resolved to the SAME stack in BOTH cascades, which is what made the
    // swap free — and made the tile that alias's last reader, so
    // `fontsLoaded.test.ts` required its deletion (index.css records why at the
    // hole it left).
    //
    // What survives the deletion is the half that can still go wrong: the role
    // token reaches Bebas through `--font-accent`, and if that indirection is
    // ever repointed the tile silently changes face. Asserted per cascade
    // because an alias declared in a bare `:root` resolves once (#1839).
    for (const theme of ["light", "dark"] as const) {
      expect(
        resolveVar("--faction-everymen-card-font", theme, themes),
        `the bill's poster face is no longer Bebas in ${theme}`,
      ).toBe('"Bebas Neue", Impact, sans-serif');
    }
    // The tile asks for the `face` ROLE; `resolveRoleReads` folds that back to
    // the token the map names, so this still pins the family and not a spelling.
    const source = resolveRoleReads(code(TILE));
    expect(source, "the card names the faction's ROLE token").toContain("--faction-everymen-card-font");
    expect(source, "--font-faction-poster is retired, not merely unused here").not.toContain(
      'var(--font-faction-poster)',
    );
  });

  it("mounts the shared burst and draws no second one — #2393", () => {
    // The tile's own `repeating-conic-gradient` from 50% 34% was one of the
    // Everymen burst geometries #2195 ruled into ONE shared drawing. #2393
    // built it as `.em-burst` in index.css, so the tile wears the class and
    // transcribes nothing. The geometry itself is pinned in
    // `taskCard/__tests__/everymenOneBurst.test.tsx`.
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
