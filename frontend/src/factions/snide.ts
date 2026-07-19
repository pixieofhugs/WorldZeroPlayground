/**
 * snide — the surfaces this faction overrides (#782).
 *
 * Override-only: any surface absent here renders that surface's `Default*`
 * archetype via `pickVariant`. Adding a surface is one line; no dispatcher is
 * touched. Removing one hands the surface back to the default.
 *
 * Entries are thunks (`() => Component`) so they are read at render time, never
 * during module evaluation — see the cycle note in `./manifest.ts`.
 */
import type { FactionManifest } from './manifest'

import SnideAvatar from '../components/avatar/SnideAvatar'
import SnideBackdrop from '../components/backdrop/SnideBackdrop'
import SnideComment from '../components/comments/voices/SnideComment'
import SnideEditPraxis from '../pages/editPraxis/archetypes/SnideEditPraxis'
import SnideFactionBody from '../pages/factionDetail/archetypes/SnideFactionBody'
import SnideFactionHero from '../components/cards/SnideFactionHero'
import SnideFactionPage from '../pages/factionDetail/mobileArchetypes/SnideFactionPage'
import SnideFeedFrame from '../components/feed/SnideFeedFrame'
import SnideHome from '../pages/fieldDesk/mobileArchetypes/SnideHome'
import SnideMobileEditPraxis from '../pages/editPraxis/mobileArchetypes/SnideComposer'
import SnideMobilePraxisCard from '../components/praxisCard/mobile/SnideMobilePraxisCard'
import SnideMobilePraxisDetail from '../pages/praxisDetail/mobileArchetypes/SnidePraxisDetail'
import SnideMobileTaskCard from '../pages/tasks/mobileArchetypes/cards/SnideMobileTaskCard'
import SnideMobileTaskDetail from '../pages/taskDetail/mobileArchetypes/SnideTaskDetail'
import SnidePraxisDetail from '../pages/praxisDetail/archetypes/SnidePraxisDetail'
import SnideProfileBody from '../pages/characterProfile/archetypes/SnideProfileBody'
import SnideTaskCard from '../components/cards/SnideTaskCard'
import SnideTaskDetail from '../pages/taskDetail/archetypes/SnideTaskDetail'
import SnideVote from '../components/vote/SnideVote'
import { SnidePraxisCard } from '../components/PraxisCard'
import { SnideSigil } from '../components/cards/SnideSigil'
import { SnideCard } from '../components/cards/FactionCard'
import { SnideSelectCard } from '../components/cards/FactionSelectCard'

export const SNIDE_MANIFEST: FactionManifest = {
  slug: 'snide',

  factionCard: () => SnideCard,
  factionSelectCard: () => SnideSelectCard,
  taskCard: () => SnideTaskCard,
  praxisCard: () => SnidePraxisCard,
  avatar: () => SnideAvatar,
  backdrop: () => SnideBackdrop,
  sigil: () => SnideSigil,
  comment: () => SnideComment,
  feedFrame: () => SnideFeedFrame,
  vote: () => SnideVote,
  taskDetail: () => SnideTaskDetail,
  praxisDetail: () => SnidePraxisDetail,
  editPraxis: () => SnideEditPraxis,
  factionHero: () => SnideFactionHero,
  factionBody: () => SnideFactionBody,
  profileBody: () => SnideProfileBody,
  mobileTaskCard: () => SnideMobileTaskCard,
  mobilePraxisCard: () => SnideMobilePraxisCard,
  mobileTaskDetail: () => SnideMobileTaskDetail,
  mobilePraxisDetail: () => SnideMobilePraxisDetail,
  mobileEditPraxis: () => SnideMobileEditPraxis,
  mobileFactionPage: () => SnideFactionPage,
  mobileFieldDesk: () => SnideHome,
}
