/**
 * WOW ASKS THE FACTION FOR A ROLE, NOT FOR A TOKEN (#2674, lane 04 of "Nine
 * Kits, One Vocabulary" — the re-cut recorded on #2649).
 *
 * THE SEAM UNDER TEST is the read: `var(--<surface-prefix>-<role>, <today's
 * token>)`, the one place a WOW surface meets `utils/factionRoles.ts`. Both
 * halves of that expression can be wrong in a way nothing else in CI can see.
 *
 *  - A MISSPELLED PREFIX (`--wow-fed-paper`) renders as the fallback and looks
 *    perfect. `factionTokensDeclared.test.ts` catches the orphan only because it
 *    reconstructs the resolver's exact cross-product; it cannot check that the
 *    prefix a file READS is the prefix that file DECLARES, which is the failure
 *    a copy-pasted surface actually makes.
 *  - A WRONG FALLBACK (`var(--wow-feed-paper, var(--faction-wow-plate))`) is a
 *    REPAINT hiding inside a refactor, and it is invisible today and forever
 *    after: WOW declares no ground override, so the declared value and the
 *    fallback are the same string, and the wrong fallback never renders. It
 *    would surface years later, on the first ground override, as a colour
 *    nobody changed.
 *
 * So this file is the lane's COMPUTED-VALUE DIFF, mechanised: every migrated
 * read's fallback must be exactly the token `factionRoleVar('wow', role)`
 * resolves to, which is the token that site named before the migration. A green
 * run is the proof that not one pixel moved.
 *
 * IT NAMES ITS SURFACES RATHER THAN COUNTING THEM (#1998 → #2090). A total is
 * what lets a wrong mount pass; a new WOW surface has to add its own line here
 * rather than quietly fit inside a number. The three rootless entries are the
 * other half of the same census — see {@link KIT_MODULES}.
 */
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

import {
  FACTION_ROLES,
  factionRoleProperty,
  factionRoleVar,
  type FactionRole,
} from "../../utils/factionRoles";

const SRC = join(fileURLToPath(new URL(".", import.meta.url)), "..", "..");

/**
 * The surfaces, and the prefix each one picked.
 *
 * THE PREFIX BELONGS TO THE SURFACE, NOT TO THE APP — one shared `--kit-*`
 * namespace is explicitly declined by the law, because a page wrapper declaring
 * it repaints every descendant including a card belonging to a different
 * faction than the page. Each name here is qualified with `wow` for the same
 * reason at one level down: nine parallel lanes are migrating nine task cards,
 * and a bare `--task-card-paper` would be nine files claiming one name.
 */
const SURFACES: Record<string, string> = {
  "components/avatar/WowAvatar.tsx": "wow-avatar",
  "components/comments/voices/WowComment.tsx": "wow-comment",
  "components/factionHero/WowFactionHero.tsx": "wow-hero",
  "components/feed/WowFeedFrame.tsx": "wow-feed",
  "components/metataskSeal/skins/WowSeal.tsx": "wow-seal",
  "components/praxisCard/desktop/WowPraxisCard.tsx": "wow-praxis-card",
  "components/praxisCard/scoreStamp/WowScoreStamp.tsx": "wow-score-stamp",
  "components/selectCard/WowSelectCard.tsx": "wow-select-card",
  "components/taskCard/WowTaskCard.tsx": "wow-task-card",
  "pages/characterPaths/archetypes/WowCreateCharacter.tsx": "wow-create",
  "pages/characterProfile/archetypes/WowProfileBody.tsx": "wow-profile",
  "pages/editPraxis/archetypes/WowEditPraxis.tsx": "wow-edit-praxis",
  "pages/factionDetail/archetypes/WowFactionBody.tsx": "wow-faction-page",
  "pages/praxisDetail/archetypes/WowPraxisDetail.tsx": "wow-praxis-page",
  "pages/taskDetail/archetypes/WowTaskDetail.tsx": "wow-task-page",
};

/**
 * The three files in the lane that are NOT surfaces, and so cannot pick a
 * prefix.
 *
 * A prefix is declared on a root and read below it. These three have no root:
 * they are the shared vocabulary six mobile skins, six ornament consumers and
 * the duel seal compose from, mounted under many different roots — including
 * `WowFieldDesk` and `WowDuelSealConfirm`, which are outside this lane. Giving
 * them one prefix between them would BE the `--kit-*` namespace the law
 * declines; giving them their consumers' prefixes is tree work, not paint.
 *
 * `factionRoleVar` is the answer the resolver already ships for exactly this:
 * one role, as a `var()` reference, with no all-or-nothing seam to protect
 * because the slug is a literal. It returns the identical string the constant
 * held before, so these files move onto the vocabulary at zero risk.
 */
