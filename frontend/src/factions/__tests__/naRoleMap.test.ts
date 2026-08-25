/**
 * THE TWO HALVES OF LANE 02 THAT `factionRoleMigration.test.ts` CANNOT HOLD
 * (#2672, lane 02 of "Nine Kits, One Vocabulary" — the re-cut on #2649).
 *
 * Same shape as `wowRoleMap.test.ts`, and deliberately so: that file states the
 * reasoning once and this one is lane 02's census against it. The migration
 * gate is for a SURFACE — one prefix on one root, every fallback re-derived
 * from the resolver. Thirteen of this lane's surfaces are rows in it. The
 * rootless pieces are not surfaces at all, and the carved-out files are in no
 * lane's table by construction. Both are census work, and a census NAMES its
 * members rather than counting them (#1998 → #2090).
 *
 * THE ROOTLESS TWO. A prefix is declared on a root and read below it.
 * `DefaultPointsRing` and `DuelCard`'s `DEFAULT_INK` have no root of their own:
 * the ring is mounted by `DefaultTaskCard` and by `DefaultScoreStamp`, which sit
 * under two DIFFERENT prefixes, and the duel card renders under nine hosts. One
 * prefix shared between the piece and every host would BE the `--kit-*`
 * namespace `WORLD_ZERO_STYLE.md:1179` declines; handing each host's prefix down
 * is a component prop, which is tree work and not a paint lane's.
 * `factionRoleVar` is the resolver's answer for a single role with no
 * all-or-nothing seam to protect — it returns the identical string these
 * constants held before, so no value can move.
 *
 * THE CARVED-OUT FOUR. `VoteShell`, `factionBands`, `FactionSigil` and
 * `utils/factions` read core roles for MORE THAN ONE faction, which is slot
 * ownership — a column, not a row — and belongs to batches 11+. Carving them
 * out is what makes the five lanes strictly disjoint, so a lane that helpfully
 * "tidied" one would break the parallel build for everyone. `FactionSigil` was
 * missing from #2672's list because that census matched the literal
 * `var(--faction-<key>-…)` spelling and not `factionCssVar`, so it never showed
 * up as contended; lane 05 found it. Asserting the carve-out from INSIDE the
 * lane is what makes an accidental sweep loud instead of silent.
 */
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const SRC = join(fileURLToPath(new URL(".", import.meta.url)), "..", "..");

/** na's rootless pieces, which have no root to hang a prefix on. */
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

/**
 * A read of one of na's nine core roles, spelt as the token.
 *
 * The FAMILY is `default`, not the slug: `resolveCssKey` sends both `na` and
 * `albescent` there (ADR-0039, #783). A pattern spelt `--faction-na-` would
 * match nothing that has ever existed and this whole file would pass vacuously.
 */
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
    // These files declare no prefix, so there is no fallback arm to exempt:
    // every core-role name left in one would be a straggler. `-card-line` and
    // `-stamp-bg` survive the pattern on purpose — neither is a core role, and
    // repointing either would be a repaint (decision 07).
    expect(source(path).match(CORE_TOKEN) ?? []).toEqual([]);
  });

  it.each(KIT_MODULES)("%s spreads no prefix, having no root", (path) => {
    // The negative half. `factionRoleVars` here would mean the piece had
    // claimed a root it does not own — and would repaint every descendant of
    // whichever host mounted it, including a card of a different faction.
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

  /**
   * `utils/factions.ts` is the resolver's own home and builds its names by
   * interpolation (`--faction-${key}-...`), so it names no second key
   * literally. The other three are RENDERERS that dispatch on slug inside one
   * file, and it is that plurality - not a token count - which makes them
   * columns rather than rows.
   */
  const RENDERERS = CARVED_OUT.filter((path) => path !== "utils/factions.ts");

  it.each(RENDERERS)("%s still dispatches for more than one faction", (path) => {
    const text = source(path);
    const keys = new Set([
      ...[...text.matchAll(/--faction-([a-z]+)/g)].map((match) => match[1]),
      ...[...text.matchAll(/faction(?:Css|Role)Var\(\s*["'`]([a-z]+)["'`]/g)].map(
        (match) => match[1],
      ),
    ]);
    expect(
      [...keys].sort().join(" "),
      `${path} names ${keys.size} faction key(s). If this has fallen to one the
file stopped being contended, which either means a lane swept it or it is no
longer a carve-out - and both are decisions rather than edits.`,
    ).toMatch(/ /);
  });
});
