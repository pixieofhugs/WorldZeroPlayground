/**
 * Lane 02 census (#2672, re-cut on #2649) for what `factionRoleMigration.test.ts`
 * cannot hold; same shape as `wowRoleMap.test.ts`, which states the reasoning.
 *
 * ROOTLESS: `DefaultPointsRing` and `DuelCard` mount under several hosts'
 * prefixes, so a shared prefix would be the `--kit-*` namespace
 * `WORLD_ZERO_STYLE.md` declines; they use `factionRoleVar` (identical strings).
 *
 * CARVED OUT: four files read roles for MORE than one faction (a column, not a
 * row) and belong to batches 11+; touching one breaks the disjoint lanes.
 */
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const SRC = join(fileURLToPath(new URL(".", import.meta.url)), "..", "..");

const KIT_MODULES = [
  "components/factionMarks/DefaultPointsRing.tsx",
  "pages/praxisDetail/DuelCard.tsx",
];

/** Shared cross-faction renderers, carved out of every lane (#2649). */
const CARVED_OUT = [
  "components/vote/VoteShell.tsx",
  "components/cardMasthead/factionBands.tsx",
  "components/sigil/FactionSigil.tsx",
  "utils/factions.ts",
];

/** Family is `default`, not `na` (ADR-0039): `--faction-na-` would match nothing. */
const CORE_TOKEN =
  /--faction-default(?:-card-(?:bg|text|muted|border|accent|radius|font)|-on-fill)?(?![a-z0-9-])/g;

/** Comments quote token names as prose constantly; a mention is not a read. */
function source(relative: string): string {
  return readFileSync(join(SRC, ...relative.split("/")), "utf-8")
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/(^|[^:])\/\/.*$/gm, "$1");
}

describe("na's rootless pieces ask for a role, not a token (#2672)", () => {
  it.each(KIT_MODULES)("%s composes from factionRoleVar", (path) => {
    expect(source(path)).toMatch(/factionRoleVar\(\s*['"]na['"]/);
  });

  it.each(KIT_MODULES)("%s names no core-role token directly", (path) => {
    // `-card-line`/`-stamp-bg` are not core roles; repointing them is a repaint
    // (decision 07).
    expect(source(path).match(CORE_TOKEN) ?? []).toEqual([]);
  });

  it.each(KIT_MODULES)("%s spreads no prefix, having no root", (path) => {
    // A prefix here would repaint every descendant of the host, other factions' cards included.
    expect(source(path)).not.toContain("factionRoleVars");
  });
});

describe("the files carved out of every lane are untouched by it (#2649)", () => {
  it.each(CARVED_OUT)("%s spreads no role prefix", (path) => {
    expect(
      source(path),
      `${path} reads core roles for MORE than one faction, which is slot
ownership - a column, not a row - and belongs to batches 11+. Carving these out
is what makes the five lanes strictly disjoint, so a lane that helpfully tidied
one would break the parallel build for everyone.`,
    ).not.toContain("factionRoleVars");
  });
});
