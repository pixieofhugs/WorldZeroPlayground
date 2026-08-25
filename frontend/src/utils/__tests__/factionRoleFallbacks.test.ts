import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

import {
  FACTION_ROLES,
  factionRoleProperty,
  factionRoleVars,
  type FactionGround,
} from "../factionRoles";

/**
 * THE MIGRATION GATE FOR "a faction supplies a MAP, not values" (#2659, lanes
 * #2673 and its siblings).
 *
 * A lane moves a surface off `var(--faction-ua-card-text)` and onto
 * `var(--task-card-ink, var(--faction-ua-card-text))`, spreading
 * `factionRoleVars('ua', 'task-card')` on the surface's root. Every lane owes a
 * COMPUTED-VALUE DIFF proving not one pixel moved, and the frozen four owe a
 * diff with zero rows in it. Written by hand that is a table in a PR body,
 * checked once, by eye, against 136 sites — which is exactly the kind of
 * evidence that rots the day after it is produced.
 *
 * So the diff is computed here instead, from the two things that must agree:
 *
 *  1. the prefix a file DECLARES — `factionRoleVars("<slug>", "<prefix>")`, with
 *     the slug written as a literal, which is the normal case for an archetype
 *     component (`UaTaskCard` is only ever UA);
 *  2. every `var(--<prefix>-<role>, <fallback>)` that file READS.
 *
 * The fallback must be the token the role map resolves to for that slug. When
 * it is, the read is provably a no-op today: the declared value and the fallback
 * are the same string, so it renders the same whether the custom property
 * reaches it or not. When it is not, a lane has repainted a surface while
 * calling it a refactor — the one failure mode #2649 names by name.
 *
 * WHY A BARE READ FAILS TOO. `var(--task-card-ink)` with no fallback compiles,
 * lints, and renders correctly for a UA viewer. For `na` and for Albescent
 * `factionRoleVars` deliberately returns `{}` — nothing is declared — so the
 * declaration becomes invalid and the ink vanishes. Pixel-identity for the
 * unaffiliated viewer is a property of the SHAPE (every read carries today's
 * token), and this is where that shape is held.
 *
 * WHAT IT DOES NOT COVER. A file whose slug is not a literal — `Sidebar.tsx`
 * paints whoever is looking — is skipped, because there is no single expected
 * value to compare against. `factionTokensDeclared.test.ts` still catches an
 * undeclared prefix from the other side, and `factionContrast.test.ts` still
 * measures the pairs. This file answers one question only: did the migration
 * move a value.
 */

const SRC_DIR = join(fileURLToPath(new URL(".", import.meta.url)), "..", "..");
const SOURCE_EXTENSIONS = [".ts", ".tsx"];

/**
 * A surface declaring its prefix with a LITERAL slug and prefix, and optionally
 * a ground. The slug is captured rather than skipped over (which is where this
 * differs from `factionTokensDeclared`'s harvester) because the expected token
 * depends on it.
 */
