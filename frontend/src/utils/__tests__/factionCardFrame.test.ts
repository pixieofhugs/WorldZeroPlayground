/**
 * #2361: card radius/border tokens vs. the radius list in `frameBase`'s comment
 * (`praxisCard/desktop/shared.tsx`). This test READS THAT COMMENT, so the two
 * can't drift apart. Eight keys: `albescent` and `na` both map to `default`
 * (ADR-0048).
 */
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

import { parseColor } from "../contrast";
import { readThemes, resolveVar, type Theme } from "./cssVars";
import { readIndexCss } from "../../test/indexCss";

const THEMES = readThemes(readIndexCss());
const BOTH_THEMES: Theme[] = ["light", "dark"];

const SHARED_PATH = fileURLToPath(
  new URL("../../components/praxisCard/desktop/shared.tsx", import.meta.url),
);

/** The eight CSS keys `factionCssVar` can resolve a slug to. */
const CARD_KEYS = [
  "ua",
  "wow",
  "everymen",
  "coven",
  "snide",
  "ephemerists",
  "singularity",
  "default",
] as const;

/** Prose name → CSS key ("chronicle" is WOW's skin name, ADR-0050). */
const PROSE_NAME_TO_KEY: Record<string, (typeof CARD_KEYS)[number]> = {
  snide: "snide",
  everymen: "everymen",
  ua: "ua",
  singularity: "singularity",
  ephemerists: "ephemerists",
  chronicle: "wow",
  default: "default",
  albescent: "default",
  coven: "coven",
};

/** Anchored on the sentence "frame radius is per-faction"; throws if it's gone. */
function documentedRadii(): Map<(typeof CARD_KEYS)[number], number> {
  const source = readFileSync(SHARED_PATH, "utf-8");
  const match = /frame radius is per-faction[\s\S]{0,400}?\(([\s\S]*?)\)/.exec(source);
  if (match === null) {
    throw new Error(
      `No per-faction radius list found in ${SHARED_PATH}. If frameBase's comment ` +
        "was rewritten, this guard has to follow it — do not delete the guard.",
    );
  }
  // The list spans three `//` lines; flatten it back to one sentence.
  const list = match[1].replace(/\/\//g, " ").replace(/\s+/g, " ").trim();

  const radii = new Map<(typeof CARD_KEYS)[number], number>();
  for (const segment of list.split("·")) {
    const number = /(\d+)\s*$/.exec(segment.trim());
    if (number === null) continue;
    const value = Number(number[1]);
    for (const [name, key] of Object.entries(PROSE_NAME_TO_KEY)) {
      if (!new RegExp(`\\b${name}`, "i").test(segment)) continue;
      const already = radii.get(key);
      // A key named twice must carry one number.
      expect(already ?? value, `prose gives ${key} two radii`).toBe(value);
      radii.set(key, value);
    }
  }
  return radii;
}

const DOCUMENTED = documentedRadii();

const expectedRadius = (value: number): string => (value === 0 ? "0" : `${value}px`);

describe("the per-faction frame radius is a token, not a comment (#2361)", () => {
  it("the prose still names every card key", () => {
    expect([...DOCUMENTED.keys()].sort()).toEqual([...CARD_KEYS].sort());
  });

  for (const key of CARD_KEYS) {
    it(`--faction-${key}-card-radius is what frameBase documents`, () => {
      const documented = DOCUMENTED.get(key);
      expect(documented, `frameBase's comment names no radius for ${key}`).not.toBeUndefined();
      expect(resolveVar(`--faction-${key}-card-radius`, "light", THEMES)).toBe(
        expectedRadius(documented as number),
      );
    });
  }

  it("the radii are theme-invariant — a shape has no dark half", () => {
    for (const key of CARD_KEYS) {
      expect(
        resolveVar(`--faction-${key}-card-radius`, "dark", THEMES),
        `${key} radius flips with the theme`,
      ).toBe(resolveVar(`--faction-${key}-card-radius`, "light", THEMES));
    }
  });
});

describe("every card key answers for its frame colour (#2361)", () => {
  for (const theme of BOTH_THEMES) {
    for (const key of CARD_KEYS) {
      it(`--faction-${key}-card-border resolves to a colour (${theme})`, () => {
        // Interpolated name, invisible to factionTokensDeclared; missing drops
        // the whole border (#806).
        const raw = resolveVar(`--faction-${key}-card-border`, theme, THEMES);
        expect(raw, `--faction-${key}-card-border is undeclared`).not.toBeNull();
        expect(parseColor(raw as string), `${raw} is not a colour`).not.toBeNull();
      });
    }
  }
});
