/**
 * wow — Warriors of Whimsy's FIRST bespoke surfaces (#821).
 *
 * #784 stripped WOW's old lo-fi pink `.exe` identity (it moved to Cozy Coven),
 * and #812 gave back only a yellow THEME — no skin. This manifest is the first
 * slice of WOW's own kit: the CHRONICLE OF PROOF praxis card (cream/gold/plum —
 * ADR-0050; the yellow it briefly wore came from a mislabelled mockup), its
 * score stamp with the ✦ total mark, and the googly-balloon vote widget. (The
 * card shipped with a mobile twin; ADR-0067 retired it, so the one card serves
 * both form factors.)
 *
 * #897 adds THE CREST — WOW's `sigil`, the mark every other surface in the kit
 * imports — and its first consumer, the `avatar`: the crest set in a gilt rope
 * ring with the rank pill riding the hem.
 *
 * #895 adds THE LISTS — the duel seal on both form factors, dressed as a tourney
 * joust (gold-framed enclosure, checkered barrier, the opponent held as a
 * rosette ring, a ribbon for the loser). The shared vocabulary lives in
 * `components/duel/wowLists.tsx`. It shipped as FOUR surfaces; the two rail
 * skins went with the `duelRail` / `mobileDuelRail` surfaces themselves in
 * #1090, when the duel became a card inside praxis detail rather than a
 * dispatched surface of its own.
 *
 * #835 adds the DESKTOP edit-praxis composer — "The Squire's Writ", the kit's
 * one form surface — and #836 its phone twin: the same writ dress on the settled
 * mobile composer structure (Write/Preview toggle, fluid media grid, sticky
 * submit bar), since the kit draws no mobile composer of its own.
 *
 * #899 adds the three surfaces that REPEAT everywhere: the DECREE task card —
 * the kit calls it "the archetype the others mirror", and the comment and feed
 * frame follow its chrome — plus that comment voice and the herald's-dispatch
 * feed frame. A quest is ISSUED by decree and proof is RECORDED in the
 * chronicle: two chromes on one palette, deliberately unalike (#785's "the
 * praxis card mirrors the task card" clause is retired for WOW).
 *
 * #1204 REDRESSES those last two on one sheet — "Warrior of Whimsy Comment +
 * Update Cards" (epic #1192). Both rows are unchanged; the components behind
 * them are not. `feedFrame` stopped being a `{ children }` wrapper and became
 * THE CHRONICLE PROCLAMATION, a chassis drawing the kicker, the tag, the time
 * and the archive control (`FeedFrameProps`, #1194); `comment` follows the same
 * sheet, so the counsel now wears the proclamation's own chrome — barber ribbon,
 * 2px gold frame, radius 9 — instead of v1's plum-ruled slip. The herald's-
 * dispatch masthead is gone with it: `kicker` is a card's only kind label. Not a
 * word of that sheet's dialect ships; the epic's copy spec is the Unaffiliated
 * sheet and the faction carries identity in dress alone.
 *
 * #1037 adds the desktop `taskDetail` — THE PARCHMENT FIELD: gold-and-plum
 * parchment under a dot texture, bunting across the head, a struck points
 * plaque, wavy gold→plum rules and a bunch of googly balloons. It is the first
 * of #951's four missing desktop surfaces to ship. There is no mobile twin row
 * beneath it: ADR-0058 collapsed task detail to one responsive component per
 * faction, so this archetype serves both form factors.
 *
 * #1121 adds `praxisDetail` — THE CHRONICLE ENTRY, the second of those four. A
 * quest is ISSUED by decree and proof is RECORDED in the chronicle (ADR-0050),
 * so this is the same parchment ground with the volume open at somebody's entry:
 * bunting, cream plates in gold frames, wavy rules, and one bobbing bunch of
 * balloons beside the comments. It is dress over the ONE shared praxis-detail
 * page (ADR-0061) rather than a page of its own — the layout, the API contract
 * and every word on it are the shared ones; WOW speaks here only in dress.
 * `factionBody` remains unclaimed on #951 (`factionCard`, the fourth bullet,
 * was retired as a surface by #2024).
 *
 * The three ornaments those two pages share — the wavy rule, the balloon bunch
 * and the bunting — live in `components/factionMarks/wowOrnament.tsx`, drawn once for
 * the whole faction (§6/#849).
 *
 * #900 adds the PAGE-LEVEL desktop surfaces: the recruiting `factionHero`, the
 * `backdrop` wallpaper every WOW-context page sits on, the crested `profileBody`
 * and the `factionSelectCard` pledge placard. `factionBody` stays unclaimed on
 * purpose — the kit drew the faction HERO, not the page beneath it, so it keeps
 * defaulting until it is designed.
 *
 * #901 adds THE FIELD PAVILION — the general MOBILE surfaces. The kit drew
 * exactly one phone screen, and what survives of it is `mobileFieldDesk`.
 * (#901 derived five more surfaces off that screen which no longer exist: its
 * task card, its task detail, its praxis detail, its PROFILE and its FACTION
 * PAGE. ADR-0056, ADR-0058, ADR-0061, #1319 and ADR-0078 retired all five
 * surfaces outright, so `taskCard`, `taskDetail`, `praxisDetail` — since
 * #1121 — `profileBody` and `factionBody` each serve WOW on both form factors.
 * The pavilion profile was not deleted with its surface: it is the phone branch
 * inside `WowProfileBody`, which is what "one responsive component" means here.
 * The pavilion faction page was: `WowFactionBody` had already taken its section
 * order and its join flow when #1611 derived that body, so nothing was left in
 * the phone skin that the body did not say better.)
 * The shared vocabulary lives in `components/factionMarks/wowMobile.tsx`.
 * `mobileCreateCharacter`, `mobileEditCharacter`, `mobileFactionsDirectory` and
 * `mobilePlayersDirectory` were unclaimed here on purpose — nothing in the kit
 * described them — and since no other faction claimed them either, the four
 * slots were retired outright; those pages render their `Default*` skin.
 *
 * Override-only, like every manifest — WOW simply overrides all of it now: it
 * claims every key in `SURFACE_KEYS`, and `surfaceDispatch.test.ts` holds it
 * there by deriving the bar from what the reference factions skin.
 *
 * Entries are thunks (`() => Component`) so they are read at render time, never
 * during module evaluation — see the cycle note in `./manifest.ts`.
 */
