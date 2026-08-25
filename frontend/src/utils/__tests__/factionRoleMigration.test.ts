import { readFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

import {
  FACTION_ROLES,
  factionRoleVar,
  type FactionGround,
  type FactionRole,
} from "../factionRoles";
import { stripComments } from "./cssVars";

/**
 * THE MERGE GATE FOR A FACTION LANE, AS A RUNNABLE CHECK (#2676, decision 12 of
 * "Nine Kits, One Vocabulary" on #2649).
 *
 * A lane moves a surface from naming a faction token directly —
 * `var(--faction-snide-card-bg)` — to naming a ROLE with that token carried as
 * the fallback: `var(--snd-task-paper, var(--faction-snide-card-bg))`, with
 * `factionRoleVars(slug, prefix, ground)` spread on the surface's root. Every
 * such move is supposed to be value-preserving, and "supposed to be" is the
 * whole problem: a migration that changes a pixel is a redesign wearing a
 * refactor's clothes, and NOTHING ELSE WE RUN CAN SEE IT. tsc sees two strings.
 * eslint sees two strings. `factionTokensDeclared` sees a declared name. The
 * bundle budget sees the same bytes. A fallback pointing one token sideways —
 * `-card-muted` where the role resolves to `-card-accent` — compiles, lints,
 * renders, and is simply the wrong colour.
 *
 * THE SEAM IS THE FALLBACK ARM, and it is the only place the old value and the
 * new name are written down together. So this file re-derives, from the
 * resolver, what each fallback must be, and compares it to what the source
 * actually says. That comparison IS the "computed-value diff" the epic asks
 * every lane to publish for review — expressed once, here, instead of once per
 * PR description where nothing re-checks it after the merge.
 *
 * WHY A SOURCE SCAN AND NOT A RENDER. The failure is per-SITE and the sites are
 * inside style objects, module constants and props threaded into shared
 * components; mounting each surface would need a fixture per archetype and
 * would still only reach the branches that fixture happens to hit. The source
 * has every site in it exactly once.
 *
 * WHAT IT DELIBERATELY DOES NOT DO: it does not check that a role is used on
 * the RIGHT declaration — `paper` in a `color:` is a contrast bug, and that is
 * `factionContrast.test.ts`'s job (#2661) — and it does not police surfaces
 * absent from the table below. Adding a surface to a lane means adding its row.
 */

const SRC_DIR = join(fileURLToPath(new URL(".", import.meta.url)), "..", "..");

interface Surface {
  /** Path under `frontend/src`. */
  file: string;
  /** The faction the surface is compile-time bound to. */
  slug: string;
  /** The surface's OWN prefix. Never shared — see `factionRoleVars`. */
  prefix: string;
  ground: FactionGround;
  /**
   * How many role reads the file WRITES. Pinned, because a read quietly dropped
   * in a later edit is a site that went back to naming the faction directly and
   * a read quietly added is one nobody measured.
   *
   * It is not always the number of old token reads the lane removed. Where a
   * file already had a module constant for the value, a second literal copy of
   * the same token collapses into it: `SnideTaskDetail` named
   * `--faction-snide-card-muted` twice inside one `radial-gradient()` beside a
   * `PLATE_MUTED` const that held exactly that string, so six removals became
   * four reads. Fewer reads than removals is the shape of a deletion; MORE
   * would be a repaint, and the straggler test below is what makes the
   * difference checkable rather than asserted.
   */
  sites: number;
}

/**
 * EVERY LANE'S CONTACT SHEET, in the one place a machine can read it.
 *
 * A lane appends its own block here rather than opening a second table: the
 * "a prefix may not be shared" check below is only true ACROSS lanes if one
 * array holds all of them, and two half-tables would each be green while
 * disagreeing with each other.
 *
 * S.N.I.D.E. owns the repo's only ground override (`chrome.snide`), so its
 * ground is a real choice here rather than a formality. Every surface below is
 * a CONTENT SHEET — a task/praxis detail column, a card, a comment, a stamp, a
 * mobile home for one faction's own pages — so all seven take `sheet`. `chrome`
 * is the app's own furniture wearing a faction, which in this repo is the rail
 * and nothing in this lane. Choosing `chrome` for any of these would repoint
 * `paper` to `--faction-snide-wall` and repaint the surface, which is exactly
 * what a lane may not do.
 */
const SURFACES: Surface[] = [
  {
    file: "pages/taskDetail/archetypes/SnideTaskDetail.tsx",
    slug: "snide",
    prefix: "snd-task",
    ground: "sheet",
    // 6 token reads removed, 4 written — see `sites`.
    sites: 4,
  },
  {
    file: "pages/praxisDetail/archetypes/SnidePraxisDetail.tsx",
    slug: "snide",
    prefix: "snd-read",
    ground: "sheet",
    sites: 4,
  },
  {
    file: "pages/fieldDesk/mobileArchetypes/SnideFieldDesk.tsx",
    slug: "snide",
    prefix: "snd-desk",
    ground: "sheet",
    sites: 5,
  },
  {
    file: "components/factionHero/SnideFactionHero.tsx",
    slug: "snide",
    prefix: "snd-hero",
    ground: "sheet",
    sites: 2,
  },
  {
    file: "components/metataskSeal/skins/SnideSeal.tsx",
    slug: "snide",
    prefix: "snd-seal",
    ground: "sheet",
    sites: 2,
  },
  {
    file: "components/praxisCard/desktop/SnidePraxisCard.tsx",
    slug: "snide",
    prefix: "snd-pcard",
    ground: "sheet",
    sites: 1,
  },
  {
    file: "components/duel/SnideDuelSealConfirm.tsx",
    slug: "snide",
    prefix: "snd-duel",
    ground: "sheet",
    sites: 1,
  },
  {
    file: "components/praxisCard/desktop/EverymenPraxisCard.tsx",
    slug: "everymen",
    prefix: "ev-praxis",
    ground: "sheet",
    // 6 token reads removed, 5 written: `card-bg` was named twice — as the
    // frame's own ground and again as `PraxisBody`'s `paper` — and both are now
    // the one `PAPER` const.
    sites: 5,
  },
  {
    file: "components/metataskSeal/skins/EverymenSeal.tsx",
    slug: "everymen",
    prefix: "ev-seal",
    ground: "sheet",
    sites: 2,
  },
  {
    file: "components/taskCard/EverymenTaskCard.tsx",
    slug: "everymen",
    prefix: "ev-task",
    ground: "sheet",
    sites: 1,
  },
  {
    file: "components/selectCard/EverymenSelectCard.tsx",
    slug: "everymen",
    prefix: "ev-select",
    ground: "sheet",
    sites: 1,
  },
  {
    file: "components/comments/voices/EverymenComment.tsx",
    slug: "everymen",
    prefix: "ev-voice",
    ground: "sheet",
    sites: 1,
  },
  {
    file: "components/feed/EverymenFeedFrame.tsx",
    slug: "everymen",
    prefix: "ev-feed",
    ground: "sheet",
    sites: 1,
  },
  {
    file: "pages/characterPaths/archetypes/EverymenCreateCharacter.tsx",
    slug: "everymen",
    prefix: "ev-path",
    ground: "sheet",
    sites: 1,
  },
  {
    file: "pages/editPraxis/archetypes/EverymenEditPraxis.tsx",
    slug: "everymen",
    prefix: "ev-compose",
    ground: "sheet",
    sites: 1,
  },

  /*
   * LANE 03 - UA (#2673). Sixteen surfaces with a root of their own.
   *
   * THE PREFIX IS DERIVED, NOT INVENTED: a faction stem, then the surface's own
   * key in `factions/manifest.ts::SURFACE_KEYS`, kebab-cased. The stem is what
   * keeps five lanes from each claiming `--task-card-paper` for a different
   * task card; the key half makes the sixteen names reviewable against a list
   * that already exists rather than being sixteen judgement calls, and makes
   * "no two surfaces share a prefix" true by construction, since the keys are
   * unique and a surface never nests inside itself.
   *
   * THE STEM IS `leaf`, NOT THE SLUG, AND THAT IS FORCED. `--ua-*` is UA's
   * RETIRED legacy family: `__tests__/uaDesktopSkin.test.tsx` renders eight
   * surfaces and asserts `not.toMatch(/var\(--ua-[a-z]/)` on each, so
   * `--ua-task-card-ink` fails a guard that exists to catch exactly the
   * spelling it wears. Widening that guard to exempt role suffixes would trade
   * a live check for a naming convenience. `leaf` is the noun this repo already
   * uses for UA's kit — the vellum leaf, the leaf's band, the leaf's register,
   * the "ua leaf darkest stop" rows in `factionContrast` — so it names UA and
   * nothing else, and it is free in both the `--faction-*` and `--ua-*`
   * namespaces.
   *
   * Every one is `sheet`. UA declares no ground override, and none of these is
   * app furniture - the rail is, and it is not in this lane.
   *
   * Three more UA files moved onto the vocabulary and are deliberately NOT rows
   * here, because they own no element to declare a prefix on:
   * `characterProfile/archetypes/UaProfileBody.tsx` (a dress object handed to
   * `ProfileSkin`), `avatar/UaAvatar.tsx` (props handed to `BadgedAvatar`) and
   * `factionMarks/uaAtoms.tsx` (constants mounted inside a dozen different
   * surfaces, each with its own prefix - an atom that read one surface's prefix
   * would hard-wire that namespace into the other eleven). They take the
   * SINGULAR `factionRoleVar`, which needs no prefix and returns the same
   * `var()` reference each site already held.
   */
  {
    file: "components/taskCard/UaTaskCard.tsx",
    slug: "ua",
    prefix: "leaf-task-card",
    ground: "sheet",
    sites: 5,
  },
  {
    file: "components/praxisCard/desktop/UaPraxisCard.tsx",
    slug: "ua",
    prefix: "leaf-praxis-card",
    ground: "sheet",
    sites: 8,
  },
  {
    file: "components/praxisCard/scoreStamp/UaScoreStamp.tsx",
    slug: "ua",
    prefix: "leaf-score-stamp",
    ground: "sheet",
    sites: 9,
  },
  {
    file: "components/selectCard/UaSelectCard.tsx",
    slug: "ua",
    prefix: "leaf-faction-select-card",
    ground: "sheet",
    sites: 5,
  },
  {
    file: "components/feed/UaFeedFrame.tsx",
    slug: "ua",
    prefix: "leaf-feed-frame",
    ground: "sheet",
    sites: 5,
  },
  {
    file: "components/comments/voices/UaComment.tsx",
    slug: "ua",
    prefix: "leaf-comment",
    ground: "sheet",
    sites: 9,
  },
  {
    file: "components/metataskSeal/skins/UaSeal.tsx",
    slug: "ua",
    prefix: "leaf-metatask-seal",
    ground: "sheet",
    sites: 7,
  },
  {
    file: "components/duel/UaDuelSealConfirm.tsx",
    slug: "ua",
    prefix: "leaf-duel-seal",
    ground: "sheet",
    sites: 3,
  },
  {
    file: "components/factionHero/UaFactionHero.tsx",
    slug: "ua",
    prefix: "leaf-faction-hero",
    ground: "sheet",
    sites: 3,
  },
  {
    file: "components/vote/UaVote.tsx",
    slug: "ua",
    prefix: "leaf-vote",
    ground: "sheet",
    // One read - the error line. The map is all-or-nothing by design; the
    // alternative is the vote control staying the one surface that names its
    // faction inline.
    sites: 1,
  },
  {
    file: "pages/fieldDesk/mobileArchetypes/UaFieldDesk.tsx",
    slug: "ua",
    prefix: "leaf-mobile-field-desk",
    ground: "sheet",
    // Seven module constants; the forty-odd call sites below them are untouched.
    sites: 7,
  },
  {
    file: "pages/characterPaths/archetypes/UaCreateCharacter.tsx",
    slug: "ua",
    prefix: "leaf-create-character",
    ground: "sheet",
    sites: 5,
  },
  {
    file: "pages/editPraxis/archetypes/UaEditPraxis.tsx",
    slug: "ua",
    prefix: "leaf-edit-praxis",
    ground: "sheet",
    sites: 5,
  },
  {
    file: "pages/praxisDetail/archetypes/UaPraxisDetail.tsx",
    slug: "ua",
    prefix: "leaf-praxis-detail",
    ground: "sheet",
    sites: 11,
  },
  {
    file: "pages/taskDetail/archetypes/UaTaskDetail.tsx",
    slug: "ua",
    prefix: "leaf-task-detail",
    ground: "sheet",
    sites: 19,
  },
  {
    file: "pages/factionDetail/archetypes/UaFactionBody.tsx",
    slug: "ua",
    prefix: "leaf-faction-body",
    ground: "sheet",
    sites: 19,
  },
];

/**
 * `stripComments` is the CSS stripper, so it takes `/* … *​/` and leaves `//`.
 * Both matter: these files quote token names in prose constantly, and a
 * mention is not a read. The line form is stripped here, with `://` spared so
 * a `url(https://…)` survives — the same carve-out `factionTokensDeclared`
 * documents from the other side.
 */
function readSource(file: string): string {
  const text = readFileSync(join(SRC_DIR, ...file.split("/")), "utf-8");
  return stripComments(text).replace(/(^|[^:])\/\/.*$/gm, "$1");
}

/**
 * A role read: `var(--<prefix>-<role>, var(--faction-…))`.
 *
 * The fallback arm is required to be a single bare `var()` — no `color-mix`, no
 * second fallback — because that is the only shape whose value this file can
 * compare against the resolver. A lane that needs a composed fallback is
 * composing, which decision 07 says belongs to the surface as a NAMED extra
 * rather than hidden inside a core role's fallback.
 */
function roleReads(source: string, prefix: string): [FactionRole, string][] {
  return FACTION_ROLES.flatMap((role) => {
    const property = `--${prefix}-${role.replace(/[A-Z]/g, (l) => `-${l.toLowerCase()}`)}`;
    const pattern = new RegExp(
      `var\\(\\s*${property}\\s*,\\s*(var\\(\\s*--[\\w-]+\\s*\\))\\s*\\)`,
      "g",
    );
    return [...source.matchAll(pattern)].map(
      (match) => [role, match[1].replace(/\s+/g, "")] as [FactionRole, string],
    );
  });
}

describe("every migrated site keeps the value it shipped with", () => {
  it.each(SURFACES)(
    "$file declares $prefix once, on the $ground ground",
    ({ file, slug, prefix, ground }) => {
      const source = readSource(file);
      const declarations = [
        ...source.matchAll(
          /factionRoleVars\(\s*["'`]([\w-]+)["'`]\s*,\s*["'`]([\w-]+)["'`]\s*(?:,\s*["'`](\w+)["'`]\s*)?\)/g,
        ),
      ];

      expect(
        declarations.map((match) => [match[1], match[2], match[3] ?? "sheet"]),
        "the root spreads its own prefix, exactly once",
      ).toEqual([[slug, prefix, ground]]);
    },
  );

  it.each(SURFACES)(
    "$file: every $prefix read falls back to the token its role resolves to",
    ({ file, slug, prefix, ground, sites }) => {
      const reads = roleReads(readSource(file), prefix);

      expect(reads.length, `role reads in ${file}`).toBe(sites);
      expect(
        reads.map(([role, fallback]) => `${role} -> ${fallback}`),
        "old var -> new var -> SAME declared value",
      ).toEqual(
        reads.map(
          ([role]) => `${role} -> ${factionRoleVar(slug, role, ground)}`,
        ),
      );
    },
  );

  it("gives every surface a prefix of its own (#2659 — a prefix may not be shared)", () => {
    const prefixes = SURFACES.map((surface) => surface.prefix);
    expect(new Set(prefixes).size).toBe(prefixes.length);
  });

  it("leaves no core-role token named directly in a migrated file", () => {
    const CORE = String.raw`card-bg|card-text|card-muted|card-border|card-accent|on-fill|card-radius|card-font`;
    const stragglers = SURFACES.flatMap(({ file, slug, prefix }) => {
      const source = readSource(file);
      // A bare read is any `--faction-<slug>[-<core suffix>]` NOT sitting in the
      // fallback arm of one of this surface's own role reads. Blanking the
      // fallbacks first is what makes "not preceded by" expressible without a
      // lookbehind whose width varies with the role name.
      const withoutFallbacks = source.replace(
        new RegExp(String.raw`var\(\s*--${prefix}-[\w-]+\s*,\s*var\(\s*--[\w-]+\s*\)\s*\)`, "g"),
        "",
      );
      const bare = [
        ...withoutFallbacks.matchAll(
          new RegExp(String.raw`var\(\s*--faction-${slug}(?:-(?:${CORE}))?\s*\)`, "g"),
        ),
        ...withoutFallbacks.matchAll(
          new RegExp(
            String.raw`factionCssVar\(\s*["'\`]${slug}["'\`]\s*(?:,\s*["'\`](?:${CORE})["'\`]\s*)?\)`,
            "g",
          ),
        ),
      ];
      return bare.map((match) => `${file}: ${match[0]}`);
    });

    expect(stragglers).toEqual([]);
  });
});
