import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

import { FACTION_ROLES, factionRoleProperty } from "../factionRoles";
import { readThemes, stripComments } from "./cssVars";

/**
 * Guard for the "looks tokenized, is not" failure class (#806, widened by #879).
 *
 * `var(--faction-does-not-exist)` passes tsc, eslint and the no-raw-style-values
 * ratchet — a var() reference looks correctly tokenized to every check we run.
 * At runtime the undefined custom property makes the whole declaration invalid
 * (a color-mix() containing it resolves to nothing), so the chrome silently
 * renders with no colour. Only a name-set comparison can catch it.
 *
 * #879: the original guard only walked `--faction-*`, which is the SAFE
 * namespace — those names go through `factionCssVar()`, a chokepoint. The
 * legacy families (`--ua-*`, `--eph-*`, `--everymen-*`, …) are written as bare
 * inline `var()` strings with nothing type-checking them, so that is where the
 * risk actually lives. Four undeclared `--ua-*` font tokens rendered live and
 * invisible for weeks. The guard now checks EVERY `var(--…)` in `frontend/src`.
 */

const SRC_DIR = join(fileURLToPath(new URL(".", import.meta.url)), "..", "..");
const SOURCE_EXTENSIONS = [".ts", ".tsx", ".js", ".jsx", ".css"];

/**
 * A custom property declared by a CSS rule — ANY rule, not just the `:root` /
 * `[data-theme="dark"]` token blocks. Animation-local properties are declared
 * on the element that runs the keyframe (`--ua-spin-dur`, `--ev-spark-delay`),
 * and those are legitimate: #879 calls them out explicitly as non-orphans.
 */
const DECLARED_IN_CSS = /(?:^|[;{\s])(--[\w-]+)\s*:/g;

/**
 * A custom property declared as a React inline-style key. The repo writes these
 * three ways — `"--x": v`, `'--x': v`, and the cast form
 * `['--fc-bg' as string]: skin.bg` that `CredentialCard` uses.
 */
const DECLARED_IN_STYLE_OBJECT =
  /["'`](--[\w-]+)["'`](?:\s+as\s+[\w.]+)?\s*\]?\s*:/g;

/**
 * A `var()` reference. The trailing `[,)]` is load-bearing: it is what excludes
 * names built by string interpolation. `` `var(--faction-${key}-card-${prop})` ``
 * would otherwise be harvested as the bogus name `--faction-`. A dynamic name
 * cannot be checked statically, so we skip it — `factionCssVar()` output is
 * covered by `factions.ts` staying in sync with `index.css` instead.
 */
const REFERENCE = /var\(\s*(--[A-Za-z0-9_-]+)\s*[,)]/g;

function collectSourceFiles(directory: string): string[] {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const path = join(directory, entry.name);
    // Tests never render; they quote token names as prose and fixtures.
    // (This file's own docstring trips the guard otherwise — which is a
    // pleasant demonstration that the guard works.)
    if (entry.isDirectory()) {
      return entry.name === "__tests__" ? [] : collectSourceFiles(path);
    }
    return SOURCE_EXTENSIONS.some((ext) => entry.name.endsWith(ext))
      ? [path]
      : [];
  });
}

/** Comments quote token names as prose; a mention is not a declaration. */
// `stripComments` comes from `cssVars` — the CSS-only stripper, which leaves
// `//` alone. That matters the moment a `url(https://…)` appears.

function matchAll(text: string, pattern: RegExp): string[] {
  return [...text.matchAll(pattern)].map((match) => match[1]);
}

const sources = collectSourceFiles(SRC_DIR).map((path) => ({
  path,
  text: stripComments(readFileSync(path, "utf-8")),
}));

/**
 * A surface's prefix as handed to `factionRoleVars` (#2659).
 *
 * That resolver declares its properties by INTERPOLATION —
 * `--${prefix}-${role}` — so the two harvesters above cannot see them, and
 * every `var(--rail-ink, …)` in the rail became an orphan the moment the
 * literals moved out of `Sidebar.tsx`. It is the same blind spot the
 * `REFERENCE` note describes from the other side.
 *
 * WIDENING THE HARVESTER WOULD HAVE TRADED THE BLIND SPOT, NOT CLOSED IT.
 * "Anything ending in a role name is declared" exempts `--rial-ink` as happily
 * as `--rail-ink`, and a silent typo is the entire failure class this file
 * exists for. So the cross-product below is exact: the prefixes actually passed
 * to the resolver, times the roles it always emits, spelled by the resolver's
 * own {@link factionRoleProperty}. An unpassed prefix is still an orphan, and a
 * role the vocabulary does not have is still an orphan.
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
  // readThemes strips comments and reads both theme blocks, so a token merely
  // *mentioned* in a comment never counts as declared.
  const themes = readThemes(readFileSync(join(SRC_DIR, "index.css"), "utf-8"));
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
    // …and the one interpolated family that IS reconstructed rather than
    // skipped (#2659) is reconstructed from a prefix a real surface passes.
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
