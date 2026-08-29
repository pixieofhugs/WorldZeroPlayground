/**
 * factions.ts owns no colour (#1269).
 *
 * The JS registry used to carry a parallel hex table that a docblock asked
 * humans to keep in sync with index.css. It drifted, silently and for a long
 * time: `ua` was `#c2541f` in JS and `#c24a18` in CSS, and `#c2541f` is verbatim
 * `--faction-default-stop-2` — the unaffiliated spectrum's orange. So every
 * surface that read the JS side painted a UA player in na's hue.
 *
 * A guard on the two tables matching would have caught that one drift and
 * nothing else, because a hex literal has NO dark half by construction: the
 * `[data-theme="dark"]` lift (`--faction-ua: #e8703a`) could never reach a JS
 * string no matter how faithfully the light values were mirrored.
 *
 * The fix was to delete the second table. Every faction colour JS hands to a
 * style is now a `var()` reference resolved by the cascade, which is what these
 * assertions pin: not "the two agree" but "there is only one".
 */
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

import { factionCssVar, factionFill, getAllFactions } from "../factions";
import { readThemes, resolveVar } from "./cssVars";
import { readIndexCss } from "../../test/indexCss";

const SRC_DIR = join(fileURLToPath(new URL(".", import.meta.url)), "..", "..");
const themes = readThemes(readIndexCss());

/** Block and line comments — issue refs like `#812` live there, legitimately. */
const COMMENT = /\/\*[\s\S]*?\*\/|\/\/[^\n]*/g;
const HEX = /#[0-9a-fA-F]{3,8}\b/;

const SLUGS = getAllFactions().map((faction) => faction.slug);

describe("faction colour is bound to the cascade, not duplicated in JS", () => {
  it("declares no colour literal of its own", () => {
    const source = readFileSync(
      join(SRC_DIR, "utils", "factions.ts"),
      "utf-8",
    ).replace(COMMENT, "");
    expect(source).not.toMatch(HEX);
  });

  it("resolves every faction's primary accent in BOTH themes", () => {
    // The half a sync guard could not fix. A hex literal has one value; these
    // names have two, and a JS consumer now gets whichever the theme is in.
    for (const slug of [...SLUGS, "na", "albescent"]) {
      const reference = factionCssVar(slug);
      expect(reference, slug).toMatch(/^var\(--faction-[\w-]+\)$/);
      const name = reference.slice(4, -1);
      expect(resolveVar(name, "light", themes), `${slug} light`).toMatch(HEX);
      expect(resolveVar(name, "dark", themes), `${slug} dark`).toMatch(HEX);
    }
  });

  it("lifts every faction accent for dark — including the unaffiliated grey", () => {
    for (const slug of [...SLUGS, "na"]) {
      const name = factionCssVar(slug).slice(4, -1);
      expect(resolveVar(name, "light", themes), slug).not.toBe(
        resolveVar(name, "dark", themes),
      );
    }
  });

  it("builds the monogram disc out of the faction's own token", () => {
    // The one string-math site: `linear-gradient(135deg, ${hex}, ${hex}88)`
    // repeated verbatim in three feed cards. `88` is 53% alpha; color-mix says
    // the same thing about a var() that a suffix could only say about a hex.
    expect(factionFill("ua", "disc")).toEqual({
      background:
        "linear-gradient(135deg, var(--faction-ua), color-mix(in srgb, var(--faction-ua) 53%, transparent))",
    });
    // na keeps the conic spectrum it already had on this disc (ADR-0039).
    expect(factionFill("na", "disc")).toEqual(factionFill("na", "dot"));
  });
});
