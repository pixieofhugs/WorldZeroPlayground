/**
 * wow — Warriors of Whimsy's FIRST bespoke surfaces (#821).
 *
 * #784 stripped WOW's old lo-fi pink `.exe` identity (it moved to Cozy Coven),
 * and #812 gave back only a yellow THEME — no skin. This manifest is the first
 * slice of WOW's own kit: the CHRONICLE OF PROOF praxis card (cream/gold/plum —
 * ADR-0050; the yellow it briefly wore came from a mislabelled mockup), its
 * score stamp with the ✦ total mark, its mobile twin, and the googly-balloon
 * vote widget.
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
 * `factionCard` and `factionBody` remain unclaimed on #951.
 *
 * The three ornaments those two pages share — the wavy rule, the balloon bunch
 * and the bunting — live in `components/cards/wowOrnament.tsx`, drawn once for
 * the whole faction (§6/#849).
 *
 * #900 adds the PAGE-LEVEL desktop surfaces: the recruiting `factionHero`, the
 * `backdrop` wallpaper every WOW-context page sits on, the crested `profileBody`
 * and the `factionSelectCard` pledge placard. `factionBody` and `factionCard`
 * stay unclaimed on purpose — the kit drew the faction HERO, not the page
 * beneath it, so those keep defaulting until they are designed.
 *
 * #901 adds THE FIELD PAVILION — the general MOBILE surfaces. The kit drew
 * exactly one phone screen, which maps to `mobileFieldDesk`; `mobileFactionPage`
 * and `mobileProfile` are DERIVED from that screen's chrome plus the matching
 * desktop archetype, and each names its source in its own docstring. (#901 drew
 * three more surfaces off that screen which no longer exist: its task card, its
 * task detail and its praxis detail. ADR-0056, ADR-0058 and ADR-0061 retired all
 * three surfaces outright, so `taskCard`, `taskDetail` and — since #1121 —
 * `praxisDetail` each serve WOW on both form factors.)
 * The shared vocabulary lives in `components/cards/wowMobile.tsx`.
 * `mobileCreateCharacter`, `mobileEditCharacter`, `mobileFactionsDirectory` and
 * `mobilePlayersDirectory` were unclaimed here on purpose — nothing in the kit
 * described them — and since no other faction claimed them either, the four
 * slots were retired outright; those pages render their `Default*` skin.
 *
 * Override-only, like every manifest: WOW still falls through to the `Default*`
 * archetype on every OTHER surface — it is themed-and-partly-skinned now, not
 * fully dressed. `wowRendersDefault.test.tsx` pins exactly which surfaces are
 * claimed and asserts the rest still fall back.
 *
 * Entries are thunks (`() => Component`) so they are read at render time, never
 * during module evaluation — see the cycle note in `./manifest.ts`.
 */
import type { FactionManifest } from './manifest'
import { lazyArchetype } from './lazyArchetype'

