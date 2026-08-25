import { readFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

import { FACTION_ROLES, factionRoleVar } from "../factionRoles";
import { stripComments } from "./cssVars";

/**
 * LANE 05's TWO SURFACES THAT ARE BELOW THE MERGE GATE'S REACH (#2675), and the
 * census that proves there are only two.
 *
 * `factionRoleMigration.test.ts` is THE fallback-equality gate — it re-derives
 * every fallback from the resolver for each surface that spreads a prefix, and
 * several folded guards elsewhere now cite it by name. Fifteen of this lane's
 * seventeen files are registered in its table; nothing here duplicates that
 * comparison. The other two CANNOT be registered, and the reason is worth
 * writing down because every remaining lane will meet it:
 *
 *  - `SingularityAvatar` renders no element of its own. Its four colours are
 *    discrete PROPS of `BadgedAvatar`, which owns the disc.
 *  - `SingularityProfileBody` is a DRESS. `ProfileSkin` owns the page root and
 *    the `data-theme` pinned on it; the dress has no style object that lands on
 *    that element.
 *
 * `factionRoleVars` has to land somewhere. A `var(--sg-x-paper, …)` read in a
 * file that declares nothing would resolve to its fallback forever — a name
 * that looks migrated and is inert, which is the failure class this repo's
 * guards exist for. So both ask the resolver DIRECTLY, one role at a time, and
 * that is not a lesser form: `factionRoleVar` is the same map, and the law keeps
 * it for exactly this.
 *
 * WHAT THIS FILE CHECKS, THEREFORE, IS THE COMPLEMENT: that no file in the lane
 * spells a core token by name any more, whichever of the two mechanisms it
 * uses, and that every one of the seventeen reaches the map at all. A
 * re-introduced literal renders identically, so no render test, snapshot or
 * contrast row can see it.
 */

const SRC_DIR = join(fileURLToPath(new URL(".", import.meta.url)), "..", "..");

/** The lane's census, re-measured on `origin/main` at 285e0751: 47 reads. */
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
 * ROOTLESS TAKES `factionRoleVar`, AND NEVER A PREFIX — the rule lane 04 pinned
 * for WOW (#2679) and this file pins for Singularity, so five lanes do not each
 * answer it differently.
 *
 * A module that renders no root of its own has nowhere to put a prefix. Giving
 * it one declares a namespace BETWEEN the vocabulary and every host that mounts
 * it — which is the shared `--kit-*` namespace `WORLD_ZERO_STYLE.md:1179`
 * declines — and handing a host's prefix down is a component prop, i.e. TREE
 * work, which a paint lane may not do. So: root → `factionRoleVars(slug,
 * prefix)`; rootless → `factionRoleVar(slug, role)` and no prefix at all.
 *
 * Named here rather than counted, so a third one has to be ARGUED for instead
 * of quietly appearing.
 */
const NO_ELEMENT = [
  "components/avatar/SingularityAvatar.tsx",
  "pages/characterProfile/archetypes/SingularityProfileBody.tsx",
];

const CORE = String.raw`card-bg|card-text|card-muted|card-border|card-accent|on-fill|card-radius|card-font`;

/**
 * The files carved out of EVERY lane, and what each still owes this faction.
 *
 * They dispatch on slug for more than one faction, which is slot ownership — a
 * column, not a row — and belongs to batches 11+. The check below is the
 * NON-VACUITY half lane 04 pinned for WOW (#2679): if one of these is newly
 * empty, a lane has swept a file the five-way parallel build depends on being
 * disjoint, and every other lane's merge is now sitting on a conflict nobody
 * declared.
 *
 * `FactionSigil` is the FOURTH, and it was not on the issue's list of three: its
 * per-faction adapters reach the bare hue through `factionCssVar("singularity")`
 * — the accessor spelling, which is why a literal-only census missed it. Found
 * by this lane, declined rather than swept, and since added to the carve-out
 * list for the lanes that remain.
 * `utils/factions.ts` names no Singularity token at all (it builds every name by
 * interpolation), so it has nothing to pin and is deliberately absent.
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

/**
 * A LOCAL RE-DECLARATION is not a read. `SingularityPraxisDetail` repoints
 * `--faction-singularity-card-muted` under one subtree so a shared roster paints
 * on the terminal (#2675 leaves it): that is an act of writing, and the role map
 * has nothing to say about it.
 */
const REDECLARATION = new RegExp(
  String.raw`["'\`](--faction-singularity[\w-]*)["'\`]\s*\]?\s*:`,
  "g",
);

/**
 * `stripComments` is the CSS stripper, so it takes `/* … *​/` and leaves `//` —
 * the same reader `factionRoleMigration` uses, with `://` spared so a URL
 * survives. Every file in this kit opens with a docblock naming its tokens.
 */
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
