import { readFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

import {
  FACTION_ROLES,
  factionRoleProperty,
  factionRoleVar,
  type FactionRole,
} from "../utils/factionRoles";

/**
 * THE MERGE GATE FOR A FACTION LANE (#2672, batch 02 of "Nine Kits, One
 * Vocabulary" on #2649).
 *
 * A lane moves a surface off `--faction-<key>-card-*` literals and onto
 * `var(--<prefix>-<role>, <today's token>)`, with `factionRoleVars(slug,
 * prefix)` spread on the surface's root. The whole claim is that **not one
 * pixel moves**, and that claim rests entirely on the fallback: a role read
 * whose fallback is not the exact token the site read yesterday is a repaint
 * wearing a refactor's clothes, and nothing else in CI can see it.
 *
 *  - `tsc` cannot: a `var()` fallback is a string.
 *  - `no-raw-style-values` cannot: both sides are tokenized.
 *  - `factionTokensDeclared.test.ts` cannot: it checks that `--task-card-ink`
 *    is DECLARED (by reconstructing prefix x role from the resolver), which is
 *    the other half. A read declared and wrong is still wrong.
 *  - `factionContrast.test.ts` cannot: it measures the resolver's own pairs,
 *    not what a call site typed under them.
 *
 * So the gate is here, and it is arithmetic rather than review: every fallback
 * in a migrated file must be, character for character, `factionRoleVar('na',
 * role)`. Every site in this lane read na's card family before, because na IS
 * the Default kit (ADR-0039) — so one expected value per role covers all of
 * them, and it is computed from the resolver rather than transcribed.
 *
 * WHY THE SPREAD IS A NO-OP, WHICH IS THE SECOND HALF OF THE GATE. Every
 * surface below spreads `factionRoleVars(UNAFFILIATED_FACTION_SLUG, …)`, not a
 * subject's slug, and `isKnownFaction('na')` is false — so the resolver returns
 * `{}`, nothing is declared, and every read IS its fallback. Pixel identity is
 * therefore unconditional rather than contingent on the manifest staying
 * 180/180 saturated.
 *
 * THE SLUG IS PINNED BECAUSE THE GROUND IS. Each of these archetypes stands on
 * `factionSpectrumSheet()` / `factionSheet()` / `--faction-default-stamp-bg` /
 * `.na-backdrop` — grounds that take no slug and cannot follow one. "The ground
 * moves with the ink or neither moves" (#2361), and #2669 is the price of
 * getting it wrong: an accent left on a wall it no longer matched, 1.03:1.
 * `DefaultSelectCard`'s own docblock says the same from the copy side — `slug`
 * picks the words and the mark and never a colour, or an unregistered slug
 * lands in a borrowed livery (#796 / #418 / #636). What the prefix buys is not
 * a live theme; it is a NAME a host can dress one surface by, instead of
 * redeclaring `--faction-default-card-text` and repainting every na descendant
 * in its subtree — which `SingularityPraxisDetail` does today.
 *
 * WHAT IS DELIBERATELY NOT IN THE TABLE. A surface that draws na's tokens as
 * the PLATFORM's neutral for every viewer — `EditCharacter` ("themed in the
 * spectrum default skin for EVERYONE, regardless of the character's faction",
 * #434), the onboarding cards, `MetataskPicker`, `MetataskSeal`,
 * `CharacterSwitcherSheet`, `StartHereMark`, the desktop `FieldDesk`,
 * `proposeTask/factionSurfaces.ts` — is not a faction archetype and has no
 * lane. Travelling pieces (`DefaultPointsRing`, `DuelCard`) take their paint
 * through props already, which is the same statement from the other side: a
 * piece that moves between hosts cannot name its host's prefix. Both groups
 * belong to the surface batches (11+), where "who dresses this?" is the
 * question being asked.
 */

const SRC = join(fileURLToPath(new URL(".", import.meta.url)), "..");

/**
 * The lane's contact sheet, in code: surface file → the prefix it owns.
 *
 * One prefix per SURFACE, never one shared `--kit-*` — a page wrapper
 * declaring a shared namespace repaints every descendant, including a card
 * belonging to a different faction than the page (the law, `factionRoleVars`).
 */
const LANE: Record<string, string> = {
  "components/taskCard/DefaultTaskCard.tsx": "task-card",
  "components/praxisCard/desktop/DefaultPraxisCard.tsx": "praxis-card",
  "components/praxisCard/scoreStamp/DefaultScoreStamp.tsx": "score-stamp",
  "components/selectCard/DefaultSelectCard.tsx": "select-card",
  "components/avatar/DefaultAvatar.tsx": "avatar",
  "components/metataskSeal/skins/DefaultSeal.tsx": "seal",
  "components/metataskSeal/sealBands.tsx": "band",
  "pages/taskDetail/archetypes/DefaultTaskDetail.tsx": "task-detail",
  "pages/praxisDetail/archetypes/DefaultPraxisDetail.tsx": "praxis-detail",
  "pages/editPraxis/archetypes/DefaultEditPraxis.tsx": "edit-praxis",
  "pages/characterProfile/archetypes/DefaultProfileBody.tsx": "profile-body",
  "pages/fieldDesk/mobileArchetypes/DefaultFieldDesk.tsx": "field-desk",
};

/** The core-role suffixes under `--faction-default-`, and the role each is. */
const ROLE_OF_SUFFIX = new Map<string, FactionRole>(
  FACTION_ROLES.map((role) => [
    // `factionRoleProperty('p', role)` is `--p-<suffix>`; take the suffix back
    // by length rather than by regex, so the resolver stays the only speller.
    factionRoleProperty("p", role).slice("--p-".length),
    role,
  ]),
);

/** What each role must resolve to when nothing declares it — today's token. */
const FALLBACK = new Map<FactionRole, string>(
  FACTION_ROLES.map((role) => [role, factionRoleVar("na", role)]),
);

/**
 * Comments quote token names as prose — `DefaultTaskCard`'s own docblock spends
 * a paragraph on why its face is NOT `--faction-default-card-font`. A mention
 * is not a read. `//` is only stripped when it does not follow a `:`, so a
 * `url(https://…)` survives.
 */
function stripComments(text: string): string {
  return text
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/(^|[^:])\/\/[^\n]*/g, "$1");
}

