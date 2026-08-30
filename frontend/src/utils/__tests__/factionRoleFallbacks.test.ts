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
 * THE STANDING RULE FOR "a faction supplies a MAP, not values" (#2659, #2689).
 *
 * A surface spreads `factionRoleVars('ua', 'task-card')` on its root and reads
 * `var(--task-card-ink)` below it. Whether that read may carry a fallback, and
 * what the fallback must be if it does, is what this file holds — derived from
 * source, with no table of surfaces to keep current. A surface that appears
 * tomorrow is covered the moment it declares a map.
 *
 * WHY THERE IS NO TABLE ANY MORE. There was one: `factionRoleMigration.test.ts`,
 * 74 rows and 344 hand-counted sites, which replaced an earlier derived gate in
 * 658159e0 on the argument that a pinned count catches a role read quietly
 * disappearing where auto-discovery cannot. That argument is real and this file
 * gives it up deliberately: a read deleted outright is no longer caught. What
 * settled it is the roster's own blind spot — `components/layout/Sidebar.tsx` is
 * the repo's only `chrome`-ground caller and had no row at all, because a human
 * had to remember to add one. A gate nobody remembers to extend is not covering
 * the surface it appears to cover, and every lane paid the bookkeeping anyway.
 *
 * THE RULE, SINCE #2690 (ADR-0089). `factionRoleVars` answers for all nine
 * slugs: `na`, Albescent, null and a slug the server invents tomorrow now get
 * the same nine properties as `ua`, pointing at the neutral
 * `--faction-default-*` family. So the map ALWAYS emits, and the only thing that
 * can keep a declaration from reaching a read is the calling surface withholding
 * it on purpose.
 *
 *  1. BAN, everywhere the surface does not withhold. A fallback there is
 *     unreachable code — it cannot drift, because nothing renders it, and it
 *     cannot be verified, because nothing renders it. Before #2690 this clause
 *     was narrowed to files naming an IDENTIFIED faction, because `na` and
 *     Albescent were the propertyless case; they are not any more, so the
 *     narrowing is gone and the literal-vs-dynamic slug test with it.
 *
 *  2. REQUIRE, in a surface that withholds the map from itself. There is exactly
 *     one, `components/layout/Sidebar.tsx`, and it is not an allowlist entry
 *     with an empty seat behind it — see {@link SELF_GUARDED}, which holds the
 *     reason, and the two assertions that check the guard is really there and
 *     that no second file has grown one quietly. In such a file a bare read
 *     renders nothing at all, so a fallback at every read is REQUIRED.
 *
 *  3. PIN, where that required fallback names a faction token. Then it must be
 *     the token the role map resolves to for an unaffiliated viewer — the case
 *     the fallback is actually reached in. When it is, the read is provably a
 *     no-op: declared value and fallback are the same string. When it is not,
 *     something has repainted a surface while calling it a refactor — the
 *     failure mode #2649 names by name.
 *
 * WHY CLAUSE 3 IS NARROWED TO FACTION TOKENS. A fallback may legitimately name a
 * NEUTRAL tier instead, and for `quiet` that is the documented design: it is
 * per-SITE, so `--x-quiet` unset reads `--color-text-secondary` at a heading and
 * `--color-text-tertiary` at a timestamp, and three neutral tiers survive a
 * faction family that has two. `Sidebar.tsx` is where this lives — 23 of its 25
 * fallbacks are app tokens. Pinning those to `--faction-default-*` would assert
 * the opposite of what they are for.
 *
 * A ROLE READ IS IDENTIFIED BY ITS PREFIX, NEVER BY THE ROLE WORD. A read counts
 * only when the file itself declares that prefix. `SnidePraxisCard` reads
 * `--snd-praxis-ink`, `--snd-praxis-accent` and `--snd-praxis-paper`, which are
 * shaped exactly like role reads and are not: that channel is set by a PARENT
 * row (`.snd-detail-praxis`, `index.css`), its fallback is the card's own
 * default, and the card spreads `snd-pcard`. Keying on the prefix classifies all
 * three correctly with no exception list, which is why there is no exception
 * list — do not add one.
 *
 * WHAT THIS DOES NOT COVER. Whether a surface renders at all
 * (`factionContrast.test.ts` measures the pairs, `e2e/contrast.spec.ts` proves
 * something draws them), and an undeclared prefix from the other side
 * (`factionTokensDeclared.test.ts`).
 */

const SRC_DIR = join(fileURLToPath(new URL(".", import.meta.url)), "..", "..");
/** TS/TSX source, excluding a test file even where one is not under `__tests__`. */
const SOURCE_MATCH = /^(?!.*\.test\.).*\.tsx?$/;

/** A map declared with both slug and prefix written out, optionally a ground. */
const LITERAL_DECLARATION =
  /factionRoleVars\(\s*["'`]([\w-]+)["'`]\s*,\s*["'`]([\w-]+)["'`]\s*(?:,\s*["'`](\w+)["'`]\s*)?\)/g;

/**
 * A map whose slug is a variable — `Sidebar` paints whoever is looking. The
 * fallback is reached exactly when that viewer is unaffiliated, so the neutral
 * answer is the one to expect. The roster never covered this file at all.
 */
const DYNAMIC_DECLARATION =
  /factionRoleVars\(\s*([A-Za-z_$][\w$]*(?:[.?]\w+)*)\s*,\s*["'`]([\w-]+)["'`]\s*(?:,\s*["'`](\w+)["'`]\s*)?\)/g;

const UNAFFILIATED = "na";

/**
 * THE ONE SURFACE THAT WITHHOLDS THE MAP FROM ITSELF, AND WHY (owner ruling,
 * 2026-08-28, on #2690; ADR-0089).
 *
 * The rail is `chrome` — the app's own FURNITURE wearing a faction, not a
 * content card — and an unaffiliated viewer is a viewer with no faction, so what
 * they should see is the app rather than a neutral faction family standing in
 * for one. Rendered side by side from the real `index.css`, the cost of the
 * other answer was concrete: the app has three neutral ink tiers and the
 * `default` family has two, so `--color-text-secondary` at a heading and
 * `--color-text-tertiary` at a timestamp collapse onto one colour, and a
 * translucent rail (`rgba(255,255,255,0.72)` light, `rgba(255,255,255,0.04)`
 * dark) turns opaque. That is exactly the per-SITE fallback behaviour
 * `factionRoles.ts` documents for `quiet`, and the ruling keeps it.
 *
 * So `Sidebar.tsx` guards its OWN call — `railFaceVars` returns `{}` for an
 * unidentified slug before it ever reaches `factionRoleVars` — and its reads
 * keep their fallbacks. This is a named exception carrying its reason, not a
 * bare entry: the guard is asserted from source below, and a second file growing
 * one without appearing here is a failure too. An exemption nobody re-checks is
 * the thing that rots.
 */
const SELF_GUARDED = ["components/layout/Sidebar.tsx"];

/**
 * The withholding shape, as written: `if (!isKnownFaction(slug)) return {}`
 * ahead of the spread. Deliberately narrow — `DefaultProfileBody.tsx` calls
 * `isKnownFaction` to branch its CONTENT and must not read as a guarded surface.
 */
const WITHHOLDING_GUARD = /if\s*\(\s*!\s*isKnownFaction\([^)]*\)\s*\)\s*return\s*\{\s*\}/;

/**
 * The eight core suffixes a role now owns. A file that declares a map and still
 * names one directly has a read the map should be answering — inherited from the
 * roster, which is where the second spelling (`factionCssVar("ua", "card-bg")`)
 * comes from.
 */
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

/**
 * Comments quote these names as prose — this file's own docstring reads
 * `var(--task-card-ink, …)`, which is not a read of anything. The `(?<!:)` is
 * what keeps `https://` from eating the rest of its line.
 */
function stripComments(text: string): string {
  return text.replace(/\/\*[\s\S]*?\*\//g, "").replace(/(?<!:)\/\/[^\n]*/g, "");
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
  /** Whether the slug was written out — a dynamic one has no single answer. */
  literal: boolean;
  /**
   * Whether this surface keeps the map from reaching its own reads: clauses 2-3
   * vs clause 1. Since #2690 the resolver always emits, so this is the only way
   * a read can go unanswered.
   */
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
      // A dynamic slug reaches its fallback only when the viewer is
      // unaffiliated, so that is the value to expect there.
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
    // A regex that silently matches nothing turns every assertion below into a
    // vacuous pass, and there are two regexes here — a change breaking only the
    // dynamic one would leave the rail untested while the file stayed green.
    expect(SURFACES.filter((surface) => surface.literal).length).toBeGreaterThan(0);
    expect(SURFACES.filter((surface) => !surface.literal).length).toBeGreaterThan(0);
    expect(READS.length).toBeGreaterThan(0);
    // Both clauses must have a subject, or one of them is silently untested.
    expect(BANNED.length).toBeGreaterThan(0);
    expect(REQUIRED.length).toBeGreaterThan(0);
    // Every literal slug must resolve, or `expected` is quietly the neutral
    // family for a faction that has its own.
    for (const surface of SURFACES) {
      if (!surface.literal) continue;
      expect(
        isKnownFaction(surface.slug) || ["na", "albescent"].includes(surface.slug),
        `${surface.file} declares a map for an unrecognised slug: ${surface.slug}`,
      ).toBe(true);
    }
  });

  it("keeps the one exemption honest: the guard it names is really there", () => {
    // A named exception whose reason has quietly stopped being true is worse
    // than no exception, because the file keeps its licence. Both halves are
    // checked: the exempt file must withhold, and nothing else may.
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
    // Nine properties declared and none read is a migration that landed
    // half-done — no pixel moves, so nothing else notices.
    expect(reads.length, `--${prefix}-* is declared and never read`).toBeGreaterThan(0);
  });

  it("gives every surface a prefix of its own (#2659 — a prefix may not be shared)", () => {
    const prefixes = SURFACES.map((surface) => surface.prefix);
    expect(new Set(prefixes).size).toBe(prefixes.length);
  });

  it("leaves no core-role token named directly in a file that declares a map", () => {
    // Blanking is per FILE, not per surface: `sealBands.tsx` declares two maps,
    // and blanking only one surface's reads leaves the other's naming core
    // tokens legitimately — which reads as a straggler and is not one.
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
