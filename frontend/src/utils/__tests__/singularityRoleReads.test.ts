import { readFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

import { FACTION_ROLES, factionRoleVar } from "../factionRoles";
import { stripComments } from "./cssVars";

/**
 * The Singularity kit reads roles, not tokens (#2675): no lane file spells a
 * core token by name (a re-introduced literal renders identically, so nothing
 * else sees it), and every one reaches the resolver. Two files render no root
 * of their own and so use `factionRoleVar` directly ({@link NO_ELEMENT}).
 */

const SRC_DIR = join(fileURLToPath(new URL(".", import.meta.url)), "..", "..");

/** The lane's census. */
const LANE_FILES = [
  "components/avatar/SingularityAvatar.tsx",
  "components/comments/voices/SingularityComment.tsx",
  "components/duel/SingularityDuelSealConfirm.tsx",
  "components/factionHero/SingularityFactionHero.tsx",
  "components/factionMarks/SingularityReadout.tsx",
  "components/feed/SingularityFeedFrame.tsx",
  "components/metataskSeal/skins/SingularitySeal.tsx",
  "components/praxisCard/desktop/SingularityPraxisCard.tsx",
  "components/selectCard/SingularitySelectCard.tsx",
  "components/taskCard/SingularityTaskCard.tsx",
  "pages/characterPaths/archetypes/SingularityCreateCharacter.tsx",
  "pages/characterProfile/archetypes/SingularityProfileBody.tsx",
  "pages/editPraxis/archetypes/SingularityEditPraxis.tsx",
  "pages/factionDetail/archetypes/SingularityFactionBody.tsx",
  "pages/fieldDesk/mobileArchetypes/SingularityFieldDesk.tsx",
  "pages/praxisDetail/archetypes/SingularityPraxisDetail.tsx",
  "pages/taskDetail/archetypes/SingularityTaskDetail.tsx",
];

/**
 * Rootless modules take `factionRoleVar` and never a prefix (#2679): a prefix
 * there would be a shared `--kit-*`-style namespace. Named, not counted, so a
 * third must be argued for.
 */
const NO_ELEMENT = [
  "components/avatar/SingularityAvatar.tsx",
  "pages/characterProfile/archetypes/SingularityProfileBody.tsx",
];

const CORE = String.raw`card-bg|card-text|card-muted|card-border|card-accent|on-fill|card-radius|card-font`;

/**
 * Multi-faction files carved out of every lane, and what each still owes this
 * faction (#2679). Newly empty means a lane swept a file the parallel build
 * needs disjoint. `utils/factions.ts` interpolates every name, so is absent.
 */
const CARVED_OUT: [file: string, owed: RegExp][] = [
  ["components/vote/VoteShell.tsx", /--faction-singularity-card-/],
  ["components/cardMasthead/factionBands.tsx", /--faction-singularity-card-font/],
  ["components/sigil/FactionSigil.tsx", /factionCssVar\(\s*["']singularity["']\s*\)/],
];

/** `var(--sg-x-role, var(--faction-singularity-…))` — the migrated form. */
const ROLE_READ = new RegExp(
  String.raw`var\(\s*--[\w-]+\s*,\s*var\(\s*--faction-singularity[\w-]*\s*\)\s*\)`,
  "g",
);

/** A token named directly, either spelling. */
const BARE_TOKEN = new RegExp(
  String.raw`var\(\s*--faction-singularity(?:-(?:${CORE}))?\s*[,)]`,
  "g",
);
const BARE_ACCESSOR = new RegExp(
  String.raw`factionCssVar\(\s*["'\`]singularity["'\`]\s*(?:,\s*["'\`](?:${CORE})["'\`]\s*)?\)`,
  "g",
);

/** A local re-declaration (`SingularityPraxisDetail`) is a write, not a read. */
const REDECLARATION = new RegExp(
  String.raw`["'\`](--faction-singularity[\w-]*)["'\`]\s*\]?\s*:`,
  "g",
);

/** The CSS stripper leaves `//`, so strip it here, sparing `://`. */
function readSource(file: string): string {
  const text = readFileSync(join(SRC_DIR, ...file.split("/")), "utf-8");
  return stripComments(text).replace(/(^|[^:])\/\/.*$/gm, "$1");
}

const sources = LANE_FILES.map((file) => ({ file, text: readSource(file) }));

describe("the Singularity kit asks for roles, not for tokens (#2675)", () => {
  it("knows what it is policing (sanity check on census, map and stripper)", () => {
    expect(sources).toHaveLength(17);
    expect(factionRoleVar("singularity", "paper")).toBe(
      "var(--faction-singularity-card-bg)",
    );
    expect(factionRoleVar("singularity", "fill")).toBe("var(--faction-singularity)");
    // The stripper must not eat the code it is scanning.
    expect(sources.every(({ text }) => text.includes("Singularity"))).toBe(true);
  });

  it.each(LANE_FILES)("%s names no core token except as a fallback", (file) => {
    const text = sources.find((source) => source.file === file)!.text;
    const redeclared = new Set(
      [...text.matchAll(REDECLARATION)].map(([, name]) => `var(${name})`),
    );
    // Strike the legal wrappings out first; a core read that survives is bare.
    const rest = text.replace(ROLE_READ, " ");

    expect([
      ...[...rest.matchAll(BARE_TOKEN)]
        .map((match) => match[0].replace(/[,)]$/, ")").replace(/\s+/g, ""))
        .filter((reference) => !redeclared.has(reference)),
      ...[...rest.matchAll(BARE_ACCESSOR)].map((match) => match[0]),
    ]).toEqual([]);
  });

  it.each(LANE_FILES)("%s reaches the resolver", (file) => {
    const text = sources.find((source) => source.file === file)!.text;
    expect(/factionRoleVars?\(/.test(text)).toBe(true);
  });

  it("keeps the element-less pair to two, and gives them no prefix to read", () => {
    const spreads = sources.filter(({ text }) => text.includes("factionRoleVars("));
    expect(spreads.map(({ file }) => file).sort()).toEqual(
      LANE_FILES.filter((file) => !NO_ELEMENT.includes(file)).sort(),
    );

    for (const file of NO_ELEMENT) {
      const text = sources.find((source) => source.file === file)!.text;
      // Nothing declares here, so nothing may read a prefixed property either.
      const properties = FACTION_ROLES.map(
        (role) => `-${role.replace(/[A-Z]/g, (l) => `-${l.toLowerCase()}`)}`,
      );
      expect(
        [...text.matchAll(/var\(\s*(--[\w-]+)\s*,/g)]
          .map(([, name]) => name)
          .filter(
            (name) =>
              !name.startsWith("--faction-") &&
              properties.some((property) => name.endsWith(property)),
          ),
        `${file} declares no prefix; a role read there would resolve to its fallback forever`,
      ).toEqual([]);
    }
  });

  it.each(CARVED_OUT)("%s still names this faction directly", (file, owed) => {
    expect(
      owed.test(readFileSync(join(SRC_DIR, ...file.split("/")), "utf-8")),
      `${file} dispatches on slug for MORE than one faction, so its core-role
reads belong to batches 11+. If this is newly empty, a lane swept a file the
five-way parallel build depends on being disjoint.`,
    ).toBe(true);
  });
});
