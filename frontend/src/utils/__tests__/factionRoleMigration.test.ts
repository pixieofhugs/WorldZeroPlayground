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
import { factionCssVar } from "../factions";
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
 * The lanes' contact sheets, in the one place a machine can read it.
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

  /* ── Lane 04 (#2674): Warriors of Whimsy, 15 surfaces ────────────────────
   *
   * 97 core-role sites over 18 files. Three of the eighteen are absent here on
   * purpose: `factionMarks/wowMobile`, `duel/wowLists` and
   * `factionMarks/wowOrnament` are shared vocabulary with NO ROOT — six mobile
   * skins and six ornament consumers mount them, several outside this lane — so
   * they have no prefix to declare and take `factionRoleVar` instead. Their
   * guard is `factions/__tests__/wowRoleMap.test.ts`, which also pins the three
   * files carved out of every lane.
   *
   * Ten of the 97 sites were in those three modules, so 87 role reads is the
   * whole of the rest: no site collapsed and none was added.
   *
   * EVERY ONE IS `sheet`. WOW declares no ground override at all, and none of
   * these is app furniture — `chrome` in this repo is the rail. */
  {
    file: "components/taskCard/WowTaskCard.tsx",
    slug: "wow",
    prefix: "wow-task-card",
    ground: "sheet",
    sites: 6,
  },
  {
    file: "components/praxisCard/desktop/WowPraxisCard.tsx",
    slug: "wow",
    prefix: "wow-praxis-card",
    ground: "sheet",
    sites: 9,
  },
  {
    // One of the frozen four, and mounted inside four different hosts — which
    // is exactly why the prefix is the STAMP's rather than borrowed from
    // whichever surface it lands on.
    file: "components/praxisCard/scoreStamp/WowScoreStamp.tsx",
    slug: "wow",
    prefix: "wow-score-stamp",
    ground: "sheet",
    sites: 8,
  },
  {
    file: "components/feed/WowFeedFrame.tsx",
    slug: "wow",
    prefix: "wow-feed",
    ground: "sheet",
    sites: 6,
  },
  {
    file: "components/selectCard/WowSelectCard.tsx",
    slug: "wow",
    prefix: "wow-select-card",
    ground: "sheet",
    sites: 9,
  },
  {
    file: "components/metataskSeal/skins/WowSeal.tsx",
    slug: "wow",
    prefix: "wow-seal",
    ground: "sheet",
    sites: 7,
  },
  {
    file: "components/comments/voices/WowComment.tsx",
    slug: "wow",
    prefix: "wow-comment",
    ground: "sheet",
    sites: 5,
  },
  {
    file: "components/factionHero/WowFactionHero.tsx",
    slug: "wow",
    prefix: "wow-hero",
    ground: "sheet",
    sites: 5,
  },
  {
    // 3 reads from 3 removals, two of which cross into the shared, faction-blind
    // `BadgedAvatar` as PROPS — a custom property crosses that boundary where a
    // prefix could not, which is why the declaration sits on the plate root.
    file: "components/avatar/WowAvatar.tsx",
    slug: "wow",
    prefix: "wow-avatar",
    ground: "sheet",
    sites: 3,
  },
  {
    file: "pages/taskDetail/archetypes/WowTaskDetail.tsx",
    slug: "wow",
    prefix: "wow-task-page",
    ground: "sheet",
    sites: 5,
  },
  {
    file: "pages/praxisDetail/archetypes/WowPraxisDetail.tsx",
    slug: "wow",
    prefix: "wow-praxis-page",
    ground: "sheet",
    sites: 5,
  },
  {
    file: "pages/factionDetail/archetypes/WowFactionBody.tsx",
    slug: "wow",
    prefix: "wow-faction-page",
    ground: "sheet",
    sites: 5,
  },
  {
    // The one surface in this lane whose prefix is declared on ONE of its two
    // roots. The mobile pavilion is this file's own element; the desktop half
    // hands a dress to the shared `ProfileSkin`, which owns the page element all
    // nine factions mount on. Giving `ProfileDress` a root-vars slot is a
    // component prop — tree work, not a paint lane's. Until then the desktop
    // reads resolve through their fallbacks, which is byte-for-byte what
    // shipped, and the rows below are what prove it.
    file: "pages/characterProfile/archetypes/WowProfileBody.tsx",
    slug: "wow",
    prefix: "wow-profile",
    ground: "sheet",
    sites: 5,
  },
  {
    file: "pages/editPraxis/archetypes/WowEditPraxis.tsx",
    slug: "wow",
    prefix: "wow-edit-praxis",
    ground: "sheet",
    sites: 5,
  },
  {
    file: "pages/characterPaths/archetypes/WowCreateCharacter.tsx",
    slug: "wow",
    prefix: "wow-create",
    ground: "sheet",
    sites: 4,
  },

  /* -- Lane 05 (#2675): Singularity, 15 surfaces ---------------------------
   *
   * 48 own-slug core-role sites over 17 files. Two of the seventeen are absent
   * here on purpose: `avatar/SingularityAvatar` and
   * `characterProfile/archetypes/SingularityProfileBody` render NO ROOT at all
   * -- the avatar hands `BadgedAvatar` four discrete colour props and the
   * profile body is a dress `ProfileSkin` paints its own page root from -- so
   * neither has anywhere to declare a prefix, and both take `factionRoleVar`.
   * That is lane 04's rule (#2679) and their guard is
   * `utils/__tests__/singularityRoleReads.test.ts`, which also sweeps all
   * seventeen for a token named directly.
   *
   * Eight of the 48 sites are in those two files and one more is a direct read
   * in the feed chassis, so 37 prefixed role reads is the whole of the rest.
   * Two sites collapsed rather than moved -- the profile dress named `-card-bg`
   * and `-card-accent` a second time beside consts already holding exactly
   * those strings -- which is the shape of a deletion, not of a repaint.
   *
   * EVERY ONE IS `sheet`. Singularity declares no ground override, and the only
   * arguable surface is the mobile field desk: a whole phone screen, and the
   * nearest thing this kit has to app furniture. `chrome` is the rail's ground,
   * so the choice is a claim about what the surface IS rather than about what it
   * renders -- a field desk is a page of one faction's own content, not the
   * app's chrome wearing a faction. Raised in the PR rather than assumed. */

  {
    file: "components/metataskSeal/skins/SingularitySeal.tsx",
    slug: "singularity",
    prefix: "sg-seal",
    ground: "sheet",
    sites: 7,
  },
  {
    file: "components/factionHero/SingularityFactionHero.tsx",
    slug: "singularity",
    prefix: "sg-hero",
    ground: "sheet",
    sites: 5,
  },
  {
    file: "components/praxisCard/desktop/SingularityPraxisCard.tsx",
    slug: "singularity",
    prefix: "sg-praxis-card",
    ground: "sheet",
    sites: 5,
  },
  {
    file: "pages/factionDetail/archetypes/SingularityFactionBody.tsx",
    slug: "singularity",
    prefix: "sg-body",
    ground: "sheet",
    sites: 4,
  },
  {
    // Declared through `DuelSealSheet`'s `ground` prop, which that shared
    // block already spreads onto a root it owns -- the container every
    // child mounts inside, on the phone sheet and the desktop card alike.
    file: "components/duel/SingularityDuelSealConfirm.tsx",
    slug: "singularity",
    prefix: "sg-duel",
    ground: "sheet",
    sites: 4,
  },
  {
    file: "pages/fieldDesk/mobileArchetypes/SingularityFieldDesk.tsx",
    slug: "singularity",
    prefix: "sg-desk",
    ground: "sheet",
    sites: 3,
  },
  {
    file: "components/taskCard/SingularityTaskCard.tsx",
    slug: "singularity",
    prefix: "sg-task-card",
    ground: "sheet",
    sites: 1,
  },
  {
    // A kit module mounted by two hosts, one of them OUTSIDE the lane (the
    // score stamp, one of the frozen four). It renders a root of its own, so
    // the prefix is declared and read entirely within this file and no host
    // sees it -- which is what separates it from WOW's three rootless
    // vocabulary modules (#2679), which take `factionRoleVar` instead.
    file: "components/factionMarks/SingularityReadout.tsx",
    slug: "singularity",
    prefix: "sg-readout",
    ground: "sheet",
    sites: 1,
  },
  {
    // On the session slab, NOT on the `py-8` wrapper above it: that wrapper
    // also holds the breadcrumb, which is neutral shared site chrome on the
    // site's own ground (#2102).
    file: "pages/praxisDetail/archetypes/SingularityPraxisDetail.tsx",
    slug: "singularity",
    prefix: "sg-praxis-detail",
    ground: "sheet",
    sites: 1,
  },
  {
    file: "pages/taskDetail/archetypes/SingularityTaskDetail.tsx",
    slug: "singularity",
    prefix: "sg-task-detail",
    ground: "sheet",
    sites: 1,
  },
  {
    file: "components/selectCard/SingularitySelectCard.tsx",
    slug: "singularity",
    prefix: "sg-select",
    ground: "sheet",
    sites: 1,
  },
  {
    file: "components/comments/voices/SingularityComment.tsx",
    slug: "singularity",
    prefix: "sg-voice",
    ground: "sheet",
    sites: 1,
  },
  {
    // Two core reads, one of them prefixed. The actor's ink travels through
    // `FeedRowSkinContext` into the shared body, where `feedRowInk.test.tsx`
    // asserts the rendered `color:var(--faction-{slug}-...)` for all nine
    // chassis off ONE table; a var() wrapper there would make every lane edit
    // one contended row, so it stays a bare `factionRoleVar`.
    file: "components/feed/SingularityFeedFrame.tsx",
    slug: "singularity",
    prefix: "sg-feed",
    ground: "sheet",
    sites: 1,
  },
  {
    file: "pages/characterPaths/archetypes/SingularityCreateCharacter.tsx",
    slug: "singularity",
    prefix: "sg-path",
    ground: "sheet",
    sites: 1,
  },
  {
    // `pageStyle`, the root of BOTH stages -- the composer page and the shared
    // waiting surface -- as `EverymenEditPraxis` already had it.
    file: "pages/editPraxis/archetypes/SingularityEditPraxis.tsx",
    slug: "singularity",
    prefix: "sg-compose",
    ground: "sheet",
    sites: 1,
  },
];

