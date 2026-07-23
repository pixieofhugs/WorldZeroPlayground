/**
 * singularity — the surfaces this faction overrides (#782).
 *
 * Override-only: any surface absent here renders that surface's `Default*`
 * archetype via `pickVariant`. Adding a surface is one line; no dispatcher is
 * touched. Removing one hands the surface back to the default.
 *
 * Entries are thunks (`() => Component`) so they are read at render time, never
 * during module evaluation — see the cycle note in `./manifest.ts`.
 */
import type { FactionManifest } from './manifest'

import SingularityAvatar from '../components/avatar/SingularityAvatar'
import SingularityBackdrop from '../components/backdrop/SingularityBackdrop'
import SingularityComment from '../components/comments/voices/SingularityComment'
import SingularityDuelRail from '../pages/praxisDetail/duelRails/SingularityDuelRail'
import SingularityDuelSealConfirm from '../components/duel/SingularityDuelSealConfirm'
import SingularityEditPraxis from '../pages/editPraxis/archetypes/SingularityEditPraxis'
import SingularityFactionBody from '../pages/factionDetail/archetypes/SingularityFactionBody'
import SingularityFactionHero from '../components/cards/SingularityFactionHero'
import SingularityFactionPage from '../pages/factionDetail/mobileArchetypes/SingularityFactionPage'
import SingularityFeedFrame from '../components/feed/SingularityFeedFrame'
import SingularityHome from '../pages/fieldDesk/mobileArchetypes/SingularityHome'
import SingularityMobileDuelRail from '../pages/praxisDetail/duelRails/SingularityMobileDuelRail'
import SingularityMobileDuelSealConfirm from '../components/duel/SingularityMobileDuelSealConfirm'
import SingularityMobileEditPraxis from '../pages/editPraxis/mobileArchetypes/SingularityComposer'
import SingularityMobilePraxisCard from '../components/praxisCard/mobile/SingularityMobilePraxisCard'
import SingularityMobilePraxisDetail from '../pages/praxisDetail/mobileArchetypes/SingularityPraxisDetail'
import SingularityMobileTaskCard from '../pages/tasks/mobileArchetypes/cards/SingularityMobileTaskCard'
import SingularityMobileTaskDetail from '../pages/taskDetail/mobileArchetypes/SingularityTaskDetail'
import SingularityPraxisDetail from '../pages/praxisDetail/archetypes/SingularityPraxisDetail'
import SingularityProfileBody from '../pages/characterProfile/archetypes/SingularityProfileBody'
import SingularityTaskCard from '../components/cards/SingularityTaskCard'
import SingularityTaskDetail from '../pages/taskDetail/archetypes/SingularityTaskDetail'
import SingularityVote from '../components/vote/SingularityVote'
import SingularityPraxisCard from '../components/praxisCard/desktop/SingularityPraxisCard'
import SingularityScoreStamp from '../components/praxisCard/scoreStamp/SingularityScoreStamp'
import SingularitySeal from '../components/metaTaskSeal/skins/SingularitySeal'
import { SingularitySigilAdapter } from '../components/cards/FactionSigil'
import { SingularityCard } from '../components/cards/FactionCard'
import { SingularitySelectCard } from '../components/cards/FactionSelectCard'

export const SINGULARITY_MANIFEST: FactionManifest = {
  slug: 'singularity',

  factionCard: () => SingularityCard,
  factionSelectCard: () => SingularitySelectCard,
  taskCard: () => SingularityTaskCard,
  praxisCard: () => SingularityPraxisCard,
  scoreStamp: () => SingularityScoreStamp,
  metaTaskSeal: () => SingularitySeal,
  avatar: () => SingularityAvatar,
  backdrop: () => SingularityBackdrop,
  sigil: () => SingularitySigilAdapter,
  comment: () => SingularityComment,
  feedFrame: () => SingularityFeedFrame,
  vote: () => SingularityVote,
  taskDetail: () => SingularityTaskDetail,
  praxisDetail: () => SingularityPraxisDetail,
  editPraxis: () => SingularityEditPraxis,
  factionHero: () => SingularityFactionHero,
  factionBody: () => SingularityFactionBody,
  profileBody: () => SingularityProfileBody,
  duelSeal: () => SingularityDuelSealConfirm,
  duelRail: () => SingularityDuelRail,
  mobileTaskCard: () => SingularityMobileTaskCard,
  mobilePraxisCard: () => SingularityMobilePraxisCard,
  mobileTaskDetail: () => SingularityMobileTaskDetail,
  mobilePraxisDetail: () => SingularityMobilePraxisDetail,
  mobileEditPraxis: () => SingularityMobileEditPraxis,
  mobileFactionPage: () => SingularityFactionPage,
  mobileFieldDesk: () => SingularityHome,
  mobileDuelSeal: () => SingularityMobileDuelSealConfirm,
  mobileDuelRail: () => SingularityMobileDuelRail,
}
