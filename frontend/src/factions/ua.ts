/**
 * ua — the surfaces this faction overrides (#782).
 *
 * Override-only: any surface absent here renders that surface's `Default*`
 * archetype via `pickVariant`. Adding a surface is one line; no dispatcher is
 * touched. Removing one hands the surface back to the default.
 *
 * Entries are thunks (`() => Component`) so they are read at render time, never
 * during module evaluation — see the cycle note in `./manifest.ts`.
 */
import type { FactionManifest } from './manifest'

import UaAvatar from '../components/avatar/UaAvatar'
import UaBackdrop from '../components/backdrop/UaBackdrop'
import UaComment from '../components/comments/voices/UaComment'
import UaEditPraxis from '../pages/editPraxis/archetypes/UaEditPraxis'
import UaFactionBody from '../pages/factionDetail/archetypes/UaFactionBody'
import UaFactionHero from '../components/cards/UaFactionHero'
import UaFactionPage from '../pages/factionDetail/mobileArchetypes/UaFactionPage'
import UaFeedFrame from '../components/feed/UaFeedFrame'
import UaHome from '../pages/fieldDesk/mobileArchetypes/UaHome'
import UaMobileEditPraxis from '../pages/editPraxis/mobileArchetypes/UaComposer'
import UaMobilePraxisCard from '../components/praxisCard/mobile/UaMobilePraxisCard'
import UaMobilePraxisDetail from '../pages/praxisDetail/mobileArchetypes/UaPraxisDetail'
import UaMobileTaskCard from '../pages/tasks/mobileArchetypes/cards/UaMobileTaskCard'
import UaMobileTaskDetail from '../pages/taskDetail/mobileArchetypes/UaTaskDetail'
import UaPraxisDetail from '../pages/praxisDetail/archetypes/UaPraxisDetail'
import UaProfileBody from '../pages/characterProfile/archetypes/UaProfileBody'
import UaScoreStamp from '../components/praxisCard/scoreStamp/UaScoreStamp'
import UaTaskCard from '../components/cards/UaTaskCard'
import UaTaskDetail from '../pages/taskDetail/archetypes/UaTaskDetail'
import UaVote from '../components/vote/UaVote'
import UaPraxisCard from '../components/praxisCard/desktop/UaPraxisCard'
import { UaSigilAdapter } from '../components/cards/FactionSigil'
import { UaCard } from '../components/cards/FactionCard'
import { UaSelectCard } from '../components/cards/FactionSelectCard'

export const UA_MANIFEST: FactionManifest = {
  slug: 'ua',

  factionCard: () => UaCard,
  factionSelectCard: () => UaSelectCard,
  taskCard: () => UaTaskCard,
  praxisCard: () => UaPraxisCard,
  scoreStamp: () => UaScoreStamp,
  avatar: () => UaAvatar,
  backdrop: () => UaBackdrop,
  sigil: () => UaSigilAdapter,
  comment: () => UaComment,
  feedFrame: () => UaFeedFrame,
  vote: () => UaVote,
  taskDetail: () => UaTaskDetail,
  praxisDetail: () => UaPraxisDetail,
  editPraxis: () => UaEditPraxis,
  factionHero: () => UaFactionHero,
  factionBody: () => UaFactionBody,
  profileBody: () => UaProfileBody,
  mobileTaskCard: () => UaMobileTaskCard,
  mobilePraxisCard: () => UaMobilePraxisCard,
  mobileTaskDetail: () => UaMobileTaskDetail,
  mobilePraxisDetail: () => UaMobilePraxisDetail,
  mobileEditPraxis: () => UaMobileEditPraxis,
  mobileFactionPage: () => UaFactionPage,
  mobileFieldDesk: () => UaHome,
}