/**
 * Lane 02's contact sheet - na/Default (#2672), the widest lane and the one the
 * other eight override.
 *
 * EVERY ROW'S SLUG IS `na`, AND THAT IS THE RULING, NOT A CONVENIENCE. These
 * archetypes are dispatched for `na`, for `albescent`, and for any slug without
 * a row of its own - but each of them stands on a ground that takes NO slug:
 * `factionSpectrumSheet()`, `factionSheet()`, `--faction-default-stamp-bg`,
 * `.na-backdrop`. "The ground moves with the ink or neither moves" (#2361), and
 * #2669 is what the other choice costs - an accent left on a wall it no longer
 * matched, 1.03:1. `DefaultSelectCard`'s docblock says the same from the copy
 * side: `slug` picks the words and the mark and never a colour, or an
 * unregistered slug lands in a borrowed livery (#796 / #418 / #636).
 *
 * So `factionRoleVars("na", ...)` returns `{}` at every one of these roots, and
 * pixel identity for this lane is UNCONDITIONAL rather than contingent on the
 * manifest staying saturated. What the prefix buys is not a live theme, it is a
 * NAME: a host dresses one surface by it instead of redeclaring
 * `--faction-default-card-text` and repainting every na descendant in its
 * subtree, which `SingularityPraxisDetail` does today.
 */
