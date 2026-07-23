/**
 * everymen — the surfaces this faction overrides (#782).
 *
 * Override-only: any surface absent here renders that surface's `Default*`
 * archetype via `pickVariant`. Adding a surface is one line; no dispatcher is
 * touched. Removing one hands the surface back to the default.
 *
 * Entries are thunks (`() => Component`) so they are read at render time, never
 * during module evaluation — see the cycle note in `./manifest.ts`.
 */
import type { FactionManifest } from './manifest'

import EverymenAvatar from '../components/avatar/EverymenAvatar'
import EverymenBackdrop from '../components/backdrop/EverymenBackdrop'
import EverymenComment from '../components/comments/voices/EverymenComment'
import EverymenDuelRail from '../pages/praxisDetail/duelRails/EverymenDuelRail'
import EverymenDuelSealConfirm from '../components/duel/EverymenDuelSealConfirm'
import EverymenEditPraxis from '../pages/editPraxis/archetypes/EverymenEditPraxis'
import EverymenFactionBody from '../pages/factionDetail/archetypes/EverymenFactionBody'
import EverymenFactionHero from '../components/cards/EverymenFactionHero'
import EverymenFactionPage from '../pages/factionDetail/mobileArchetypes/EverymenFactionPage'
import EverymenFeedFrame from '../components/feed/EverymenFeedFrame'
import EverymenHome from '../pages/fieldDesk/mobileArchetypes/EverymenHome'
import EverymenMobileDuelRail from '../pages/praxisDetail/duelRails/EverymenMobileDuelRail'
import EverymenMobileDuelSealConfirm from '../components/duel/EverymenMobileDuelSealConfirm'
import EverymenMobileEditPraxis from '../pages/editPraxis/mobileArchetypes/EverymenComposer'
import EverymenMobilePraxisCard from '../components/praxisCard/mobile/EverymenMobilePraxisCard'
import EverymenMobilePraxisDetail from '../pages/praxisDetail/mobileArchetypes/EverymenPraxisDetail'
import EverymenMobileTaskCard from '../pages/tasks/mobileArchetypes/cards/EverymenMobileTaskCard'
import EverymenMobileTaskDetail from '../pages/taskDetail/mobileArchetypes/EverymenTaskDetail'
import EverymenPraxisDetail from '../pages/praxisDetail/archetypes/EverymenPraxisDetail'
import EverymenProfileBody from '../pages/characterProfile/archetypes/EverymenProfileBody'
import EverymenTaskCard from '../components/cards/EverymenTaskCard'
import EverymenTaskDetail from '../pages/taskDetail/archetypes/EverymenTaskDetail'
import EverymenVote from '../components/vote/EverymenVote'
import EverymenPraxisCard from '../components/praxisCard/desktop/EverymenPraxisCard'
import EverymenScoreStamp from '../components/praxisCard/scoreStamp/EverymenScoreStamp'
import EverymenSeal from '../components/metaTaskSeal/skins/EverymenSeal'
import { EverymenSigil } from '../components/cards/EverymenSigil'
import EverymenCard from '../components/cards/EverymenFactionCard'
import { EverymenSelectCard } from '../components/cards/FactionSelectCard'

export const EVERYMEN_MANIFEST: FactionManifest = {
  slug: 'everymen',

  factionCard: () => EverymenCard,
  factionSelectCard: () => EverymenSelectCard,
  taskCard: () => EverymenTaskCard,
  praxisCard: () => EverymenPraxisCard,
  scoreStamp: () => EverymenScoreStamp,
  metaTaskSeal: () => EverymenSeal,
  avatar: () => EverymenAvatar,
  backdrop: () => EverymenBackdrop,
  sigil: () => EverymenSigil,
  comment: () => EverymenComment,
  feedFrame: () => EverymenFeedFrame,
  vote: () => EverymenVote,
  taskDetail: () => EverymenTaskDetail,
  praxisDetail: () => EverymenPraxisDetail,
  editPraxis: () => EverymenEditPraxis,
  factionHero: () => EverymenFactionHero,
  factionBody: () => EverymenFactionBody,
  profileBody: () => EverymenProfileBody,
  duelSeal: () => EverymenDuelSealConfirm,
  duelRail: () => EverymenDuelRail,
  mobileTaskCard: () => EverymenMobileTaskCard,
  mobilePraxisCard: () => EverymenMobilePraxisCard,
  mobileTaskDetail: () => EverymenMobileTaskDetail,
  mobilePraxisDetail: () => EverymenMobilePraxisDetail,
  mobileEditPraxis: () => EverymenMobileEditPraxis,
  mobileFactionPage: () => EverymenFactionPage,
  mobileFieldDesk: () => EverymenHome,
  mobileDuelSeal: () => EverymenMobileDuelSealConfirm,
  mobileDuelRail: () => EverymenMobileDuelRail,
}
