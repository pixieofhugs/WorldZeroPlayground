/**
 * #2361 — the card FRAME as tokens, and the prose it was transcribed from.
 *
 * THE SEAM is `--faction-{key}-card-radius` / `-card-border` against the list
 * that has always owned those numbers: the comment on `frameBase` in
 * `praxisCard/desktop/shared.tsx`. That comment is where the per-faction radius
 * lived — as English — so a component that wanted a faction's shape had to
 * restate it or flatten it, and flattening it is the exact thing the comment
 * exists to forbid.
 *
 * So this test READS THE COMMENT and compares it to the tokens. That is the
 * point of the file and not a cute trick: a token minted from prose drifts the
 * moment either side moves alone, and neither `factionTokensDeclared.test.ts`
 * (which only asks whether a name is declared) nor `factionContrast.test.ts`
 * (which only measures colour) can see a radius that stopped matching its own
 * documentation. Change one and this fails until you change the other — which
 * is a review conversation, which is the whole intent.
 *
 * EIGHT KEYS, NINE VIEWER FACTIONS. `albescent` and `na` both resolve to
 * `default` through `CSS_KEY` (utils/factions.ts), and the comment says so
 * itself — "Default/Albescent 10". Albescent minting no family of its own is
 * ADR-0048 holding: its card is the Default sheet plus two motion overlays,
 * "revealed by a shimmer, never by a colour".
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

/**
 * How a name in the prose maps to a CSS key. Two of these are the reason the
 * list cannot simply be lowercased: the comment calls WOW's radius "chronicle"
 * — the SKIN's name, which ADR-0050 keeps distinct from the spine — and it
 * names Albescent beside Default because they share a row.
 */
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

/**
 * Pull the parenthesised radius list out of `frameBase`'s comment.
 *
 * Deliberately anchored on the SENTENCE ("frame radius is per-faction"), not on
 * a line number or a token name: if that sentence is rewritten away, this
 * throws rather than silently measuring nothing, and a test that measures
 * nothing is the failure mode a prose-backed guard has to avoid.
 */
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
      // Default and Albescent share a row, so one key may be named twice — but
      // only ever with the same number. Two different numbers on one key means
      // the prose itself has drifted, which is worth failing on.
      expect(already ?? value, `prose gives ${key} two radii`).toBe(value);
      radii.set(key, value);
    }
  }
  return radii;
}

const DOCUMENTED = documentedRadii();

/** `0` is unitless in CSS and `0px` would be a needless byte. */
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
        // `factionCssVar(slug, 'card-border')` builds the name by interpolation,
        // so `factionTokensDeclared.test.ts` cannot see it — a missing key would
        // render the whole `border` declaration invalid and drop the frame with
        // every other check still green (#806).
        const raw = resolveVar(`--faction-${key}-card-border`, theme, THEMES);
        expect(raw, `--faction-${key}-card-border is undeclared`).not.toBeNull();
        expect(parseColor(raw as string), `${raw} is not a colour`).not.toBeNull();
      });
    }
  }
});
