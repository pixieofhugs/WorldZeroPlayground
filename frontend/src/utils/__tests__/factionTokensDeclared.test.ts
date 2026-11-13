import { readFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

import { FACTION_ROLES, factionRoleProperty } from "../factionRoles";
import { sourceFiles } from "../../test/sourceScan";
import { readThemes, stripComments } from "./cssVars";
import { readIndexCss } from "../../test/indexCss";

/**
 * Guard for "looks tokenized, is not" (#806, #879): an undeclared `var(--x)`
 * passes every other check and silently invalidates its declaration. Checks
 * every `var(--…)` in `frontend/src`, not just `--faction-*`.
 */

const SRC_DIR = join(fileURLToPath(new URL(".", import.meta.url)), "..", "..");

/** Declared by ANY CSS rule, incl. animation-local properties (#879). */
const DECLARED_IN_CSS = /(?:^|[;{\s])(--[\w-]+)\s*:/g;

/** An inline-style key: `"--x": v`, or the cast form `['--x' as string]: v`. */
const DECLARED_IN_STYLE_OBJECT =
  /["'`](--[\w-]+)["'`](?:\s+as\s+[\w.]+)?\s*\]?\s*:/g;

/** A `var()` reference; the trailing `[,)]` skips interpolated names. */
const REFERENCE = /var\(\s*(--[A-Za-z0-9_-]+)\s*[,)]/g;

// `sourceFiles()` skips `__tests__`, which quote names as prose. `stripComments`
// is the CSS-only stripper (leaves `//`, so `url(https://…)` survives).

function matchAll(text: string, pattern: RegExp): string[] {
  return [...text.matchAll(pattern)].map((match) => match[1]);
}

const sources = sourceFiles({ dir: SRC_DIR, match: /\.(?:tsx?|jsx?|css)$/ }).map((path) => ({
  path,
  text: stripComments(readFileSync(path, "utf-8")),
}));

/**
 * Prefixes passed to `factionRoleVars` (#2659), which declares by interpolation.
 * Exact cross-product (passed prefixes × roles), not "ends in a role name",
 * so a typo like `--rial-ink` is still an orphan.
 */
const ROLE_VARS_PREFIX = /factionRoleVars\(\s*[^,)]+,\s*["'`]([\w-]+)["'`]/g;

const rolePrefixes = new Set(
  sources.flatMap(({ text }) => matchAll(text, ROLE_VARS_PREFIX)),
);

/** Every custom property declared anywhere in the frontend source tree. */
const declared = new Set([
  ...sources.flatMap(({ text }) => [
    ...matchAll(text, DECLARED_IN_CSS),
    ...matchAll(text, DECLARED_IN_STYLE_OBJECT),
  ]),
  ...[...rolePrefixes].flatMap((prefix) =>
    FACTION_ROLES.map((role) => factionRoleProperty(prefix, role)),
  ),
]);

/** Every statically-resolvable `var()` name, with the files that reference it. */
const referenced = new Map<string, string[]>();
for (const { path, text } of sources) {
  for (const name of matchAll(text, REFERENCE)) {
    referenced.set(name, [...(referenced.get(name) ?? []), path]);
  }
}

const orphans = [...referenced.keys()].filter((name) => !declared.has(name));

describe("CSS custom properties are declared before use (#806, #879)", () => {
  // readThemes strips comments, so a mention never counts as declared.
  const themes = readThemes(readIndexCss());
  const factionTokens = new Set(
    [...themes.light.keys(), ...themes.dark.keys()].filter((name) =>
      name.startsWith("--faction-"),
    ),
  );

  it("declares faction tokens in index.css at all (sanity check on the parse)", () => {
    expect(factionTokens.size).toBeGreaterThan(50);
    expect(factionTokens.has("--faction-singularity-card-muted")).toBe(true);
  });

  it("finds the var() references it is meant to police (sanity check on the sweep)", () => {
    expect(referenced.size).toBeGreaterThan(200);
    // The legacy namespace #879 exists to cover.
    expect(referenced.has("--eph-display")).toBe(true);
    expect(declared.has("--eph-display")).toBe(true);
    // An interpolated name must never be harvested as a literal.
    expect(referenced.has("--faction-")).toBe(false);
    // Role vars are reconstructed from real prefixes (#2659).
    expect(rolePrefixes).toContain("rail");
    expect(declared.has("--rail-ink")).toBe(true);
    expect(declared.has("--rial-ink")).toBe(false);
  });

  it("has no var(--…) reference pointing at an undeclared custom property", () => {
    const unexpected = orphans.flatMap((name) =>
      (referenced.get(name) ?? []).map((path) => `${name} in ${path}`),
    );

    expect(unexpected).toEqual([]);
  });
});
