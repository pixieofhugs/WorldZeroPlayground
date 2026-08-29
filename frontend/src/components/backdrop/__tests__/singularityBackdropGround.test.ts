/**
 * The Singularity page ground follows the card that sits on it (#2039).
 *
 * THE SEAM: the token family `SingularityBackdrop` paints, against the family
 * the v3 `SingularityTaskCard` grounds on. Both mount together — the faction
 * page and a Singularity player's profile are the only two routes
 * `useFactionBackdrop` reaches, and both stack `<TaskCard>` on the backdrop.
 *
 * WHAT WENT WRONG. The backdrop was written against `--faction-singularity-card-*`
 * plus `-border-hard`, a family that is theme-INVARIANT ("Singularity is
 * always-dark", the old docblock). Task cards v3 grounds the chassis on
 * `--faction-singularity-term-*`, which is a two-theme contract — seventeen of
 * its nineteen members are restated under `[data-theme="dark"]` with different
 * values (WORLD_ZERO_STYLE §3, "A faction that goes dark in light mode"). So
 * the page stopped moving when the card moved, in both directions at once:
 *
 *   • LIGHT drew the page in `--faction-singularity-card-bg` #050f08, which is
 *     the DARK chassis's value, under a light chassis of #07130c.
 *   • DARK drew the page in that same #050f08 — the dark chassis's value
 *     exactly. Card and page were ΔE 0.0 apart, so the chassis had no fill
 *     separation from the desk at all.
 *
 * TWO CLAIMS, because either alone is passable while the bug is live. The
 * vocabulary claim is a source scan (the shape #1208's retirement guard uses):
 * nothing in this file may reach outside the terminal family, or the next
 * repoint of `-term-*` silently leaves the ground behind again. The value claim
 * is a non-ratio assertion of the kind WORLD_ZERO_STYLE §3 asks for after
 * #1449 — a contrast manifest measures an ink against a ground and is blind to
 * two GROUNDS collapsing onto one value, which is exactly what happened here.
 */
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

import { parseColor, relativeLuminance } from "../../../utils/contrast";
import { readThemes, resolveVar, stripComments, type Theme } from "../../../utils/__tests__/cssVars";
import { readIndexCss } from "../../../test/indexCss";

const BACKDROP_PATH = fileURLToPath(new URL("../SingularityBackdrop.tsx", import.meta.url));

const THEMES = readThemes(readIndexCss());
const BOTH: Theme[] = ["light", "dark"];

/** The ground the backdrop paints, and the chassis the v3 task card paints. */
const PAGE = "--faction-singularity-term-page";
const CHASSIS = "--faction-singularity-term-bg";

function luminanceOf(token: string, theme: Theme): number {
  const declared = resolveVar(token, theme, THEMES);
  expect(declared, `${token} is declared in ${theme}`).toBeTruthy();
  const parsed = parseColor(declared as string);
  expect(parsed, `${token} resolves to a solid colour in ${theme}`).toBeTruthy();
  return relativeLuminance(parsed!);
}

describe("Singularity backdrop follows its card (#2039)", () => {
  it("paints only the terminal family the v3 card grounds on", () => {
    // Comments are stripped first: this file's own docblock names the retired
    // tokens, and #1208 records that a docstring explaining what a file is NOT
    // painting is the commonest false positive for a scan like this.
    const source = stripComments(readFileSync(BACKDROP_PATH, "utf8"));
    const read = [...source.matchAll(/--faction-singularity-[\w-]+/g)].map((m) => m[0]);

    expect(read.length, "the backdrop still paints in tokens").toBeGreaterThan(0);
    for (const token of read) {
      expect(token, `${token} is outside --faction-singularity-term-*`).toMatch(
        /^--faction-singularity-term-/,
      );
    }
  });

  it("keeps the desk deeper than the chassis in BOTH themes", () => {
    for (const theme of BOTH) {
      const page = luminanceOf(PAGE, theme);
      const chassis = luminanceOf(CHASSIS, theme);
      expect(
        page,
        `${theme}: the page ground must sit below the chassis the card paints, ` +
          `or the card has no fill separation from the desk it stands on`,
      ).toBeLessThan(chassis);
    }
  });

  it("gives the page a value of its own per theme, never one frozen black", () => {
    // The failure this reverses: a theme-invariant ground under a card that
    // flips. If the two themes ever resolve the page to one value again, the
    // light page is once more painted in the dark chassis's colour.
    const light = resolveVar(PAGE, "light", THEMES);
    const dark = resolveVar(PAGE, "dark", THEMES);
    expect(dark, "the dark cascade restates the page ground").not.toBe(light);
  });
});