import type { FactionManifest } from './manifest'
import { lazyArchetype } from './lazyArchetype'

const WowAvatar = lazyArchetype(() => import('../components/avatar/WowAvatar'))
const WowBackdrop = lazyArchetype(() => import('../components/backdrop/WowBackdrop'))
const WowSelectCard = lazyArchetype(() => import('../components/selectCard/WowSelectCard'))
const WowComment = lazyArchetype(() => import('../components/comments/voices/WowComment'))
const WowFeedFrame = lazyArchetype(() => import('../components/feed/WowFeedFrame'))
const WowFactionHero = lazyArchetype(() => import('../components/factionHero/WowFactionHero'))
const WowSigil = lazyArchetype(() => import('../components/sigil/WowSigil').then((m) => ({ default: m.WowSigil })))
const WowTaskCard = lazyArchetype(() => import('../components/taskCard/WowTaskCard'))
const WowProfileBody = lazyArchetype(() => import('../pages/characterProfile/archetypes/WowProfileBody'))
const WowVote = lazyArchetype(() => import('../components/vote/WowVote'))
const WowPraxisCard = lazyArchetype(() => import('../components/praxisCard/desktop/WowPraxisCard'))
const WowScoreStamp = lazyArchetype(() => import('../components/praxisCard/scoreStamp/WowScoreStamp'))
const WowSeal = lazyArchetype(() => import('../components/metataskSeal/skins/WowSeal'))
const WowEditPraxis = lazyArchetype(() => import('../pages/editPraxis/archetypes/WowEditPraxis'))
const WowDuelSealConfirm = lazyArchetype(() => import('../components/duel/WowDuelSealConfirm'))
const WowFieldDesk = lazyArchetype(() => import('../pages/fieldDesk/mobileArchetypes/WowFieldDesk'))
const WowTaskDetail = lazyArchetype(() => import('../pages/taskDetail/archetypes/WowTaskDetail'))
const WowPraxisDetail = lazyArchetype(() => import('../pages/praxisDetail/archetypes/WowPraxisDetail'))
const WowFactionBody = lazyArchetype(() => import('../pages/factionDetail/archetypes/WowFactionBody'))
const WowCreateCharacter = lazyArchetype(() => import('../pages/characterPaths/archetypes/WowCreateCharacter'))

