import { readFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

import { readThemes, resolveVar, type VarMap } from "./cssVars";

/**
 * Inventory of the "frozen theme alias" shape (#1827).
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
 * It is only a defect inside a **nested** theme wrapper. The app has one:
 * `pages/characterProfile/archetypes/profileSkin.tsx` scopes `data-theme` to
 * the skin container, and the Singularity and S.N.I.D.E. profile bodies set it
 * to `'dark'`. Under the global *light* theme, every alias below inherits its
 * already-resolved light value into that subtree while its non-aliased
 * neighbours go dark — a half-flipped surface. Signup carries no faction gate,
 * so any faction's praxis card can render there.
 *
 * So this file is an inventory rather than a prohibition. It fails when a
 * **new** alias of this shape appears, which forces one of two decisions in
 * review: it is fine at the root and never renders in a nested wrapper (add it
 * here), or it does and needs a `[data-theme="dark"]` restatement (the #1827
 * fix for `--faction-wow-stamp-bg`). What it must never be is unnoticed —
 * `factionTokensDeclared.test.ts` polices every `var()` against a declaration
 * and is blind to this, because every token here is perfectly well declared.
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
 */
const KNOWN_ROOT_ONLY_ALIASES = [
  "--faction-default-aurora",
  "--faction-default-eyebrow-rainbow",
  "--faction-default-gold",
  "--faction-default-rainbow",
  "--faction-default-rainbow-conic",
  "--faction-default-rainbow-loop",
  "--faction-default-rainbow-vertical",
  "--faction-default-total-rainbow",
  "--faction-everymen-card-accent",
  "--faction-everymen-card-bg",
  "--faction-everymen-card-muted",
  "--faction-everymen-card-text",
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

  it("restates the WOW stamp plaque in dark, because it renders in a nested wrapper", () => {
    expect(themes.dark.get("--faction-wow-stamp-bg")).toBe(
      "var(--faction-wow-chronicle-panel)",
    );
    expect(resolveVar("--faction-wow-stamp-bg", "dark", themes)).toBe(
      resolveVar("--faction-wow-chronicle-panel", "dark", themes),
    );
  });
});
