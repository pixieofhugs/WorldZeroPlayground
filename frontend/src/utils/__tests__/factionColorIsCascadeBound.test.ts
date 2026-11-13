/**
 * factions.ts owns no colour (#1269): every faction colour is a `var()` resolved
 * by the cascade. A JS hex table drifts and has no dark half by construction.
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

/** Comments (issue refs like `#812` look like hex). */
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
    // 53% = the old `88` hex alpha suffix, via color-mix.
    expect(factionFill("ua", "disc")).toEqual({
      background:
        "linear-gradient(135deg, var(--faction-ua), color-mix(in srgb, var(--faction-ua) 53%, transparent))",
    });
    // na keeps its conic spectrum (ADR-0039).
    expect(factionFill("na", "disc")).toEqual(factionFill("na", "dot"));
  });
});
