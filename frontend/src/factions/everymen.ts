/**
 * everymen — the surfaces this faction overrides (#782).
 *
 * Override-only: any surface absent here renders that surface's `Default*`
 * archetype via `pickVariant`. Adding a surface is one line; no dispatcher is
 * touched. Removing one hands the surface back to the default.
 */
import type { FactionManifest } from './manifest'

import EverymenAvatar from '../components/avatar/EverymenAvatar'
import EverymenBackdrop from '../components/backdrop/EverymenBackdrop'
import EverymenComment from '../components/comments/voices/EverymenComment'
import EverymenEditPraxis from '../pages/editPraxis/archetypes/EverymenEditPraxis'
import EverymenFactionBody from '../pages/factionDetail/archetypes/EverymenFactionBody'
import EverymenFactionHero from '../components/cards/EverymenFactionHero'
import EverymenFactionPage from '../pages/factionDetail/mobileArchetypes/EverymenFactionPage'
import EverymenFeedFrame from '../components/feed/EverymenFeedFrame'
import EverymenHome from '../pages/fieldDesk/mobileArchetypes/EverymenHome'
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
import { EverymenPraxisCard } from '../components/PraxisCard'
import { EverymenSigil } from '../components/cards/EverymenSigil'

export const EVERYMEN_MANIFEST: FactionManifest = {
  slug: 'everymen',

  taskCard: EverymenTaskCard,
  praxisCard: EverymenPraxisCard,
  avatar: EverymenAvatar,
  backdrop: EverymenBackdrop,
  sigil: EverymenSigil,
  comment: EverymenComment,
  feedFrame: EverymenFeedFrame,
  vote: EverymenVote,
  taskDetail: EverymenTaskDetail,
  praxisDetail: EverymenPraxisDetail,
  editPraxis: EverymenEditPraxis,
  factionHero: EverymenFactionHero,
  factionBody: EverymenFactionBody,
  profileBody: EverymenProfileBody,
  mobileTaskCard: EverymenMobileTaskCard,
  mobilePraxisCard: EverymenMobilePraxisCard,
  mobileTaskDetail: EverymenMobileTaskDetail,
  mobilePraxisDetail: EverymenMobilePraxisDetail,
  mobileEditPraxis: EverymenMobileEditPraxis,
  mobileFactionPage: EverymenFactionPage,
  mobileFieldDesk: EverymenHome,
}