const WowAvatar = lazyArchetype(() => import('../components/avatar/WowAvatar'))
const WowBackdrop = lazyArchetype(() => import('../components/backdrop/WowBackdrop'))
const WOWSelectCard = lazyArchetype(() => import('../components/cards/FactionSelectCard').then((m) => ({ default: m.WOWSelectCard })))
const WowComment = lazyArchetype(() => import('../components/comments/voices/WowComment'))
const WowFeedFrame = lazyArchetype(() => import('../components/feed/WowFeedFrame'))
const WowFactionHero = lazyArchetype(() => import('../components/cards/WowFactionHero'))
const WowSigil = lazyArchetype(() => import('../components/cards/WowSigil').then((m) => ({ default: m.WowSigil })))
const WowTaskCard = lazyArchetype(() => import('../components/cards/WowTaskCard'))
const WowProfileBody = lazyArchetype(() => import('../pages/characterProfile/archetypes/WowProfileBody'))
const WowVote = lazyArchetype(() => import('../components/vote/WowVote'))
const WowMobilePraxisCard = lazyArchetype(() => import('../components/praxisCard/mobile/WowMobilePraxisCard'))
const WowPraxisCard = lazyArchetype(() => import('../components/praxisCard/desktop/WowPraxisCard'))
const WowScoreStamp = lazyArchetype(() => import('../components/praxisCard/scoreStamp/WowScoreStamp'))
const WowSeal = lazyArchetype(() => import('../components/metaTaskSeal/skins/WowSeal'))
const WowEditPraxis = lazyArchetype(() => import('../pages/editPraxis/archetypes/WowEditPraxis'))
const WowDuelSealConfirm = lazyArchetype(() => import('../components/duel/WowDuelSealConfirm'))
const WowMobileDuelSealConfirm = lazyArchetype(() => import('../components/duel/WowMobileDuelSealConfirm'))
const WowFieldDesk = lazyArchetype(() => import('../pages/fieldDesk/mobileArchetypes/WowFieldDesk'))
const WowTaskDetail = lazyArchetype(() => import('../pages/taskDetail/archetypes/WowTaskDetail'))
const WowPraxisDetail = lazyArchetype(() => import('../pages/praxisDetail/archetypes/WowPraxisDetail'))
const WowMobileFactionPage = lazyArchetype(() => import('../pages/factionDetail/mobileArchetypes/WowFactionPage'))
const WowMobileProfile = lazyArchetype(() => import('../pages/characterProfile/mobileArchetypes/WowProfile'))

export const WOW_MANIFEST: FactionManifest = {
  slug: 'wow',

  sigil: () => WowSigil,
  avatar: () => WowAvatar,
  taskCard: () => WowTaskCard,
  // #1037 — the parchment field: WOW's FIRST desktop task-detail page. Until
  // this row a WOW task rendered the na dossier on desktop (one of #951's four
  // bullets; praxisDetail, factionCard and factionBody are still open).
  taskDetail: () => WowTaskDetail,
  // #1121 — the chronicle entry: WOW's dress over the ONE shared praxis-detail
  // page (ADR-0061). The second of #951's four bullets to close; `factionCard`
  // and `factionBody` are still unclaimed. One responsive component, no mobile
  // twin (ADR-0063): #1089 retired the `mobilePraxisDetail` surface outright, so
  // this archetype serves both form factors.
  praxisDetail: () => WowPraxisDetail,
  comment: () => WowComment,
  feedFrame: () => WowFeedFrame,
  praxisCard: () => WowPraxisCard,
  scoreStamp: () => WowScoreStamp,
  metaTaskSeal: () => WowSeal,
  mobilePraxisCard: () => WowMobilePraxisCard,
  vote: () => WowVote,
  editPraxis: () => WowEditPraxis,

  // #900 — the page-level desktop surfaces.
  factionHero: () => WowFactionHero,
  backdrop: () => WowBackdrop,
  profileBody: () => WowProfileBody,
  factionSelectCard: () => WOWSelectCard,

  // #895 — the lists: the duel seal, both form factors. Its rail skins went with
  // the `duelRail` / `mobileDuelRail` SURFACES in #1090, not with WOW.
  duelSeal: () => WowDuelSealConfirm,
  mobileDuelSeal: () => WowMobileDuelSealConfirm,

  // #901 — the field pavilion: WOW's general MOBILE surfaces. The kit drew ONE
  // phone screen, which is the `mobileFieldDesk`; the other two are derived
  // from that screen's chrome plus the matching desktop archetype, and each says
  // which in its own docstring. (Three more were derived from it and are gone:
  // ADR-0056 retired the task-card twin, ADR-0058 the task-detail one and
  // ADR-0061 the praxis-detail one, so `taskCard` and `taskDetail` now serve
  // both form factors and praxis detail is one shared page.)
  mobileFieldDesk: () => WowFieldDesk,
  mobileFactionPage: () => WowMobileFactionPage,
  mobileProfile: () => WowMobileProfile,
}
