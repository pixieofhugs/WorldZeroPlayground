import { readFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

import {
  FACTION_ROLES,
  factionRoleVar,
  type FactionRole,
} from "../factionRoles";

/**
 * Lane 05 of "Nine Kits, One Vocabulary" (#2675): the Singularity kit reads the
 * nine ROLES, never the eight core token suffixes by name.
 *
 * THE SEAM IS THE READ SITE, not the resolver. `factionRoles.test.ts` already
 * proves the map answers `singularity` with the tokens `index.css` declares;
 * what nothing proved is that a surface ASKS through it. The migration is
 * exactly one file-scope property — after it, no Singularity surface spells a
 * core token except as the fallback of the role that points at it — and a
 * property over source text is the only way to state it, because a
 * re-introduced literal renders identically and so is invisible to a render
 * test, a snapshot and the contrast loop alike.
 *
 * WHY THE FALLBACK IS REQUIRED RATHER THAN OPTIONAL. `factionRoleVars` declares
 * its properties on ONE element; a read outside that element's subtree resolves
 * to nothing and the whole declaration is dropped — the failure class
 * `factionTokensDeclared.test.ts` exists for. Today's token as the fallback
 * makes a mis-scoped read merely inert instead of blank, which is what lets the
 * lane's computed-value diff be zero rows by construction.
 */

const SRC_DIR = join(fileURLToPath(new URL(".", import.meta.url)), "..", "..");

/**
 * The lane's census, re-measured against `origin/main` at 285e0751: every file
 * holding a core-role read for this faction, minus the three carved out of all
 * five lanes (`vote/VoteShell`, `cardMasthead/factionBands`, `utils/factions` —
 * they answer for more than one faction, which is a column, not a row).
 */
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

/** The role vocabulary as this faction answers it, `var()` string and all. */
const ROLE_TOKEN = new Map<FactionRole, string>(
  FACTION_ROLES.map((role) => [role, factionRoleVar("singularity", role)]),
);

/** The reverse: the eight core tokens plus the bare hue, keyed by reference. */
const TOKEN_ROLE = new Map<string, FactionRole>(
  [...ROLE_TOKEN].map(([role, reference]) => [reference, role]),
);

/** `--x-paper` … `--x-face` as a property NAME. `onFill` is the odd spelling. */
const ROLE_PROPERTY = new Map<string, FactionRole>(
  FACTION_ROLES.map((role) => [
    role === "onFill" ? "on-fill" : role,
    role,
  ]),
);

const PROPERTIES = [...ROLE_PROPERTY.keys()]
  // `on-fill` before `fill`, or the alternation eats the wrong half.
  .sort((a, b) => b.length - a.length)
  .join("|");

/**
 * A `var()` reference to a core token of this faction. The trailing `[,)]`
 * mirrors `factionTokensDeclared.test.ts`: an interpolated name is not a read.
 */
const CORE_READ = new RegExp(
  String.raw`var\(\s*(--faction-singularity[\w-]*)\s*[,)]`,
  "g",
);

/** A surface reading a role. `--faction-…` is a token, never a role read. */
const ROLE_READ = new RegExp(
  String.raw`var\(\s*--(?!faction-)([\w-]+?)-(${PROPERTIES})\s*,`,
  "g",
);

/** The whole legal form: a role read carrying today's token as its fallback. */
const ROLE_READ_WITH_FALLBACK = new RegExp(
  String.raw`var\(\s*--(?!faction-)([\w-]+?)-(${PROPERTIES})\s*,\s*var\(\s*(--faction-singularity[\w-]*)\s*\)\s*\)`,
  "g",
);

/** The prefix a surface hands the resolver — a literal, as the guard demands. */
const ROLE_VARS_PREFIX = new RegExp(
  String.raw`factionRoleVars\(\s*[^,)]+,\s*["'\`]([\w-]+)["'\`]`,
  "g",
);

/**
 * A local RE-DECLARATION of a faction token — `"--faction-singularity-card-muted":
 * PANEL` in `SingularityPraxisDetail`, which repoints one role under one subtree
 * so a shared roster paints on the terminal. That is an act of writing, not of
 * reading, and the role map has nothing to say about it; it stays as it is.
 */
const REDECLARATION = new RegExp(
  String.raw`["'\`](--faction-singularity[\w-]*)["'\`]\s*\]?\s*:`,
  "g",
);

/**
 * JS/TS comments, which quote token names as prose all through this kit — every
 * file here opens with a docblock naming its tokens. `(^|\s)//` rather than a
 * bare `//` so `https://` survives and so `{'// '}`, the Singularity seal's own
 * printed comment glyph, stays code.
 */
function stripComments(text: string): string {
  return text
    .replace(/\/\*[\s\S]*?\*\//g, " ")
    .split("\n")
    .map((line) => line.replace(/(^|\s)\/\/.*$/, "$1"))
    .join("\n");
}

function matchAll(text: string, pattern: RegExp): RegExpMatchArray[] {
  return [...text.matchAll(pattern)];
}

const sources = LANE_FILES.map((path) => ({
  path,
  text: stripComments(readFileSync(join(SRC_DIR, path), "utf-8")),
}));

describe("the Singularity kit reads roles, not token names (#2675)", () => {
  it("knows what it is policing (sanity check on census, map and stripper)", () => {
    expect(sources).toHaveLength(17);
    expect(ROLE_TOKEN.get("paper")).toBe("var(--faction-singularity-card-bg)");
    expect(ROLE_TOKEN.get("fill")).toBe("var(--faction-singularity)");
    expect(TOKEN_ROLE.size).toBe(FACTION_ROLES.length);
    // The stripper must not eat the code it is scanning.
    expect(
      sources.filter(({ text }) => text.includes("Singularity")).length,
    ).toBe(17);
  });

  it("spells a core token only as the fallback of the role that owns it", () => {
    const bare = sources.flatMap(({ path, text }) => {
      const redeclared = new Set(
        matchAll(text, REDECLARATION).map(([, name]) => `var(${name})`),
      );
      // Strike out every legal wrapping; whatever core read survives is bare.
      const rest = text.replace(ROLE_READ_WITH_FALLBACK, " ");
      return matchAll(rest, CORE_READ)
        .map(([, name]) => `var(${name})`)
        .filter((reference) => TOKEN_ROLE.has(reference))
        .filter((reference) => !redeclared.has(reference))
        .map((reference) => `${path}: bare ${reference}`);
    });

    expect(bare).toEqual([]);
  });

  it("gives every role read the token that role resolves to, as its fallback", () => {
    const wrong = sources.flatMap(({ path, text }) => {
      // A role read with no `var(--faction-singularity-…)` behind it is either
      // fallback-less or falls back to something else; both are the same bug.
      const reads = matchAll(text, ROLE_READ).length;
      const wrapped = matchAll(text, ROLE_READ_WITH_FALLBACK);
      const unwrapped =
        reads > wrapped.length
          ? [`${path}: ${reads - wrapped.length} role read(s) with no token fallback`]
          : [];
      return [
        ...unwrapped,
        ...wrapped.flatMap(([, prefix, property, token]) => {
          const role = ROLE_PROPERTY.get(property);
          const expected = role ? ROLE_TOKEN.get(role) : undefined;
          return expected === `var(${token})`
            ? []
            : [`${path}: --${prefix}-${property} falls back to var(${token})`];
        }),
      ];
    });

    expect(wrong).toEqual([]);
  });

  it("declares every prefix it reads, in the file that reads it", () => {
    const undeclared = sources.flatMap(({ path, text }) => {
      const spread = new Set(
        matchAll(text, ROLE_VARS_PREFIX).map(([, prefix]) => prefix),
      );
      return [...new Set(matchAll(text, ROLE_READ).map(([, prefix]) => prefix))]
        .filter((prefix) => !spread.has(prefix))
        .map((prefix) => `${path}: reads --${prefix}-* and spreads nothing`);
    });

    expect(undeclared).toEqual([]);
  });
});
