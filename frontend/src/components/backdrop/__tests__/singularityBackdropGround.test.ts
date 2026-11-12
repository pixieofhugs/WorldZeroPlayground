/**
 * The Singularity page ground follows the card on it (#2039). Two claims: a
 * source scan (only `-term-*` tokens, so the next repoint can't leave the
 * ground behind), and a value claim — contrast manifests can't see two GROUNDS
 * collapsing onto one value (WORLD_ZERO_STYLE §3, #1449).
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
    // Comments stripped: the docblock may name retired tokens (#1208).
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
    // A theme-invariant page under a flipping card is the bug this reverses.
    const light = resolveVar(PAGE, "light", THEMES);
    const dark = resolveVar(PAGE, "dark", THEMES);
    expect(dark, "the dark cascade restates the page ground").not.toBe(light);
  });
});
