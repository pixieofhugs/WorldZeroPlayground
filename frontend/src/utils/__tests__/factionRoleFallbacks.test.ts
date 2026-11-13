import { readFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

import { factionCssVar, isKnownFaction } from "../factions";
import {
  FACTION_ROLES,
  factionRoleProperty,
  factionRoleVar,
  type FactionGround,
  type FactionRole,
} from "../factionRoles";
import { sourceFiles } from "../../test/sourceScan";

/**
 * Whether a role read (`var(--<prefix>-<role>)` under a `factionRoleVars` map)
 * may carry a fallback, derived from source with no surface table (#2659,
 * #2689). Since #2690 (ADR-0089) the map emits for every slug, so:
 *
 *  1. BAN a fallback wherever the surface does not withhold the map: unreachable.
 *  2. REQUIRE one in a surface that withholds it ({@link SELF_GUARDED}).
 *  3. PIN a required fallback that names a faction token to what the map answers
 *     for an unaffiliated viewer, so it is provably a no-op (#2649). Neutral-tier
 *     fallbacks (per-site `quiet`) are legitimate and not pinned.
 *
 * A read is identified by a prefix the file itself declares, never by the role
 * word (`SnidePraxisCard`'s `--snd-praxis-*` is a parent channel). No exception
 * list; do not add one. Rendering is `factionContrast.test.ts`'s job;
 * undeclared prefixes are `factionTokensDeclared.test.ts`'s.
 */

const SRC_DIR = join(fileURLToPath(new URL(".", import.meta.url)), "..", "..");
/** TS/TSX source, excluding a test file even where one is not under `__tests__`. */
const SOURCE_MATCH = /^(?!.*\.test\.).*\.tsx?$/;

/** A map declared with both slug and prefix written out, optionally a ground. */
const LITERAL_DECLARATION =
  /factionRoleVars\(\s*["'`]([\w-]+)["'`]\s*,\s*["'`]([\w-]+)["'`]\s*(?:,\s*["'`](\w+)["'`]\s*)?\)/g;

/** A map whose slug is a variable (`Sidebar` paints whoever is looking). */
const DYNAMIC_DECLARATION =
  /factionRoleVars\(\s*([A-Za-z_$][\w$]*(?:[.?]\w+)*)\s*,\s*["'`]([\w-]+)["'`]\s*(?:,\s*["'`](\w+)["'`]\s*)?\)/g;

const UNAFFILIATED = "na";

/**
 * The one surface that withholds the map (owner ruling on #2690; ADR-0089): the
 * `chrome` rail shows an unaffiliated viewer the app's three neutral ink tiers,
 * not the `default` family's two. `railFaceVars` returns `{}` before
 * `factionRoleVars`; the guard is asserted from source below.
 */
const SELF_GUARDED = ["components/layout/Sidebar.tsx"];

/**
 * `if (!isKnownFaction(slug)) return {}`. Narrow on purpose:
 * `DefaultProfileBody.tsx` calls `isKnownFaction` for content, not withholding.
 */
const WITHHOLDING_GUARD = /if\s*\(\s*!\s*isKnownFaction\([^)]*\)\s*\)\s*return\s*\{\s*\}/;

/** Core suffixes a role owns; a map-declaring file should not name them directly. */
const CORE_SUFFIXES = [
  "card-bg",
  "card-text",
  "card-muted",
  "card-border",
  "card-accent",
  "on-fill",
  "card-radius",
  "card-font",
];

/** Comments quote these names as prose; `(?<!:)` spares `https://`. */
function stripComments(text: string): string {
  return text.replace(/\/\*[\s\S]*?\*\//g, "").replace(/(?<!:)\/\/[^\n]*/g, "");
}

/** The inside of the `var(…)` at `open`, paren-balanced (fallbacks nest). */
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
  prefix: string;
  property: string;
  role: FactionRole;
  fallback: string | null;
  /** What the map answers for this role on this ground. */
  expected: string;
}

interface Surface {
  file: string;
  prefix: string;
  /** The literal slug, or the identifier text where the slug is a variable. */
  slug: string;
  ground: FactionGround;
  literal: boolean;
  /** Clauses 2-3 (withholds the map) vs clause 1. */
  withheld: boolean;
  text: string;
  reads: RoleRead[];
}

function harvest(): Surface[] {
  const surfaces: Surface[] = [];
  for (const path of sourceFiles({ dir: SRC_DIR, match: SOURCE_MATCH })) {
    const text = stripComments(readFileSync(path, "utf-8"));
    const file = path.slice(SRC_DIR.length + 1).replace(/\\/g, "/");

    const declarations: Array<[string, string, string, boolean]> = [];
    for (const [, slug, prefix, ground] of text.matchAll(LITERAL_DECLARATION)) {
      declarations.push([slug, prefix, ground ?? "sheet", true]);
    }
    for (const [, slug, prefix, ground] of text.matchAll(DYNAMIC_DECLARATION)) {
      declarations.push([slug, prefix, ground ?? "sheet", false]);
    }

    for (const [slug, prefix, ground, literal] of declarations) {
      // A dynamic slug reaches its fallback only for an unaffiliated viewer.
      const answersFor = literal ? slug : UNAFFILIATED;
      const withheld = SELF_GUARDED.includes(file);
      const byProperty = new Map<string, { role: FactionRole; expected: string }>();
      for (const role of FACTION_ROLES) {
        byProperty.set(factionRoleProperty(prefix, role), {
          role,
          expected: factionRoleVar(answersFor, role, ground as FactionGround),
        });
      }

      const reads: RoleRead[] = [];
      for (let i = text.indexOf("var("); i !== -1; i = text.indexOf("var(", i + 1)) {
        const body = varBody(text, i + 3);
        if (body === null) continue;
        const [property, fallback] = splitTopLevel(body);
        const match = byProperty.get(property);
        if (!match) continue;
        reads.push({
          file,
          prefix,
          property,
          role: match.role,
          fallback,
          expected: match.expected,
        });
      }

      surfaces.push({
        file,
        prefix,
        slug,
        ground: ground as FactionGround,
        literal,
        withheld,
        text,
        reads,
      });
    }
  }
  return surfaces;
}

const SURFACES = harvest();
const readsOf = (surfaces: Surface[]) =>
  surfaces.flatMap((surface) =>
    surface.reads.map((read) => ({ ...read, slug: surface.slug })),
  );
const READS = readsOf(SURFACES);
const BANNED = readsOf(SURFACES.filter((surface) => !surface.withheld));
const REQUIRED = readsOf(SURFACES.filter((surface) => surface.withheld));

describe("a surface reads the role map, and the map answers (#2659, #2689)", () => {
  it("harvests surfaces of both kinds", () => {
    // Each regex and each clause must match something, or the rest is vacuous.
    expect(SURFACES.filter((surface) => surface.literal).length).toBeGreaterThan(0);
    expect(SURFACES.filter((surface) => !surface.literal).length).toBeGreaterThan(0);
    expect(READS.length).toBeGreaterThan(0);
    expect(BANNED.length).toBeGreaterThan(0);
    expect(REQUIRED.length).toBeGreaterThan(0);
    // An unknown slug would quietly expect the neutral family.
    for (const surface of SURFACES) {
      if (!surface.literal) continue;
      expect(
        isKnownFaction(surface.slug) || ["na", "albescent"].includes(surface.slug),
        `${surface.file} declares a map for an unrecognised slug: ${surface.slug}`,
      ).toBe(true);
    }
  });

  it("keeps the one exemption honest: the guard it names is really there", () => {
    // The exempt file must withhold, and nothing else may.
    for (const file of SELF_GUARDED) {
      const surface = SURFACES.find((candidate) => candidate.file === file);
      expect(surface, `${file} is exempt from clause 1 but declares no role map`).toBeDefined();
      expect(
        WITHHOLDING_GUARD.test(surface!.text),
        `${file} is exempt because it withholds the map from its own reads, and it no ` +
          `longer does. Either restore the guard or move the file to clause 1 and drop ` +
          `its fallbacks — the exemption may not outlive its reason.`,
      ).toBe(true);
    }

    const unlisted = SURFACES.filter(
      (surface) => !surface.withheld && WITHHOLDING_GUARD.test(surface.text),
    ).map((surface) => surface.file);
    expect(
      unlisted,
      `withholds the map from its own reads but is not in SELF_GUARDED, so its reads ` +
        `are banned from carrying the fallback they need and render nothing`,
    ).toEqual([]);
  });

  it.each(BANNED)("$file reads $property bare — the map always declares it", ({ property, fallback }) => {
    expect(
      fallback,
      `${property} carries a fallback that can never be reached: since #2690 ` +
        `factionRoleVars emits for every slug, so the property always wins. ` +
        `Drop the fallback.`,
    ).toBeNull();
  });

  it.each(REQUIRED)("$file reads $property with a token behind it", ({ property, fallback }) => {
    expect(
      fallback,
      `${property} must carry today's token as a fallback — this surface guards its ` +
        `own call and declares nothing for an unaffiliated viewer`,
    ).not.toBeNull();
  });

  it.each(REQUIRED.filter((read) => read.fallback?.includes("--faction-")))(
    "$file resolves $property to the $slug token the map names",
    ({ fallback, expected }) => {
      expect(fallback).toBe(expected);
    },
  );

  it.each(SURFACES)("$file's $prefix map is read by something", ({ reads, prefix }) => {
    // A declared, unread map is a half-landed migration nothing else notices.
    expect(reads.length, `--${prefix}-* is declared and never read`).toBeGreaterThan(0);
  });

  it("gives every surface a prefix of its own (#2659 — a prefix may not be shared)", () => {
    const prefixes = SURFACES.map((surface) => surface.prefix);
    expect(new Set(prefixes).size).toBe(prefixes.length);
  });

  it("leaves no core-role token named directly in a file that declares a map", () => {
    // Blank reads per FILE: `sealBands.tsx` declares two maps.
    const readsByFile = new Map<string, RoleRead[]>();
    for (const surface of SURFACES) {
      readsByFile.set(surface.file, [
        ...(readsByFile.get(surface.file) ?? []),
        ...surface.reads,
      ]);
    }

    const stragglers = SURFACES.flatMap((surface) => {
      if (!surface.literal) return [];
      const family = factionCssVar(surface.slug).slice("var(--faction-".length, -1);
      const withoutReads = (readsByFile.get(surface.file) ?? []).reduce(
        (text, read) =>
          read.fallback === null
            ? text
            : text.split(`var(${read.property}, ${read.fallback})`).join(""),
        surface.text,
      );
      return CORE_SUFFIXES.flatMap((suffix) => {
        const direct = `var(--faction-${family}-${suffix})`;
        const helper = new RegExp(
          `factionCssVar\\(\\s*["'\`](?:${surface.slug}|${family})["'\`]\\s*,\\s*["'\`]${suffix}["'\`]`,
        );
        return withoutReads.includes(direct) || helper.test(withoutReads)
          ? [`${surface.file} still names ${suffix}`]
          : [];
      });
    });
    expect(stragglers).toEqual([]);
  });
});