const KIT_MODULES = [
  "components/duel/wowLists.tsx",
  "components/factionMarks/wowMobile.tsx",
  "components/factionMarks/wowOrnament.tsx",
];

/**
 * Carved out of every lane (#2649): shared cross-faction renderers that dispatch
 * on slug internally. That is slot ownership — a column, not a row — and it
 * belongs to batches 11+. They must still name WOW's tokens directly.
 */
const CARVED_OUT = [
  "components/vote/VoteShell.tsx",
  "components/cardMasthead/factionBands.tsx",
];

/** The nine core-role suffixes, as `index.css` spells them. */
const CORE_SUFFIX = new RegExp(
  "--faction-wow(?:-card-(?:bg|text|muted|border|accent|radius|font)|-on-fill)?(?![a-z0-9-])",
  "g",
);

/** Comments quote token names as prose; a mention is not a read. */
function stripComments(text: string): string {
  return text
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/^[^\n"'`]*\/\/.*$/gm, "");
}

function source(relative: string): string {
  return stripComments(readFileSync(join(SRC, relative), "utf-8"));
}

/** Every `var(--prefix-role, …)` read in `text`, with its fallback. */
function roleReads(
  text: string,
  prefix: string,
): { role: FactionRole; fallback: string }[] {
  return FACTION_ROLES.flatMap((role) => {
    const property = factionRoleProperty(prefix, role);
    const pattern = new RegExp(
      `var\\(\\s*${property}\\s*,\\s*(var\\(--[\\w-]+\\))\\s*\\)`,
      "g",
    );
    return [...text.matchAll(pattern)].map((match) => ({
      role,
      fallback: match[1],
    }));
  });
}

describe("WOW reads the role map", () => {
  it.each(Object.entries(SURFACES))(
    "%s declares its own prefix on its root",
    (path, prefix) => {
      // The prefix a surface READS has to be the prefix it DECLARES. Nothing
      // else in CI compares the two, and a copy-pasted surface gets this wrong.
      // Quote-agnostic: this repo has no prettier config and each archetype
      // keeps its own house style.
      expect(source(path)).toMatch(
        new RegExp(`factionRoleVars\\(\\s*['"]wow['"],\\s*['"]${prefix}['"]`),
      );
    },
  );

  it.each(Object.entries(SURFACES))(
    "%s reads at least one role, so the census cannot pass vacuously",
    (path, prefix) => {
      expect(roleReads(source(path), prefix).length).toBeGreaterThan(0);
    },
  );

  it.each(Object.entries(SURFACES))(
    "%s carries today's token as every fallback — the computed-value diff",
    (path, prefix) => {
      for (const { role, fallback } of roleReads(source(path), prefix)) {
        expect(fallback).toBe(factionRoleVar("wow", role));
      }
    },
  );

  it.each([...Object.keys(SURFACES), ...KIT_MODULES])(
    "%s names no core-role token outside a role fallback",
    (path) => {
      const prefix = SURFACES[path];
      let text = source(path);
      if (prefix) {
        for (const role of FACTION_ROLES) {
          const property = factionRoleProperty(prefix, role);
          text = text.replace(
            new RegExp(
              `var\\(\\s*${property}\\s*,\\s*var\\(--[\\w-]+\\)\\s*\\)`,
              "g",
            ),
            "«role»",
          );
        }
      }
      expect(text.match(CORE_SUFFIX) ?? []).toEqual([]);
    },
  );

  it.each(KIT_MODULES)(
    "%s composes from factionRoleVar, having no root",
    (path) => {
      expect(source(path)).toMatch(/factionRoleVar\(\s*['"]wow['"]/);
    },
  );

  it.each(CARVED_OUT)("%s is carved out and still names WOW directly", (path) => {
    // A lane that "tidied" one of these would break the disjointness the five
    // parallel lanes were cut for. Asserting the carve-out from inside the lane
    // is what makes an accidental sweep loud.
    expect((source(path).match(CORE_SUFFIX) ?? []).length).toBeGreaterThan(0);
  });
});
