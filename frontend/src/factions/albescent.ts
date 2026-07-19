/**
 * albescent — the surfaces this faction overrides (#782).
 *
 * Override-only: any surface absent here renders that surface's `Default*`
 * archetype via `pickVariant`. Adding a surface is one line; no dispatcher is
 * touched. Removing one hands the surface back to the default.
 *
 * Entries are thunks (`() => Component`) so they are read at render time, never
 * during module evaluation — see the cycle note in `./manifest.ts`.
 */
import type { FactionManifest } from './manifest'

import AlbescentAvatar from '../components/avatar/AlbescentAvatar'
import AlbescentBackdrop from '../components/backdrop/AlbescentBackdrop'
import AlbescentComment from '../components/comments/voices/AlbescentComment'
import AlbescentEditPraxis from '../pages/editPraxis/archetypes/AlbescentEditPraxis'
import AlbescentFactionBody from '../pages/factionDetail/archetypes/AlbescentFactionBody'
import AlbescentFactionHero from '../components/cards/AlbescentFactionHero'
import AlbescentFactionPage from '../pages/factionDetail/mobileArchetypes/AlbescentFactionPage'
import AlbescentFeedFrame from '../components/feed/AlbescentFeedFrame'
import AlbescentHome from '../pages/fieldDesk/mobileArchetypes/AlbescentHome'
import AlbescentMobileEditPraxis from '../pages/editPraxis/mobileArchetypes/AlbescentComposer'
import AlbescentMobilePraxisCard from '../components/praxisCard/mobile/AlbescentMobilePraxisCard'
import AlbescentMobilePraxisDetail from '../pages/praxisDetail/mobileArchetypes/AlbescentPraxisDetail'
import AlbescentMobileTaskCard from '../pages/tasks/mobileArchetypes/cards/AlbescentMobileTaskCard'
import AlbescentMobileTaskDetail from '../pages/taskDetail/mobileArchetypes/AlbescentTaskDetail'
import AlbescentPraxisDetail from '../pages/praxisDetail/archetypes/AlbescentPraxisDetail'
import AlbescentProfileBody from '../pages/characterProfile/archetypes/AlbescentProfileBody'
import AlbescentTaskCard from '../components/cards/AlbescentTaskCard'
import AlbescentTaskDetail from '../pages/taskDetail/archetypes/AlbescentTaskDetail'
import AlbescentVote from '../components/vote/AlbescentVote'
import { AlbescentPraxisCard } from '../components/PraxisCard'
import { AlbescentSigilAdapter } from '../components/cards/FactionSigil'
import { AlbescentSelectCard } from '../components/cards/FactionSelectCard'

export const ALBESCENT_MANIFEST: FactionManifest = {
  slug: 'albescent',

  factionSelectCard: () => AlbescentSelectCard,
  taskCard: () => AlbescentTaskCard,
  praxisCard: () => AlbescentPraxisCard,
  avatar: () => AlbescentAvatar,
  backdrop: () => AlbescentBackdrop,
  sigil: () => AlbescentSigilAdapter,
  comment: () => AlbescentComment,
  feedFrame: () => AlbescentFeedFrame,
  vote: () => AlbescentVote,
  taskDetail: () => AlbescentTaskDetail,
  praxisDetail: () => AlbescentPraxisDetail,
  editPraxis: () => AlbescentEditPraxis,
  factionHero: () => AlbescentFactionHero,
  factionBody: () => AlbescentFactionBody,
  profileBody: () => AlbescentProfileBody,
  mobileTaskCard: () => AlbescentMobileTaskCard,
  mobilePraxisCard: () => AlbescentMobilePraxisCard,
  mobileTaskDetail: () => AlbescentMobileTaskDetail,
  mobilePraxisDetail: () => AlbescentMobilePraxisDetail,
  mobileEditPraxis: () => AlbescentMobileEditPraxis,
  mobileFactionPage: () => AlbescentFactionPage,
  mobileFieldDesk: () => AlbescentHome,
}