const LANE_02: Surface[] = [
  {
    file: "components/taskCard/DefaultTaskCard.tsx",
    slug: "na",
    prefix: "na-task-card",
    ground: "sheet",
    sites: 8,
  },
  {
    file: "components/praxisCard/desktop/DefaultPraxisCard.tsx",
    slug: "na",
    prefix: "na-praxis-card",
    ground: "sheet",
    // Four of the seven are `PraxisBody` PROPS - `tint` / `muted` / `paper` /
    // `fonts.display` - plain strings resolved inside this root's subtree, so a
    // role read reaches them exactly as a token read did.
    sites: 7,
  },
  {
    file: "components/praxisCard/scoreStamp/DefaultScoreStamp.tsx",
    slug: "na",
    prefix: "na-score-stamp",
    ground: "sheet",
    // Three roles, four reads. `--faction-default-stamp-bg` and `-card-line`
    // are deliberately NOT migrated: the stamp has a ground of its own, and its
    // hairline is `-card-line`, which is not the `line` role's `-card-border`.
    sites: 4,
  },
  {
    file: "components/selectCard/DefaultSelectCard.tsx",
    slug: "na",
    prefix: "na-select-card",
    ground: "sheet",
    sites: 7,
  },
  {
    file: "components/avatar/DefaultAvatar.tsx",
    slug: "na",
    prefix: "na-avatar",
    ground: "sheet",
    sites: 5,
  },
  {
    file: "components/metataskSeal/skins/DefaultSeal.tsx",
    slug: "na",
    prefix: "na-seal",
    ground: "sheet",
    sites: 5,
  },
  {
    file: "pages/taskDetail/archetypes/DefaultTaskDetail.tsx",
    slug: "na",
    prefix: "na-task-detail",
    ground: "sheet",
    sites: 4,
  },
  {
    file: "pages/praxisDetail/archetypes/DefaultPraxisDetail.tsx",
    slug: "na",
    prefix: "na-praxis-detail",
    ground: "sheet",
    // The spread is on the outermost `.py-8` box rather than on the sheet, so
    // the module-scope helpers above the component - the byline avatar, the
    // rail panel chrome - resolve wherever the page mounts them.
    sites: 14,
  },
  {
    file: "pages/editPraxis/archetypes/DefaultEditPraxis.tsx",
    slug: "na",
    prefix: "na-edit-praxis",
    ground: "sheet",
    // Three consts, three reads. The spread rides `dress.pageStyle`, the one
    // style BOTH stages mount - the composer page and `PraxisWaitingSurface`.
    sites: 3,
  },
  {
    file: "pages/characterProfile/archetypes/DefaultProfileBody.tsx",
    slug: "na",
    prefix: "na-profile-body",
    ground: "sheet",
    // Hoisted to a module const, because this file has TWO roots - the desktop
    // column and the `mobile-profile` one - and a prefix declared on one would
    // leave the other reading names nothing set.
    sites: 2,
  },
  {
    file: "pages/fieldDesk/mobileArchetypes/DefaultFieldDesk.tsx",
    slug: "na",
    prefix: "na-field-desk",
    ground: "sheet",
    sites: 2,
  },
  {
    file: "components/metataskSeal/sealBands.tsx",
    slug: "na",
    prefix: "na-band",
    ground: "sheet",
    sites: 3,
  },
  {
    file: "components/metataskSeal/sealBands.tsx",
    slug: "albescent",
    prefix: "alb-band",
    ground: "sheet",
    // The two bands in this file are two SURFACES, so they take two prefixes
    // rather than sharing one. `resolveCssKey` sends `albescent` to `default`,
    // so this row's expected fallbacks are byte-identical to the `band` row -
    // which is the whole of #783 / ADR-0048, and why batch 07 is a control
    // rather than a lane. `sealBands.tsx` is in lane 02; the five `Albescent*`
    // files are not.
    sites: 3,
  },
];

