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
 * #895 adds THE LISTS — the duel seal and the duel rail, on both form factors:
 * WOW's four duel surfaces, dressed as a tourney joust (gold-framed enclosure,
 * checkered barrier, the opponent held as a rosette ring, a ribbon for the
 * loser). The shared vocabulary lives in `components/duel/wowLists.tsx`.
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
 * #900 adds the PAGE-LEVEL desktop surfaces: the recruiting `factionHero`, the
 * `backdrop` wallpaper every WOW-context page sits on, the crested `profileBody`
 * and the `factionSelectCard` pledge placard. `factionBody` and `factionCard`
 * stay unclaimed on purpose — the kit drew the faction HERO, not the page
 * beneath it, so those keep defaulting until they are designed.
 *
 * #901 adds THE FIELD PAVILION — the six general MOBILE surfaces. The kit drew
 * exactly one phone screen, which maps to `mobileFieldDesk` and
 * `mobileTaskCard`; `mobileTaskDetail`, `mobilePraxisDetail`,
 * `mobileFactionPage` and `mobileProfile` are DERIVED from that screen's chrome
 * plus the matching desktop archetype, and each names its source in its own
 * docstring. The shared vocabulary lives in `components/cards/wowMobile.tsx`.
 * `mobileCreateCharacter`, `mobileEditCharacter`, `mobileFactionsDirectory` and
 * `mobilePlayersDirectory` stay unclaimed on purpose — nothing in the kit
 * describes them.
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

import WowAvatar from '../components/avatar/WowAvatar'
import WowBackdrop from '../components/backdrop/WowBackdrop'
import { WOWSelectCard } from '../components/cards/FactionSelectCard'
import WowComment from '../components/comments/voices/WowComment'
import WowFeedFrame from '../components/feed/WowFeedFrame'
import WowFactionHero from '../components/cards/WowFactionHero'
import { WowSigil } from '../components/cards/WowSigil'
import WowTaskCard from '../components/cards/WowTaskCard'
import WowProfileBody from '../pages/characterProfile/archetypes/WowProfileBody'
import WowVote from '../components/vote/WowVote'
import WowMobilePraxisCard from '../components/praxisCard/mobile/WowMobilePraxisCard'
import WowPraxisCard from '../components/praxisCard/desktop/WowPraxisCard'
import WowScoreStamp from '../components/praxisCard/scoreStamp/WowScoreStamp'
import WowSeal from '../components/metaTaskSeal/skins/WowSeal'
import WowEditPraxis from '../pages/editPraxis/archetypes/WowEditPraxis'
import WowMobileEditPraxis from '../pages/editPraxis/mobileArchetypes/WowEditPraxis'
import WowDuelSealConfirm from '../components/duel/WowDuelSealConfirm'
import WowMobileDuelSealConfirm from '../components/duel/WowMobileDuelSealConfirm'
import WowDuelRail from '../pages/praxisDetail/duelRails/WowDuelRail'
import WowMobileDuelRail from '../pages/praxisDetail/duelRails/WowMobileDuelRail'
import WowFieldDesk from '../pages/fieldDesk/mobileArchetypes/WowFieldDesk'
import WowMobileTaskCard from '../pages/tasks/mobileArchetypes/cards/WowMobileTaskCard'
import WowMobileTaskDetail from '../pages/taskDetail/mobileArchetypes/WowTaskDetail'
import WowMobilePraxisDetail from '../pages/praxisDetail/mobileArchetypes/WowPraxisDetail'
import WowMobileFactionPage from '../pages/factionDetail/mobileArchetypes/WowFactionPage'
import WowMobileProfile from '../pages/characterProfile/mobileArchetypes/WowProfile'

export const WOW_MANIFEST: FactionManifest = {
  slug: 'wow',

  sigil: () => WowSigil,
  avatar: () => WowAvatar,
  taskCard: () => WowTaskCard,
  comment: () => WowComment,
  feedFrame: () => WowFeedFrame,
  praxisCard: () => WowPraxisCard,
  scoreStamp: () => WowScoreStamp,
  metaTaskSeal: () => WowSeal,
  mobilePraxisCard: () => WowMobilePraxisCard,
  vote: () => WowVote,
  editPraxis: () => WowEditPraxis,
  mobileEditPraxis: () => WowMobileEditPraxis,

  // #900 — the page-level desktop surfaces.
  factionHero: () => WowFactionHero,
  backdrop: () => WowBackdrop,
  profileBody: () => WowProfileBody,
  factionSelectCard: () => WOWSelectCard,

  // #895 — the lists: the duel seal and the praxis rail, both form factors.
  duelSeal: () => WowDuelSealConfirm,
  duelRail: () => WowDuelRail,
  mobileDuelSeal: () => WowMobileDuelSealConfirm,
  mobileDuelRail: () => WowMobileDuelRail,

  // #901 — the field pavilion: WOW's six general MOBILE surfaces. The kit drew
  // ONE phone screen, which is the `mobileFieldDesk` and the `mobileTaskCard`;
  // the other four are derived from that screen's chrome plus the matching
  // desktop archetype, and each says which in its own docstring.
  mobileFieldDesk: () => WowFieldDesk,
  mobileTaskCard: () => WowMobileTaskCard,
  mobileTaskDetail: () => WowMobileTaskDetail,
  mobilePraxisDetail: () => WowMobilePraxisDetail,
  mobileFactionPage: () => WowMobileFactionPage,
  mobileProfile: () => WowMobileProfile,
}
