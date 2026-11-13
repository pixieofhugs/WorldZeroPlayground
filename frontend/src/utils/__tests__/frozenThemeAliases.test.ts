import { describe, expect, it } from "vitest";

import {
  declarationsIn,
  readThemes,
  resolveVar,
  ruleBodies,
  stripComments,
  THEME_SCOPED,
  type VarMap,
} from "./cssVars";
import { readIndexCss } from "../../test/indexCss";

/**
 * Inventory of "frozen theme alias" tokens (#1827) and the scope guard (#1839).
 *
 * A token declared once as `var(--other)` over a flipping referent is correct
 * on `<html>` (computed-value substitution); restating it per theme is a
 * regression (WORLD_ZERO_STYLE.md §3, #1661). It froze only inside a NESTED
 * `data-theme` wrapper (`profileSkin.tsx`), which `:root` alone never matches,
 * so each alias is declared on `:root, [data-theme]`.
 *
 * A new alias of this shape fails the inventory, forcing a review decision.
 */

const CSS = readIndexCss();

/**
 * Aliases ruled root-only, by family: the na spectrum cuts (#1661); card/vote
 * contracts aliasing a legacy family (the alias IS the contract); composed
 * `color-mix()` neutrals (#1365); card frame colours (#2361; theme-invariant
 * frames have no flipping referent and are absent). The sweep tracks a SHAPE,
 * not a set: a token that stops being an alias leaves the list.
 */
const KNOWN_ROOT_ONLY_ALIASES = [
  // Composed neutral (#2486); its literal partner is measured in
  // `disabledControlContrast.test.ts`.
  "--control-off-ink",
  "--faction-coven-card-border",
  // Both themes alias the core (near-duplicate fold): the vote/slip tests name the token.
  "--faction-coven-slip-vio",
  "--faction-default-aurora",
  "--faction-default-card-border",
  // The na sheet (#2497); its literal siblings are in `defaultSheetToken.test.ts`.
  "--faction-default-card-sheet",
  "--faction-default-rainbow",
  "--faction-default-rainbow-conic",
  "--faction-default-rainbow-loop",
  "--faction-default-rainbow-vertical",
  "--faction-default-stamp-bg",
  "--faction-default-total-rainbow",
  // #2141: the card register sits on the plate's flipping sheet.
  "--faction-ephemerists-card-accent",
  "--faction-ephemerists-card-bg",
  "--faction-ephemerists-card-border",
  "--faction-ephemerists-grid",
  // Accent-ink (#2619): for everymen and wow the accent is already safe ink in
  // both cascades. Ratios in `factionContrast.test.ts`.
  "--faction-everymen-accent-ink",
  "--faction-everymen-card-accent",
  "--faction-everymen-card-bg",
  "--faction-everymen-card-border",
  "--faction-everymen-card-muted",
  "--faction-everymen-card-text",
  "--faction-singularity-term-blue-bright",
  "--faction-singularity-term-chrome",
  "--faction-ua-card-border",
  "--faction-ua-card-chip-ink",
  "--faction-ua-card-enso",
  "--faction-ua-card-lotus",
  "--faction-ua-card-parchment",
  "--faction-ua-card-rule",
  "--faction-ua-parchment",
  "--faction-ua-vote-core",
  "--faction-wow-accent-ink", /* #2619 — see the everymen twin above */
  // The near-miss fold (card-muted, pill-border) made these read a flipping core.
  "--faction-wow-avatar-ring",
  "--faction-wow-card-border",
  "--faction-wow-card-muted",
  "--faction-wow-figure",
  "--faction-wow-stamp-bg",
  "--label-ink",
  "--link-ink",
  "--link-ink-hover",
  "--switch-thumb",
  "--switch-thumb-edge",
  "--switch-thumb-off", // #2154
  "--switch-well",
];

const REFERENT = /var\(\s*(--[\w-]+)/g;

/** Root-only tokens whose value reaches at least one token that flips in dark. */
function frozenAliases(themes: Record<"light" | "dark", VarMap>): string[] {
  const hits = [...themes.light]
    .filter(([name]) => !themes.dark.has(name))
    .filter(([, value]) =>
      [...value.matchAll(REFERENT)].some(
        ([, referent]) =>
          resolveVar(referent, "light", themes) !==
          resolveVar(referent, "dark", themes),
      ),
    )
    .map(([name]) => name);
  return hits.sort();
}

describe("root-only aliases over a flipping referent are inventoried (#1827)", () => {
  const themes = readThemes(CSS);

  it("parses both cascades (sanity check — an empty sweep must not pass)", () => {
    expect(themes.light.size).toBeGreaterThan(500);
    expect(themes.dark.size).toBeGreaterThan(250);
    // The shape the sweep is looking for, at a token it must always find.
    expect(themes.light.get("--faction-everymen-card-bg")).toBe(
      "var(--everymen-paper)",
    );
    expect(themes.dark.has("--faction-everymen-card-bg")).toBe(false);
    expect(resolveVar("--everymen-paper", "light", themes)).not.toBe(
      resolveVar("--everymen-paper", "dark", themes),
    );
  });

  it("finds no alias of this shape that has not been ruled on", () => {
    expect(frozenAliases(themes)).toEqual([...KNOWN_ROOT_ONLY_ALIASES].sort());
  });

  /** #1839: a scope, not a value; no ratio or value assertion can see it. */
  it("declares every inventoried alias where a nested [data-theme] reaches it (#1839)", () => {
    const clean = stripComments(CSS);
    const scoped = declarationsIn(ruleBodies(clean, THEME_SCOPED));
    const bare = declarationsIn(ruleBodies(clean, ":root"));

    const aliases = frozenAliases(themes);
    expect(aliases.length).toBeGreaterThan(0);
    for (const name of aliases) {
      expect(
        scoped.has(name),
        `${name} resolves through var() and must be declared on \`${THEME_SCOPED}\`, ` +
          `or it freezes at its light value inside a nested theme wrapper`,
      ).toBe(true);
      expect(
        bare.has(name),
        `${name} is still declared in a bare \`:root\` block — that declaration ` +
          `wins on <html> by source order and re-freezes the alias`,
      ).toBe(false);
    }
  });

  /**
   * The scope fix makes a dark restatement redundant (#1661). The plate aliases
   * the chronicle sheet, not the panel (#2042), in both cascades by resolution.
   */
  it("no longer restates the WOW stamp plate in dark (#1838 superseded)", () => {
    expect(themes.dark.has("--faction-wow-stamp-bg")).toBe(false);
    expect(resolveVar("--faction-wow-stamp-bg", "dark", themes)).toBe(
      resolveVar("--faction-wow-chronicle-bg", "dark", themes),
    );
    expect(resolveVar("--faction-wow-stamp-bg", "light", themes)).toBe(
      resolveVar("--faction-wow-chronicle-bg", "light", themes),
    );
  });
});
