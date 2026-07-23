/**
 * coven — the surfaces this faction overrides (#782).
 *
 * Override-only: any surface absent here renders that surface's `Default*`
 * archetype via `pickVariant`. Adding a surface is one line; no dispatcher is
 * touched. Removing one hands the surface back to the default.
 *
 * Entries are thunks (`() => Component`) so they are read at render time, never
 * during module evaluation — see the cycle note in `./manifest.ts`.
 */
import type { FactionManifest } from './manifest'

import CovenAvatar from '../components/avatar/CovenAvatar'
import CovenBackdrop from '../components/backdrop/CovenBackdrop'
import CovenComment from '../components/comments/voices/CovenComment'
import CovenDuelRail from '../pages/praxisDetail/duelRails/CovenDuelRail'
import CovenDuelSealConfirm from '../components/duel/CovenDuelSealConfirm'
import CovenEditPraxis from '../pages/editPraxis/archetypes/CovenEditPraxis'
import CovenFactionBody from '../pages/factionDetail/archetypes/CovenFactionBody'
import CovenFactionHero from '../components/cards/CovenFactionHero'
import CovenFactionPage from '../pages/factionDetail/mobileArchetypes/CovenFactionPage'
import CovenFeedFrame from '../components/feed/CovenFeedFrame'
import CovenFieldDesk from '../pages/fieldDesk/mobileArchetypes/CovenFieldDesk'
import CovenMobileDuelRail from '../pages/praxisDetail/duelRails/CovenMobileDuelRail'
import CovenMobileDuelSealConfirm from '../components/duel/CovenMobileDuelSealConfirm'
import CovenMobileEditPraxis from '../pages/editPraxis/mobileArchetypes/CovenEditPraxis'
import CovenMobilePraxisCard from '../components/praxisCard/mobile/CovenMobilePraxisCard'
import CovenMobilePraxisDetail from '../pages/praxisDetail/mobileArchetypes/CovenPraxisDetail'
import CovenMobileTaskCard from '../pages/tasks/mobileArchetypes/cards/CovenMobileTaskCard'
import CovenMobileTaskDetail from '../pages/taskDetail/mobileArchetypes/CovenTaskDetail'
import CovenPraxisDetail from '../pages/praxisDetail/archetypes/CovenPraxisDetail'
import CovenProfileBody from '../pages/characterProfile/archetypes/CovenProfileBody'
import CovenTaskCard from '../components/cards/CovenTaskCard'
import CovenTaskDetail from '../pages/taskDetail/archetypes/CovenTaskDetail'
import CovenVote from '../components/vote/CovenVote'
import CovenPraxisCard from '../components/praxisCard/desktop/CovenPraxisCard'
import CovenScoreStamp from '../components/praxisCard/scoreStamp/CovenScoreStamp'
import CovenSeal from '../components/metaTaskSeal/skins/CovenSeal'
import { CovenSigil } from '../components/cards/CovenSigil'
import { CovenCard } from '../components/cards/FactionCard'
import { COVENSelectCard } from '../components/cards/FactionSelectCard'

export const COVEN_MANIFEST: FactionManifest = {
  slug: 'coven',

  factionCard: () => CovenCard,
  factionSelectCard: () => COVENSelectCard,
  taskCard: () => CovenTaskCard,
  praxisCard: () => CovenPraxisCard,
  scoreStamp: () => CovenScoreStamp,
  metaTaskSeal: () => CovenSeal,
  avatar: () => CovenAvatar,
  backdrop: () => CovenBackdrop,
  sigil: () => CovenSigil,
  comment: () => CovenComment,
  feedFrame: () => CovenFeedFrame,
  vote: () => CovenVote,
  taskDetail: () => CovenTaskDetail,
  praxisDetail: () => CovenPraxisDetail,
  editPraxis: () => CovenEditPraxis,
  factionHero: () => CovenFactionHero,
  factionBody: () => CovenFactionBody,
  profileBody: () => CovenProfileBody,
  duelSeal: () => CovenDuelSealConfirm,
  duelRail: () => CovenDuelRail,
  mobileTaskCard: () => CovenMobileTaskCard,
  mobilePraxisCard: () => CovenMobilePraxisCard,
  mobileTaskDetail: () => CovenMobileTaskDetail,
  mobilePraxisDetail: () => CovenMobilePraxisDetail,
  mobileEditPraxis: () => CovenMobileEditPraxis,
  mobileFactionPage: () => CovenFactionPage,
  mobileFieldDesk: () => CovenFieldDesk,
  mobileDuelSeal: () => CovenMobileDuelSealConfirm,
  mobileDuelRail: () => CovenMobileDuelRail,
}
