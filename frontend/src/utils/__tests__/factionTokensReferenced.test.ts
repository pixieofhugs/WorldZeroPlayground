import { readFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

import { FACTION_RAINBOW_ORDER, factionCssVar } from "../factions";
import { sourceFiles } from "../../test/sourceScan";
import { stripComments } from "./cssVars";

/**
 * The reverse of `factionTokensDeclared.test.ts` (#2535): every declared
 * faction/spectrum token must be read, since unread tokens are render-blocking
 * bytes. Names built by interpolation (`factionCssVar`, `--spectrum-glow-N`)
 * are generated below via the real resolver.
 *
 * ponytail: test files count as readers, so test-only tokens pass. Upgrade:
 * drop `includeTests: true` and carry survivors as a dated allowlist.
 */

const SRC_DIR = join(fileURLToPath(new URL(".", import.meta.url)), "..", "..");

/** The namespaces this rule polices. Everything else is out of #2535's scope. */
const GOVERNED = /^--(faction|spectrum)-/;

/** Suffixes actually passed to `factionCssVar(slug, suffix)` across the app. */
const DYNAMIC_SUFFIXES = [
  // #2619: reached only via `factionCssVar(slug, 'accent-ink')`, never literally.
  "accent-ink",
  "border",
  "card-accent",
  "card-bg",
  "card-border",
  "card-credit",
  "card-font",
  "card-muted",
  "card-notice",
  "card-radius",
  "card-text",
  "light",
  "on-accent",
  "on-fill",
];

/**
 * Every faction CSS key from the resolver; `na` yields `default`, as does
 * `albescent` (ADR-0039): never mint a `--faction-albescent-*` family for this.
 */
const CSS_KEYS = [
  ...new Set(
    [...FACTION_RAINBOW_ORDER, "na"].map(
      (slug) => factionCssVar(slug).slice("var(".length, -1), // "--faction-<key>"
    ),
  ),
];

/** Names no static sweep can see, because a call site builds them at runtime. */
const DYNAMICALLY_BUILT = new Set([
  ...CSS_KEYS,
  ...CSS_KEYS.flatMap((base) =>
    DYNAMIC_SUFFIXES.map((suffix) => `${base}-${suffix}`),
  ),
  // vote/DefaultVote + vote/AlbescentVote, one per star value.
  ...[1, 2, 3, 4, 5].map((value) => `--spectrum-glow-${value}`),
]);

/** This file is not a reader: its own mentions would keep tokens alive. */
const SELF = fileURLToPath(import.meta.url);

/** A declaration: `--x: value`. Comments are stripped before this runs. */
const DECLARED_IN_CSS = /(?:^|[;{\s])(--[\w-]+)\s*:/g;
/** A `var()` reference; the trailing `[,)]` excludes interpolated names. */
const REFERENCE = /var\(\s*(--[A-Za-z0-9_-]+)\s*[,)]/g;
/** A bare literal — an inline-style key, a `setProperty`, a test's fixture. */
const QUOTED = /["'`](--[A-Za-z0-9_-]+)["'`]/g;

function matchAll(text: string, pattern: RegExp): string[] {
  return [...text.matchAll(pattern)].map((match) => match[1]);
}

/**
 * CSS comments are stripped (a mention is not a read). TS/TSX are read RAW: the
 * CSS stripper mangles `/*` inside strings and regexes. So a JS comment mention
 * counts as a read, the safe direction for a rule that deletes things.
 */
const sources = sourceFiles({
  dir: SRC_DIR,
  includeTests: true,
  match: /\.(?:tsx?|jsx?|css)$/,
})
  .filter((path) => path !== SELF)
  .map((path) => {
    const text = readFileSync(path, "utf-8");
    return { path, text: path.endsWith(".css") ? stripComments(text) : text };
  });

const declared = new Map<string, string>();
for (const { path, text } of sources) {
  if (!path.endsWith(".css")) continue;
  for (const name of matchAll(text, DECLARED_IN_CSS)) {
    if (GOVERNED.test(name) && !declared.has(name)) declared.set(name, path);
  }
}

const referenced = new Set(
  sources.flatMap(({ text }) => [
    ...matchAll(text, REFERENCE),
    ...matchAll(text, QUOTED),
  ]),
);

describe("declared faction/spectrum tokens are read by something (#2535)", () => {
  it("finds the declarations it is meant to police (sanity check on the parse)", () => {
    expect(declared.size).toBeGreaterThan(300);
    expect(declared.has("--faction-singularity-card-muted")).toBe(true);
  });

  it("knows the names only a runtime interpolation can build", () => {
    // albescent and na both land on default.
    expect(CSS_KEYS).toContain("--faction-default");
    expect(CSS_KEYS).not.toContain("--faction-albescent");
    expect(DYNAMICALLY_BUILT.has("--faction-coven-card-bg")).toBe(true);
    // Not literally present anywhere, yet read for every 4-star vote.
    expect(referenced.has("--spectrum-glow-4")).toBe(false);
    expect(DYNAMICALLY_BUILT.has("--spectrum-glow-4")).toBe(true);
  });

  it("has no declared token that nothing reads", () => {
    const unread = [...declared]
      .filter(
        ([name]) => !referenced.has(name) && !DYNAMICALLY_BUILT.has(name),
      )
      .map(([name, path]) => `${name} declared in ${path}, read by nothing`);

    expect(unread).toEqual([]);
  });
});
