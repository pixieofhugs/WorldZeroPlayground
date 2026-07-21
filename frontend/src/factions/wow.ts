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
 * Override-only, like every manifest: WOW still falls through to the `Default*`
 * archetype on every OTHER surface — it is themed-and-partly-skinned now, not
 * fully dressed. `wowRendersDefault.test.tsx` pins exactly which six surfaces
 * are claimed and asserts the rest still fall back.
 *
 * Entries are thunks (`() => Component`) so they are read at render time, never
 * during module evaluation — see the cycle note in `./manifest.ts`.
 */
import type { FactionManifest } from './manifest'

import WowAvatar from '../components/avatar/WowAvatar'
import { WowSigil } from '../components/cards/WowSigil'
import WowVote from '../components/vote/WowVote'
import WowMobilePraxisCard from '../components/praxisCard/mobile/WowMobilePraxisCard'
import WowPraxisCard from '../components/praxisCard/desktop/WowPraxisCard'
import WowScoreStamp from '../components/praxisCard/scoreStamp/WowScoreStamp'
import WowEditPraxis from '../pages/editPraxis/archetypes/WowEditPraxis'
import WowMobileEditPraxis from '../pages/editPraxis/mobileArchetypes/WowEditPraxis'
import WowDuelSealConfirm from '../components/duel/WowDuelSealConfirm'
import WowMobileDuelSealConfirm from '../components/duel/WowMobileDuelSealConfirm'
import WowDuelRail from '../pages/praxisDetail/duelRails/WowDuelRail'
import WowMobileDuelRail from '../pages/praxisDetail/duelRails/WowMobileDuelRail'

export const WOW_MANIFEST: FactionManifest = {
  slug: 'wow',

  sigil: () => WowSigil,
  avatar: () => WowAvatar,
  praxisCard: () => WowPraxisCard,
  scoreStamp: () => WowScoreStamp,
  mobilePraxisCard: () => WowMobilePraxisCard,
  vote: () => WowVote,
  editPraxis: () => WowEditPraxis,
  mobileEditPraxis: () => WowMobileEditPraxis,

  duelSeal: () => WowDuelSealConfirm,
  duelRail: () => WowDuelRail,
  mobileDuelSeal: () => WowMobileDuelSealConfirm,
  mobileDuelRail: () => WowMobileDuelRail,
}
