/**
 * THE TWO HALVES OF LANE 04 THAT `factionRoleMigration.test.ts` CANNOT HOLD
 * (#2674, lane 04 of "Nine Kits, One Vocabulary" — the re-cut on #2649).
 *
 * That file is the merge gate for a migrated SURFACE: one prefix declared on
 * one root, every read's fallback re-derived from the resolver. Fifteen of this
 * lane's eighteen files are rows in it. The other three are not surfaces at all,
 * and the two files this lane must NOT have touched are not in any lane's
 * table by construction. Both are census work, and a census NAMES its members
 * rather than counting them (#1998 → #2090) — a new WOW kit module has to add
 * its own line here instead of fitting inside a total.
 *
 * THE ROOTLESS THREE. A prefix is declared on a root and read below it.
 * `wowMobile`, `wowLists` and `wowOrnament` have no root: they are the shared
 * vocabulary six mobile skins, six ornament consumers and the duel seal compose
 * from, mounted under many different roots — `WowFieldDesk`'s and
 * `WowDuelSealConfirm`'s among them, both outside this lane. One prefix shared
 * between the vocabulary and every host would BE the `--kit-*` namespace the law
 * declines, and handing each host's prefix down is a component prop, which is
 * tree work. `factionRoleVar` is the resolver's own answer for a single role
 * with no all-or-nothing seam to protect: it returns the identical string these
 * constants held before, so the value cannot move.
 *
 * THE CARVED-OUT TWO. `VoteShell` and `factionBands` read core roles for MORE
 * THAN ONE faction, which is slot ownership — a column, not a row — and belongs
 * to batches 11+. Carving them out is what makes the five lanes strictly
 * disjoint, so a lane that helpfully "tidied" one would break the parallel
 * build for everyone. Asserting the carve-out from INSIDE the lane is what
 * makes an accidental sweep loud instead of silent.
 */
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const SRC = join(fileURLToPath(new URL(".", import.meta.url)), "..", "..");

/** The shared WOW vocabulary modules, which have no root to hang a prefix on. */
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

/** A read of one of WOW's nine core roles, spelt as the token. */
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
    // These files declare no prefix, so there is no fallback arm to exempt:
    // every core-role name left in one would be a straggler.
    expect(source(path).match(CORE_TOKEN) ?? []).toEqual([]);
  });

  it.each(KIT_MODULES)("%s spreads no prefix, having no root", (path) => {
    // The negative half. `factionRoleVars` here would mean this module had
    // claimed a root it does not own — and would repaint every descendant of
    // whichever host mounted it, including a card of a different faction.
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
