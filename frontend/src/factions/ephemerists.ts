/**
 * ephemerists — the surfaces this faction overrides (#782).
 *
 * Override-only: any surface absent here renders that surface's `Default*`
 * archetype via `pickVariant`. Adding a surface is one line; no dispatcher is
 * touched. Removing one hands the surface back to the default.
 *
 * Entries are thunks (`() => Component`) so they are read at render time, never
 * during module evaluation — see the cycle note in `./manifest.ts`.
 */
import type { FactionManifest } from './manifest'

import EphemeristsAvatar from '../components/avatar/EphemeristsAvatar'
import EphemeristsBackdrop from '../components/backdrop/EphemeristsBackdrop'
import EphemeristsComment from '../components/comments/voices/EphemeristsComment'
import EphemeristsDuelRail from '../pages/praxisDetail/duelRails/EphemeristsDuelRail'
import EphemeristsDuelSealConfirm from '../components/duel/EphemeristsDuelSealConfirm'
import EphemeristsEditPraxis from '../pages/editPraxis/archetypes/EphemeristsEditPraxis'
import EphemeristsFactionBody from '../pages/factionDetail/archetypes/EphemeristsFactionBody'
import EphemeristsFactionHero from '../components/cards/EphemeristsFactionHero'
import EphemeristsFactionPage from '../pages/factionDetail/mobileArchetypes/EphemeristsFactionPage'
import EphemeristsFeedFrame from '../components/feed/EphemeristsFeedFrame'
import EphemeristsHome from '../pages/fieldDesk/mobileArchetypes/EphemeristsHome'
import EphemeristsMobileDuelRail from '../pages/praxisDetail/duelRails/EphemeristsMobileDuelRail'
import EphemeristsMobileDuelSealConfirm from '../components/duel/EphemeristsMobileDuelSealConfirm'
import EphemeristsMobileEditPraxis from '../pages/editPraxis/mobileArchetypes/EphemeristsComposer'
import EphemeristsMobilePraxisCard from '../components/praxisCard/mobile/EphemeristsMobilePraxisCard'
import EphemeristsMobilePraxisDetail from '../pages/praxisDetail/mobileArchetypes/EphemeristsPraxisDetail'
import EphemeristsMobileTaskCard from '../pages/tasks/mobileArchetypes/cards/EphemeristsMobileTaskCard'
import EphemeristsMobileTaskDetail from '../pages/taskDetail/mobileArchetypes/EphemeristsTaskDetail'
import EphemeristsPraxisDetail from '../pages/praxisDetail/archetypes/EphemeristsPraxisDetail'
import EphemeristsProfileBody from '../pages/characterProfile/archetypes/EphemeristsProfileBody'
import EphemeristsTaskCard from '../components/cards/EphemeristsTaskCard'
import EphemeristsTaskDetail from '../pages/taskDetail/archetypes/EphemeristsTaskDetail'
import EphemeristsVote from '../components/vote/EphemeristsVote'
import EphemeristsPraxisCard from '../components/praxisCard/desktop/EphemeristsPraxisCard'
import { EphemeristsSigil } from '../components/cards/ephemeristsAtoms'
import { EphemeristsCard } from '../components/cards/FactionCard'
import { EphemeristsSelectCard } from '../components/cards/FactionSelectCard'

export const EPHEMERISTS_MANIFEST: FactionManifest = {
  slug: 'ephemerists',

  factionCard: () => EphemeristsCard,
  factionSelectCard: () => EphemeristsSelectCard,
  taskCard: () => EphemeristsTaskCard,
  praxisCard: () => EphemeristsPraxisCard,
  avatar: () => EphemeristsAvatar,
  backdrop: () => EphemeristsBackdrop,
  sigil: () => EphemeristsSigil,
  comment: () => EphemeristsComment,
  feedFrame: () => EphemeristsFeedFrame,
  vote: () => EphemeristsVote,
  taskDetail: () => EphemeristsTaskDetail,
  praxisDetail: () => EphemeristsPraxisDetail,
  editPraxis: () => EphemeristsEditPraxis,
  factionHero: () => EphemeristsFactionHero,
  factionBody: () => EphemeristsFactionBody,
  profileBody: () => EphemeristsProfileBody,
  duelSeal: () => EphemeristsDuelSealConfirm,
  duelRail: () => EphemeristsDuelRail,
  mobileTaskCard: () => EphemeristsMobileTaskCard,
  mobilePraxisCard: () => EphemeristsMobilePraxisCard,
  mobileTaskDetail: () => EphemeristsMobileTaskDetail,
  mobilePraxisDetail: () => EphemeristsMobilePraxisDetail,
  mobileEditPraxis: () => EphemeristsMobileEditPraxis,
  mobileFactionPage: () => EphemeristsFactionPage,
  mobileFieldDesk: () => EphemeristsHome,
  mobileDuelSeal: () => EphemeristsMobileDuelSealConfirm,
  mobileDuelRail: () => EphemeristsMobileDuelRail,
}
