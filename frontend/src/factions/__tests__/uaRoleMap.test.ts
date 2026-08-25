import { readFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

import { stripComments } from "../../utils/__tests__/cssVars";

/**
 * THE TWO RULES A LANE CANNOT EXPRESS IN ITS OWN DIFF (#2673, lane 03 of
 * "Nine Kits, One Vocabulary" on #2649).
 *
 * `factionRoleMigration.test.ts` is the value gate: it re-derives every
 * fallback from the resolver and fails if one drifts. It answers "did a
 * migrated site change colour". It cannot answer either of the questions below,
 * because both are about files a lane deliberately did NOT give a prefix to —
 * and a file absent from that table looks the same whether it was considered
 * and excluded or simply missed.
 *
 * Both rules were established by sibling lanes and are pinned here so UA's copy
 * of them cannot drift back.
 */

const SRC_DIR = join(fileURLToPath(new URL(".", import.meta.url)), "..", "..");

function source(file: string): string {
  return stripComments(
    readFileSync(join(SRC_DIR, ...file.split("/")), "utf-8"),
  ).replace(/(^|[^:])\/\/.*$/gm, "$1");
}

/**
 * UA's rootless kit modules: they paint, and they render no root of their own.
 *
 * A module here is mounted under MANY hosts, several of them outside this lane
 * — `uaAtoms` supplies the display cut, the eyebrow and the ensō to a dozen
 * surfaces, and `UaAvatar` hands three values to `BadgedAvatar`, which draws
 * the disc. Giving such a module a prefix of its own means declaring a
 * namespace BETWEEN the vocabulary and every host, which is the shared `--kit-*`
 * namespace `WORLD_ZERO_STYLE.md:1179` explicitly declines; handing the host's
 * prefix down instead is a component prop, i.e. TREE work, and a paint lane may
 * not do tree work (#2650's axis).
 *
 * So the rule is: a root takes `factionRoleVars(slug, prefix)`, and a rootless
 * module takes the SINGULAR `factionRoleVar(slug, role)` and no prefix at all.
 * Same string out either way, so this costs nothing and prevents a namespace.
 */
const ROOTLESS = [
  "components/factionMarks/uaAtoms.tsx",
  "components/avatar/UaAvatar.tsx",
  "pages/characterProfile/archetypes/UaProfileBody.tsx",
];

/**
 * The files carved out of EVERY faction lane, and why each is a column rather
 * than a row.
 *
 * All four dispatch on slug internally and paint for more than one faction, so
 * migrating one is slot ownership — batches 11+, not a lane. `VoteShell` is
 * additionally one of the frozen four.
 *
 * `FactionSigil` is on this list and was NOT on the one in #2673's body: the
 * census that drew that list matched the literal `var(--faction-ua-…)` spelling
 * and this file reaches its tokens through `factionCssVar('ua')` and
 * `factionCssVar("singularity")`, so it never showed up as contended. Lane 05
 * found it. That is the whole reason this guard asserts the POSITIVE — a
 * carve-out list is only load-bearing if something notices when a file leaves
 * it, and "no diff" is not something a test can see.
 */
const CARVED_OUT = [
  "components/vote/VoteShell.tsx",
  "components/cardMasthead/factionBands.tsx",
  "components/sigil/FactionSigil.tsx",
  "utils/factions.ts",
];

/**
 * A read of one of UA's nine core roles, spelt as the token.
 *
 * The lookahead is what keeps `--faction-ua-body-font`, `-panel`, `-border` and
 * the rest of UA's non-core family out: they are decision 07's business, not a
 * lane's, and the bare `--faction-ua` fill IS core.
 */
const CORE_TOKEN =
  /--faction-ua(?:-card-(?:bg|text|muted|border|accent|radius|font)|-on-fill)?(?![a-z0-9-])/g;

describe("UA's role map — the rules a diff cannot state (#2673)", () => {
  it.each(ROOTLESS)("%s takes the singular resolver and declares no prefix", (file) => {
    const text = source(file);
    expect(
      text.includes("factionRoleVars("),
      `${file} renders no root of its own, so a prefix declared here would be a namespace between the vocabulary and every host that mounts it — the shared --kit-* namespace the law declines. Use factionRoleVar(slug, role).`,
    ).toBe(false);
    expect(
      text.includes("factionRoleVar("),
      `${file} is a UA painting module and names no role at all — either it stopped painting, or it went back to naming tokens directly.`,
    ).toBe(true);
  });

  it.each(ROOTLESS)("%s names no core-role token directly", (file) => {
    // These files declare no prefix, so there is no fallback arm to exempt:
    // every core-role name left in one is a straggler. This is the half
    // `factionRoleMigration`'s straggler check does for the sixteen surfaces
    // and cannot do here, because it only walks files in its own table.
    expect(source(file).match(CORE_TOKEN) ?? []).toEqual([]);
  });

  it.each(CARVED_OUT)("%s is carved out of every lane and still names tokens", (file) => {
    const text = source(file);
    expect(
      text.includes("factionRoleVars("),
      `${file} paints for more than one faction. A prefix here would be one surface's namespace on a shared renderer — that is slot ownership (a column, not a row) and belongs to batches 11+.`,
    ).toBe(false);
    const direct = [
      ...text.matchAll(/var\(\s*--faction-[\w-]+\s*[,)]/g),
      ...text.matchAll(/factionCssVar\(/g),
    ];
    expect(
      direct.length,
      `${file} no longer names a faction token directly, so some lane has swept it. It is carved out on purpose — revert it.`,
    ).toBeGreaterThan(0);
  });
});
