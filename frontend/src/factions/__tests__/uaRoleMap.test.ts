import { readFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

import { stripComments } from "../../utils/__tests__/cssVars";

/**
 * Lane 03 census (#2673 on #2649): rules about files a lane deliberately gave NO
 * prefix, which `factionRoleMigration.test.ts` cannot see. Reasoning in
 * `wowRoleMap.test.ts`.
 */

const SRC_DIR = join(fileURLToPath(new URL(".", import.meta.url)), "..", "..");

function source(file: string): string {
  return stripComments(
    readFileSync(join(SRC_DIR, ...file.split("/")), "utf-8"),
  ).replace(/(^|[^:])\/\/.*$/gm, "$1");
}

/**
 * Rootless modules mounted under many hosts (`uaAtoms`, `UaAvatar` →
 * `BadgedAvatar`): singular `factionRoleVar(slug, role)`, no prefix.
 */
const ROOTLESS = [
  "components/factionMarks/uaAtoms.tsx",
  "components/avatar/UaAvatar.tsx",
  "pages/characterProfile/archetypes/UaProfileBody.tsx",
];

/**
 * Carved out of every lane: they paint for more than one faction (batches 11+).
 * `FactionSigil` reaches tokens via `factionCssVar`, so a literal-spelling
 * census missed it; hence the POSITIVE assertion below.
 */
const CARVED_OUT = [
  "components/vote/VoteShell.tsx",
  "components/cardMasthead/factionBands.tsx",
  "components/sigil/FactionSigil.tsx",
  "utils/factions.ts",
];

/** Lookahead keeps UA's non-core family (`-body-font`, `-panel`, …) out; bare `--faction-ua` IS core. */
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
    // No prefix, so no fallback arm: any core-role name is a straggler.
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