const files = Object.entries(LANE).map(([relative, prefix]) => ({
  relative,
  prefix,
  code: stripComments(readFileSync(join(SRC, relative), "utf-8")),
}));

/** `var(--<prefix>-<suffix>, <one nested var()>)` — the shape a lane writes. */
function roleReads(code: string, prefix: string) {
  const pattern = new RegExp(
    String.raw`var\(\s*--${prefix}-([a-z-]+)\s*,\s*(var\([^()]*\))\s*\)`,
    "g",
  );
  return [...code.matchAll(pattern)].map((match) => ({
    suffix: match[1],
    fallback: match[2],
  }));
}

describe("na/Default reads the role map without moving a pixel (#2672)", () => {
  it("finds the reads it is meant to police (non-vacuity)", () => {
    const total = files.reduce(
      (sum, { code, prefix }) => sum + roleReads(code, prefix).length,
      0,
    );
    // 12 surfaces, 66 core-role sites at the time of writing. A table that
    // stopped matching — a file renamed, a prefix changed — would otherwise
    // pass this whole suite by scanning nothing.
    expect(total).toBeGreaterThan(60);
    for (const { relative, code, prefix } of files) {
      expect(
        { file: relative, reads: roleReads(code, prefix).length > 0 },
        `${relative} declares prefix --${prefix}- but reads no role through it`,
      ).toEqual({ file: relative, reads: true });
    }
  });

  it("names only real roles, spelled the resolver's way", () => {
    const unknown = files.flatMap(({ relative, code, prefix }) =>
      roleReads(code, prefix)
        .filter(({ suffix }) => !ROLE_OF_SUFFIX.has(suffix))
        .map(({ suffix }) => `--${prefix}-${suffix} in ${relative}`),
    );
    expect(unknown).toEqual([]);
  });

  it("carries today's exact token as every fallback", () => {
    const wrong = files.flatMap(({ relative, code, prefix }) =>
      roleReads(code, prefix)
        .filter(({ suffix, fallback }) => {
          const role = ROLE_OF_SUFFIX.get(suffix);
          return role !== undefined && fallback !== FALLBACK.get(role);
        })
        .map(
          ({ suffix, fallback }) =>
            `--${prefix}-${suffix} in ${relative} falls back to ${fallback}, ` +
            `expected ${FALLBACK.get(ROLE_OF_SUFFIX.get(suffix) as FactionRole)}`,
        ),
    );
    expect(wrong).toEqual([]);
  });

  it("leaves no core-role token read outside a fallback slot", () => {
    const stranded = files.flatMap(({ relative, code, prefix }) => {
      // Blank every well-formed role read, then look for what is left.
      const swept = code.replace(
        new RegExp(
          String.raw`var\(\s*--${prefix}-[a-z-]+\s*,\s*var\([^()]*\)\s*\)`,
          "g",
        ),
        "",
      );
      const core = [...FALLBACK.values()].map((v) =>
        v.replace(/^var\(|\)$/g, ""),
      );
      return core
        .filter((token) => swept.includes(`var(${token})`))
        .map((token) => `${token} still read bare in ${relative}`);
    });
    expect(stranded).toEqual([]);
  });

  it("declares each prefix in the file that reads it", () => {
    const undeclared = files
      .filter(
        ({ code, prefix }) =>
          !new RegExp(
            String.raw`factionRoleVars\([^,)]+,\s*["'\`]${prefix}["'\`]`,
          ).test(code),
      )
      .map(({ relative, prefix }) => `${relative} never spreads '${prefix}'`);
    expect(undeclared).toEqual([]);
  });
});
