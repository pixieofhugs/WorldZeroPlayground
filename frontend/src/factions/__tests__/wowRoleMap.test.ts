/**
 * Lane 04 census (#2674 on #2649) for what `factionRoleMigration.test.ts` (the
 * per-SURFACE gate) cannot hold. A census NAMES members (#1998 → #2090), so a
 * new WOW kit module adds its own line.
 *
 * ROOTLESS: `wowMobile`, `wowLists`, `wowOrnament` are mounted under many roots.
 * A prefix shared with every host would be the `--kit-*` namespace the law
 * declines; passing the host prefix down is tree work. `factionRoleVar` returns
 * the identical string, so no value moves.
 *
 * CARVED OUT: `VoteShell`, `factionBands` read roles for MORE than one faction
 * (a column, not a row; batches 11+). Asserting it from inside the lane makes an
 * accidental sweep loud.
 */
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const SRC = join(fileURLToPath(new URL(".", import.meta.url)), "..", "..");

const KIT_MODULES = [
  "components/factionMarks/wowMobile.tsx",
  "components/duel/wowLists.tsx",
  "components/factionMarks/wowOrnament.tsx",
];

/** Shared cross-faction renderers, carved out of every lane (#2649). */
const CARVED_OUT = [
  "components/vote/VoteShell.tsx",
  "components/cardMasthead/factionBands.tsx",
];

const CORE_TOKEN =
  /--faction-wow(?:-card-(?:bg|text|muted|border|accent|radius|font)|-on-fill)?(?![a-z0-9-])/g;

/** Comments quote token names as prose constantly; a mention is not a read. */
function source(relative: string): string {
  return readFileSync(join(SRC, ...relative.split("/")), "utf-8")
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/(^|[^:])\/\/.*$/gm, "$1");
}

describe("WOW's rootless kit modules ask for a role, not a token (#2674)", () => {
  it.each(KIT_MODULES)("%s composes from factionRoleVar", (path) => {
    expect(source(path)).toMatch(/factionRoleVar\(\s*['"]wow['"]/);
  });

  it.each(KIT_MODULES)("%s names no core-role token directly", (path) => {
    expect(source(path).match(CORE_TOKEN) ?? []).toEqual([]);
  });

  it.each(KIT_MODULES)("%s spreads no prefix, having no root", (path) => {
    // A prefix here would repaint every descendant of the host, other factions' cards included.
    expect(source(path)).not.toContain("factionRoleVars");
  });
});

describe("the files carved out of every lane still name WOW directly", () => {
  it.each(CARVED_OUT)("%s is untouched by this lane", (path) => {
    expect(
      (source(path).match(CORE_TOKEN) ?? []).length,
      `${path} dispatches on slug for MORE than one faction, so its core-role
reads belong to batches 11+ (slot ownership — a column, not a row). If this is
newly empty, a lane swept a file the five-way parallel build depends on being
disjoint.`,
    ).toBeGreaterThan(0);
  });
});