const DECLARATION =
  /factionRoleVars\(\s*["'`]([\w-]+)["'`]\s*,\s*["'`]([\w-]+)["'`]\s*(?:,\s*["'`](\w+)["'`]\s*)?\)/g;

/**
 * Comments quote these names as prose — this file's own docstring says
 * `var(--task-card-ink, <today's token>)`, which is not a read of anything. The
 * `(?<!:)` is what keeps `https://` from eating the rest of its line.
 */
function stripComments(text: string): string {
  return text.replace(/\/\*[\s\S]*?\*\//g, "").replace(/(?<!:)\/\/[^\n]*/g, "");
}

function collectSourceFiles(directory: string): string[] {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const path = join(directory, entry.name);
    if (entry.isDirectory()) {
      return entry.name === "__tests__" ? [] : collectSourceFiles(path);
    }
    return SOURCE_EXTENSIONS.some((ext) => entry.name.endsWith(ext))
      ? [path]
      : [];
  });
}

/**
 * The inside of the `var(…)` starting at `open`, paren-balanced.
 *
 * A regex cannot do this: the fallback is itself a `var()` — that is the whole
 * point of the shape — and `color-mix(in srgb, var(--x-ink, var(--y)) 10%, …)`
 * nests two deep. Scanning is four lines and cannot be fooled.
 */
function varBody(text: string, open: number): string | null {
  let depth = 0;
  for (let i = open; i < text.length; i += 1) {
    if (text[i] === "(") depth += 1;
    else if (text[i] === ")") {
      depth -= 1;
      if (depth === 0) return text.slice(open + 1, i);
    }
  }
  return null;
}

/** `--x-ink, var(--y)` → `["--x-ink", "var(--y)"]`; no comma → one element. */
function splitTopLevel(body: string): [string, string | null] {
  let depth = 0;
  for (let i = 0; i < body.length; i += 1) {
    if (body[i] === "(") depth += 1;
    else if (body[i] === ")") depth -= 1;
    else if (body[i] === "," && depth === 0) {
      return [body.slice(0, i).trim(), body.slice(i + 1).trim()];
    }
  }
  return [body.trim(), null];
}

interface RoleRead {
  file: string;
  property: string;
  fallback: string | null;
}

interface Surface {
  file: string;
  prefix: string;
  slug: string;
  /** role property → the token `factionRoleVars` declares for it. */
  declared: Record<string, string>;
  reads: RoleRead[];
}

const surfaces: Surface[] = [];

for (const path of collectSourceFiles(SRC_DIR)) {
  const text = stripComments(readFileSync(path, "utf-8"));
  const file = path.slice(SRC_DIR.length + 1).replace(/\\/g, "/");
  for (const [, slug, prefix, ground] of text.matchAll(DECLARATION)) {
    const vars = factionRoleVars(
      slug,
      prefix,
      (ground ?? "sheet") as FactionGround,
    ) as unknown as Record<string, string>;
    const declared = Object.fromEntries(
      FACTION_ROLES.map((role) => [
        factionRoleProperty(prefix, role),
        vars[factionRoleProperty(prefix, role)],
      ]),
    );
    const reads: RoleRead[] = [];
    const names = new Set(Object.keys(declared));
    for (let i = text.indexOf("var("); i !== -1; i = text.indexOf("var(", i + 1)) {
      const body = varBody(text, i + 3);
      if (body === null) continue;
      const [property, fallback] = splitTopLevel(body);
      if (names.has(property)) reads.push({ file, property, fallback });
    }
    surfaces.push({ file, prefix, slug, declared, reads });
  }
}

describe("a migrated role read resolves to the token it replaced (#2659)", () => {
  it("finds the surfaces that declare a role map with a literal slug", () => {
    // A sanity check on the harvester, in the shape `factionTokensDeclared`
    // uses: a regex that silently matches nothing turns every assertion below
    // into a vacuous pass.
    expect(surfaces.length).toBeGreaterThan(0);
    for (const surface of surfaces) {
      expect(Object.keys(surface.declared)).toHaveLength(FACTION_ROLES.length);
    }
  });

  it.each(
    surfaces.flatMap((surface) =>
      surface.reads.map((read) => ({
        ...read,
        prefix: surface.prefix,
        slug: surface.slug,
        expected: surface.declared[read.property],
      })),
    ),
  )(
    "$file reads $property with the $slug token behind it",
    ({ property, fallback, expected }) => {
      // A bare read is invalid for na and Albescent, where nothing is declared.
      expect(fallback, `${property} must carry today's token as a fallback`).not
        .toBeNull();
      expect(fallback).toBe(expected);
    },
  );

  it.each(surfaces)(
    "$file's $prefix map is read by something",
    ({ reads, prefix }) => {
      // Nine properties declared and none read is a migration that landed
      // half-done — no pixel moves, so nothing else notices.
      expect(reads.length, `--${prefix}-* is declared and never read`)
        .toBeGreaterThan(0);
    },
  );
});
