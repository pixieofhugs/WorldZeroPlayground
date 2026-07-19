/**
 * wow — the surfaces this faction overrides (#782).
 *
 * Override-only: any surface absent here renders that surface's `Default*`
 * archetype via `pickVariant`. Adding a surface is one line; no dispatcher is
 * touched. Removing one hands the surface back to the default.
 *
 * Entries are thunks (`() => Component`) so they are read at render time, never
 * during module evaluation — see the cycle note in `./manifest.ts`.
 */
import type { FactionManifest } from './manifest'

import WowAvatar from '../components/avatar/WowAvatar'
import WowBackdrop from '../components/backdrop/WowBackdrop'
import WowComment from '../components/comments/voices/WowComment'
import WowDuelRail from '../pages/praxisDetail/duelRails/WowDuelRail'
import WowDuelSealConfirm from '../components/duel/WowDuelSealConfirm'
import WowEditPraxis from '../pages/editPraxis/archetypes/WowEditPraxis'
import WowFactionBody from '../pages/factionDetail/archetypes/WowFactionBody'
import WowFactionHero from '../components/cards/WowFactionHero'
import WowFactionPage from '../pages/factionDetail/mobileArchetypes/WowFactionPage'
import WowFeedFrame from '../components/feed/WowFeedFrame'
import WowFieldDesk from '../pages/fieldDesk/mobileArchetypes/WowFieldDesk'
import WowMobileDuelRail from '../pages/praxisDetail/duelRails/WowMobileDuelRail'
import WowMobileDuelSealConfirm from '../components/duel/WowMobileDuelSealConfirm'
import WowMobileEditPraxis from '../pages/editPraxis/mobileArchetypes/WowEditPraxis'
import WowMobilePraxisCard from '../components/praxisCard/mobile/WowMobilePraxisCard'
import WowMobilePraxisDetail from '../pages/praxisDetail/mobileArchetypes/WowPraxisDetail'
import WowMobileTaskCard from '../pages/tasks/mobileArchetypes/cards/WowMobileTaskCard'
import WowMobileTaskDetail from '../pages/taskDetail/mobileArchetypes/WowTaskDetail'
import WowPraxisDetail from '../pages/praxisDetail/archetypes/WowPraxisDetail'
import WowProfileBody from '../pages/characterProfile/archetypes/WowProfileBody'
import WowTaskCard from '../components/cards/WowTaskCard'
import WowTaskDetail from '../pages/taskDetail/archetypes/WowTaskDetail'
import WowVote from '../components/vote/WowVote'
import { WowPraxisCard } from '../components/PraxisCard'
import { WowSigil } from '../components/cards/WowSigil'
import { WowCard } from '../components/cards/FactionCard'

export const WOW_MANIFEST: FactionManifest = {
  slug: 'wow',

  factionCard: () => WowCard,
  taskCard: () => WowTaskCard,
  praxisCard: () => WowPraxisCard,
  avatar: () => WowAvatar,
  backdrop: () => WowBackdrop,
  sigil: () => WowSigil,
  comment: () => WowComment,
  feedFrame: () => WowFeedFrame,
  vote: () => WowVote,
  taskDetail: () => WowTaskDetail,
  praxisDetail: () => WowPraxisDetail,
  editPraxis: () => WowEditPraxis,
  factionHero: () => WowFactionHero,
  factionBody: () => WowFactionBody,
  profileBody: () => WowProfileBody,
  duelSeal: () => WowDuelSealConfirm,
  duelRail: () => WowDuelRail,
  mobileTaskCard: () => WowMobileTaskCard,
  mobilePraxisCard: () => WowMobilePraxisCard,
  mobileTaskDetail: () => WowMobileTaskDetail,
  mobilePraxisDetail: () => WowMobilePraxisDetail,
  mobileEditPraxis: () => WowMobileEditPraxis,
  mobileFactionPage: () => WowFactionPage,
  mobileFieldDesk: () => WowFieldDesk,
  mobileDuelSeal: () => WowMobileDuelSealConfirm,
  mobileDuelRail: () => WowMobileDuelRail,
}