export const WOW_MANIFEST: FactionManifest = {
  slug: 'wow',

  sigil: () => WowSigil,
  avatar: () => WowAvatar,
  taskCard: () => WowTaskCard,
  // #1037 — the parchment field: WOW's FIRST desktop task-detail page. Until
  // this row a WOW task rendered the na dossier on desktop (one of #951's four
  // bullets; praxisDetail and factionBody were still open, and the fourth,
  // `factionCard`, is a surface #2024 has since retired).
  taskDetail: () => WowTaskDetail,
  // #1121 — the chronicle entry: WOW's dress over the ONE shared praxis-detail
  // page (ADR-0061). The second of #951's four bullets to close; `factionBody`
  // was still unclaimed. One responsive component, no mobile
  // twin (ADR-0063): #1089 retired the `mobilePraxisDetail` surface outright, so
  // this archetype serves both form factors.
  praxisDetail: () => WowPraxisDetail,
  comment: () => WowComment,
  feedFrame: () => WowFeedFrame,
  praxisCard: () => WowPraxisCard,
  scoreStamp: () => WowScoreStamp,
  metataskSeal: () => WowSeal,
  vote: () => WowVote,
  editPraxis: () => WowEditPraxis,

  // #900 — the page-level desktop surfaces.
  factionHero: () => WowFactionHero,
  // The PAGE beneath that hero. #900 drew the recruiting banner and left the
  // body defaulting, so a WOW faction page was a gilt banner over the na
  // placeholder — and, at the time, with no way to enlist. Derived rather than
  // drawn (no sheet exists): the ornaments come from `wowOrnament`, the section
  // order from the phone twin that ADR-0078 has since retired, and the main +
  // rail shape from the other six bodies. The copy was already in
  // `factions.json` from #900, unread until now. This now serves BOTH widths.
  // Third of #951's four bullets — and, since #2024 retired the `factionCard`
  // surface outright, the last one standing.
  factionBody: () => WowFactionBody,
  backdrop: () => WowBackdrop,
  profileBody: () => WowProfileBody,
  factionSelectCard: () => WowSelectCard,

  // #895 — the lists: the duel seal, both form factors from ONE component since
  // #1313 retired the `mobileDuelSeal` twin (the Lists sheet is responsive now,
  // not deleted). Its rail skins went with the `duelRail` / `mobileDuelRail`
  // SURFACES in #1090, not with WOW.
  duelSeal: () => WowDuelSealConfirm,

  // #901 — the field pavilion: WOW's general MOBILE surfaces. The kit drew ONE
  // phone screen, and this is it. (Five more were derived from it and are gone:
  // ADR-0056 retired the task-card twin, ADR-0058 the task-detail one, ADR-0061
  // the praxis-detail one, #1319 the PROFILE one and ADR-0078 the FACTION PAGE
  // one, so `taskCard`, `taskDetail`, `profileBody` and `factionBody` now serve
  // both form factors and praxis detail is one shared page. The pavilion
  // profile itself survives inside `WowProfileBody`.)
  mobileFieldDesk: () => WowFieldDesk,

  // #2350 — THE CHARTER: WOW's dress over character creation, the surface #2346
  // declared and #2347 first filled. Derived rather than drawn — the owner ruled
  // no design was needed, because the DECREE task card and the WRIT composer
  // carry the register between them: the decree's head (barber ribbon, pennants,
  // balloons) over the writ's chassis (gilt sheet, parchment fields, one zigzag,
  // the full-bleed gold cast band). ONE responsive component; the
  // `mobileCreateCharacter` slot retired with #901's note above and stays retired.
  createCharacter: () => WowCreateCharacter,
}
