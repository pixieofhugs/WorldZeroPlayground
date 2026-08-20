import { readFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
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

/**
 * Inventory of the "frozen theme alias" shape (#1827), and the guard on the
 * scope that unfreezes it (#1839).
 *
 * A token declared **only** at `:root` as `var(--other)`, where `--other` has a
 * `[data-theme="dark"]` override, is not the bug it looks like. `data-theme` is
 * set on `document.documentElement`, so `:root` and `[data-theme="dark"]` match
 * the *same* element; `var()` substitutes at computed-value time against that
 * element's own custom properties, so the alias picks up the dark referent and
 * flips correctly. `cssVars.ts` says the same thing at its own docstring, and
 * WORLD_ZERO_STYLE.md §3 is the ruling that deleted ~1 KB of restated spectrum
 * cuts on exactly that reasoning (#1661). **Restating all of these is a
 * regression, not a fix.**
 *
 * It was a defect inside a **nested** theme wrapper. The app has one:
 * `pages/characterProfile/archetypes/profileSkin.tsx` scopes `data-theme` to
 * the skin container, and the Singularity and S.N.I.D.E. profile bodies set it
 * to `'dark'`. Under the global *light* theme, every alias below used to
 * inherit its already-resolved light value into that subtree while its
 * non-aliased neighbours went dark — a half-flipped surface. Signup carries no
 * faction gate, so any faction's praxis card can render there.
 *
 * **#1839 fixed that with scope rather than restatement.** `[data-theme="dark"]`
 * is a bare attribute selector, so it already matches the nested wrapper; what
 * did not was `:root`, which matches `documentElement` alone. So every alias
 * below is declared on `:root, [data-theme]` — one value, one place, and any
 * element carrying a theme re-declares it and re-substitutes against its own
 * referents. That fixes every wrapper anyone nests later, not just the two that
 * exist today.
 *
 * So this file is an inventory plus a scope guard. The inventory fails when a
 * **new** alias of this shape appears, which forces a decision in review rather
 * than leaving it unnoticed — `factionTokensDeclared.test.ts` polices every
 * `var()` against a declaration and is blind to this, because every token here
 * is perfectly well declared. The scope guard then fails unless that alias is
 * declared where a nested theme can reach it.
 */

const CSS = readFileSync(
  join(fileURLToPath(new URL(".", import.meta.url)), "..", "..", "index.css"),
  "utf-8",
);

/**
 * Aliases known to be root-only, in three families:
 *
 *  - **the na spectrum cuts** (`--faction-default-*`) — declared once on
 *    purpose, WORLD_ZERO_STYLE.md §3 / #1661. Re-cutting the spectrum for dark
 *    is meant to be editing the seven stops and nothing else.
 *  - **card/vote contracts that alias a legacy family** (`--faction-everymen-*`
 *    → `--everymen-*`, `--faction-ua-*`, `--faction-wow-vote-*`,
 *    `--faction-wow-figure`) — the alias *is* the contract, and `cssVars.ts`
 *    names `--faction-everymen-card-bg` as the canonical correct case.
 *  - **composed neutrals** (`--filter-*`, `--label-ink`, `--link-ink*`) —
 *    `color-mix()` off the page ground so there is one declaration to re-tune
 *    rather than two (WORLD_ZERO_STYLE.md §3, #1365).
 *
 * `--faction-default-gold` was a fourth spectrum-cut entry until #1766 (#1822)
 * took it off `--faction-default-stop-3` and gave it a literal in each cascade.
 * It leaves this list by ceasing to be an alias at all — a reminder that the
 * sweep tracks a SHAPE, not a set.
 *
 * A fourth family joined in #2361: **the card FRAME colour**
 * (`--faction-{key}-card-border`). Eight of them were minted so a shared
 * surface — the desktop rail is the first — can ask every faction for its frame
 * in one name instead of reaching into eight private namespaces
 * (`--everymen-frame`, `--faction-coven-slip-border`, `--faction-ua-card-frame`,
 * …). Five of the eight land here and three do not, and the split is the sweep
 * working rather than an inconsistency: WOW's chronicle gold, S.N.I.D.E.'s acid
 * and Singularity's terminal frame are theme-INVARIANT, so those three aliases
 * have no flipping referent to freeze. The alias IS the contract, same ruling as
 * `--faction-everymen-card-bg`.
 *
 * `--faction-wow-stamp-bg` arrived from the other direction. #1827 (PR #1838)
 * restated it under `[data-theme="dark"]` as the one instance that demonstrably
 * rendered in a nested wrapper, which took it out of the sweep by making it not
 * root-only. #1839 fixes the mechanism instead, so the restatement is deleted
 * and the plaque rejoins the list it was always a member of.
 */
const KNOWN_ROOT_ONLY_ALIASES = [
  "--faction-coven-card-border",
  "--faction-default-aurora",
  "--faction-default-card-border",
  "--faction-default-eyebrow-rainbow",
  "--faction-default-rainbow",
  "--faction-default-rainbow-conic",
  "--faction-default-rainbow-loop",
  "--faction-default-rainbow-vertical",
  "--faction-default-total-rainbow",
  // #2141's owner ruling moved the Ephemerists card register off the
  // theme-invariant masthead band and onto the plate's SHEET, so the card
  // GROUND is an alias over a flipping referent — the same shape, and the same
  // resolution, as `--faction-everymen-card-bg` two entries down: the alias IS
  // the contract. The ACCENT rejoined it in the same change; it had been
  // un-aliased earlier in #2141 precisely because the band did not flip, and
  // once the ground moved that hazard went with it.
  "--faction-ephemerists-card-accent",
  "--faction-ephemerists-card-bg",
  "--faction-ephemerists-card-border",
  // #2141 gave `-plate-brass-light` a light half, which turned the Ephemerists
  // graticule into an alias over a flipping referent. This sweep is what said
  // so; the grid moved to `:root, [data-theme]` in the same change.
  "--faction-ephemerists-grid",
  "--faction-everymen-card-accent",
  "--faction-everymen-card-bg",
  "--faction-everymen-card-border",
  "--faction-everymen-card-muted",
  "--faction-everymen-card-text",
  "--faction-ua-card-border",
  "--faction-ua-card-chip-ink",
  "--faction-ua-card-enso",
  "--faction-ua-card-lotus",
  "--faction-ua-card-parchment",
  "--faction-ua-card-rule",
  "--faction-ua-parchment",
  "--faction-ua-vote-core",
  "--faction-ua-vote-halo",
  "--faction-ua-vote-reading",
  "--faction-wow-figure",
  "--faction-wow-stamp-bg",
  "--faction-wow-vote-off",
  "--faction-wow-vote-on",
  "--filter-thumb",
  "--filter-thumb-edge",
  "--filter-well",
  "--label-ink",
  "--link-ink",
  "--link-ink-hover",
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

  /**
   * THE SEAM THIS ISSUE IS ABOUT (#1839) — a scope, not a value.
   *
   * `[data-theme="dark"]` is a bare attribute selector, so it matches the skin
   * container `profileSkin.tsx` renders as readily as it matches `<html>`. The
   * light half did not: `:root` matches `documentElement` and nothing else, so
   * an alias declared there is never RE-DECLARED inside a nested wrapper and
   * therefore never re-substitutes — it inherits the value it already resolved
   * to on the root. Declaring it on `:root, [data-theme]` is the whole fix, and
   * it is a fix no ratio and no value assertion can see. Hence: the sweep's own
   * inventory, checked against the selector that declares it.
   */
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
   * #1838's restatement is now redundant, and #1661's ruling is why it goes.
   * The scope fix reaches this plaque like every other alias, so restating the
   * value under `[data-theme="dark"]` would be a second copy of it on disk.
   */
  it("no longer restates the WOW stamp plaque in dark (#1838 superseded)", () => {
    expect(themes.dark.has("--faction-wow-stamp-bg")).toBe(false);
    expect(resolveVar("--faction-wow-stamp-bg", "dark", themes)).toBe(
      resolveVar("--faction-wow-chronicle-panel", "dark", themes),
    );
    expect(resolveVar("--faction-wow-stamp-bg", "light", themes)).toBe(
      resolveVar("--faction-wow-chronicle-panel", "light", themes),
    );
  });
});
