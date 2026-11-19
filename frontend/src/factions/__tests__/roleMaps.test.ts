/**
 * Rootless kit modules (mounted under many hosts) ask for a role via the
 * singular `factionRoleVar`, never a `factionRoleVars` prefix (it would be the
 * `--kit-*` namespace the law declines) and never a core token by name. A kit
 * module adds its own line (#2649, #2672-#2674).
 */
import { join } from "node:path";
import { describe, expect, it } from "vitest";

import { SRC_DIR, readStripped } from "../../test/sourceScan";

const source = (file: string) => readStripped(join(SRC_DIR, ...file.split("/")));

/** `na`'s family is `default` (ADR-0039). The lookahead keeps non-core tokens out. */
const coreToken = (family: string) =>
  new RegExp(
    `--faction-${family}(?:-card-(?:bg|text|muted|border|accent|radius|font)|-on-fill)?(?![a-z0-9-])`,
    "g",
  );

const KITS: ReadonlyArray<[family: string, modules: string[]]> = [
  ["default", ["components/factionMarks/DefaultPointsRing.tsx", "pages/praxisDetail/DuelCard.tsx"]],
  [
    "ua",
    [
      "components/factionMarks/uaAtoms.tsx",
      "components/avatar/UaAvatar.tsx",
      "pages/characterProfile/archetypes/UaProfileBody.tsx",
    ],
  ],
  [
    "wow",
    [
      "components/factionMarks/wowMobile.tsx",
      "components/duel/wowLists.tsx",
      "components/factionMarks/wowOrnament.tsx",
    ],
  ],
];

const CASES = KITS.flatMap(([family, modules]) => modules.map((m) => [family, m] as const));

describe("a faction's rootless kit modules ask for a role, not a token", () => {
  it.each(CASES)("%s: %s", (family, path) => {
    const text = source(path);
    expect(text, "paints no role at all").toContain("factionRoleVar(");
    expect(text, "having no root, it declares no prefix").not.toContain("factionRoleVars");
    expect(text.match(coreToken(family)) ?? [], "names a core token directly").toEqual([]);
  });
});

describe("renderers shared by every faction are carved out of every lane (#2649)", () => {
  it.each([
    "components/vote/VoteShell.tsx",
    "components/cardMasthead/factionBands.tsx",
    "components/sigil/FactionSigil.tsx",
    "utils/factions.ts",
  ])("%s spreads no role prefix", (path) => {
    expect(source(path)).not.toContain("factionRoleVars");
  });
});