/**
 * How many roots a file spreads on: one, except where a file holds more than
 * one surface. Recorded rather than inferred, so a second unintended spread
 * cannot arrive quietly in a file that legitimately has two.
 */
const ROOTS_PER_FILE = new Map<string, number>([
  ["components/metataskSeal/sealBands.tsx", 2],
]);

/**
 * Every migrated surface, both lanes. A lane appends its own table above and
 * adds it here; the assertions below never learn a lane's name.
 */

/**
 * Lane 03 - UA (#2673). Sixteen surfaces, all `sheet`.
 *
 * The prefix stem is `leaf`, NOT `ua`: `--ua-*` is UA's RETIRED legacy family
 * and `__tests__/uaDesktopSkin.test.tsx` asserts `not.toMatch(/var\(--ua-[a-z]/)`
 * across eight surfaces. Widening that guard to exempt role suffixes would have
 * traded a live check for a naming convenience. Generalises: the slug is not
 * always available as a prefix stem.
 */
const LANE_03: Surface[] = [
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

const MIGRATED: Surface[] = [...SURFACES, ...LANE_02, ...LANE_03];

/**
 * A slug's TOKEN FAMILY, resolved rather than assumed.
 *
 * The straggler sweep hunts `var(--faction-<family>-…)`, and for six of the
 * nine slugs the family IS the slug. For `na` and `albescent` it is not:
 * `resolveCssKey` sends both to `default` (ADR-0039, #783). Spelling the slug
 * into that pattern would have hunted `--faction-na-card-bg`, a token that has
 * never existed — so the sweep would have found nothing and reported lane 02's
 * thirteen surfaces CLEAN whatever they said. A guard that silently narrows is
 * worse than one that fails, so the family comes out of the resolver.
 */
function familyOf(slug: string): string {
  const match = /^var\(--faction-([\w-]+)\)$/.exec(factionCssVar(slug));
  if (match === null) {
    throw new Error(`factionCssVar(${slug}) is not a bare family reference`);
  }
  return match[1];
}

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

describe("a faction lane — every migrated site keeps the value it shipped with", () => {
  it.each(MIGRATED)(
    "$file declares $prefix on the $ground ground",
    ({ file, slug, prefix, ground }) => {
      const source = readSource(file);
      const declarations = [
        ...source.matchAll(
          /factionRoleVars\(\s*["'`]([\w-]+)["'`]\s*,\s*["'`]([\w-]+)["'`]\s*(?:,\s*["'`](\w+)["'`]\s*)?\)/g,
        ),
      ];

      // One root per surface, except where a file holds more than one — the
      // two seal bands. `ROOTS_PER_FILE` records that, so a file with two
      // surfaces still cannot grow a third spread unnoticed.
      const roots = ROOTS_PER_FILE.get(file) ?? 1;
      expect(
        declarations.length,
        `${file} spreads factionRoleVars ${declarations.length} time(s); its surfaces need ${roots}`,
      ).toBe(roots);
      expect(
        declarations
          .map((match) => [match[1], match[2], match[3] ?? "sheet"])
          .filter((row) => row[1] === prefix),
        "the root spreads its own prefix, exactly once",
      ).toEqual([[slug, prefix, ground]]);
    },
  );

  it.each(MIGRATED)(
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
    const prefixes = MIGRATED.map((surface) => surface.prefix);
    expect(new Set(prefixes).size).toBe(prefixes.length);
  });

  it("leaves no core-role token named directly in a migrated file", () => {
    const CORE = String.raw`card-bg|card-text|card-muted|card-border|card-accent|on-fill|card-radius|card-font`;
    const stragglers = MIGRATED.flatMap(({ file, slug }) => {
      const source = readSource(file);
      // A bare read is any `--faction-<family>[-<core suffix>]` NOT sitting in
      // the fallback arm of a role read this FILE writes. Blanking the
      // fallbacks first is what makes "not preceded by" expressible without a
      // lookbehind whose width varies with the role name.
      //
      // Every prefix the file declares, not just this row's: `sealBands.tsx`
      // holds two surfaces, and blanking one band's fallbacks left the other's
      // looking like six bare reads. A file is swept once per surface, so the
      // sweep has to know about all of them.
      const withoutFallbacks = MIGRATED.filter(
        (surface) => surface.file === file,
      ).reduce(
        (text, surface) =>
          text.replace(
            new RegExp(
              String.raw`var\(\s*--${surface.prefix}-[\w-]+\s*,\s*var\(\s*--[\w-]+\s*\)\s*\)`,
              "g",
            ),
            "",
          ),
        source,
      );
      // The token half hunts the FAMILY (`default` for na and albescent), the
      // helper half hunts every SPELLING that reaches it — a source may write
      // `factionCssVar("na", …)` or `factionCssVar("default", …)` and both
      // resolve to the same property. #2676 found the helper form uncounted in
      // its own census; #2672's scope has none of it, and this is what keeps
      // that true rather than merely observed once.
      const family = familyOf(slug);
      const spellings = [...new Set([slug, family])].join("|");
      const bare = [
        ...withoutFallbacks.matchAll(
          new RegExp(String.raw`var\(\s*--faction-${family}(?:-(?:${CORE}))?\s*\)`, "g"),
        ),
        ...withoutFallbacks.matchAll(
          new RegExp(
            String.raw`factionCssVar\(\s*["'\`](?:${spellings})["'\`]\s*(?:,\s*["'\`](?:${CORE})["'\`]\s*)?\)`,
            "g",
          ),
        ),
      ];
      return bare.map((match) => `${file}: ${match[0]}`);
    });

    expect(stragglers).toEqual([]);
  });
});
