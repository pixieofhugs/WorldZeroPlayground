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
import { lazyArchetype } from './lazyArchetype'

const EphemeristsAvatar = lazyArchetype(() => import('../components/avatar/EphemeristsAvatar'))
const EphemeristsBackdrop = lazyArchetype(() => import('../components/backdrop/EphemeristsBackdrop'))
const EphemeristsComment = lazyArchetype(() => import('../components/comments/voices/EphemeristsComment'))
const EphemeristsDuelSealConfirm = lazyArchetype(() => import('../components/duel/EphemeristsDuelSealConfirm'))
const EphemeristsEditPraxis = lazyArchetype(() => import('../pages/editPraxis/archetypes/EphemeristsEditPraxis'))
const EphemeristsFactionBody = lazyArchetype(() => import('../pages/factionDetail/archetypes/EphemeristsFactionBody'))
const EphemeristsFactionHero = lazyArchetype(() => import('../components/cards/EphemeristsFactionHero'))
const EphemeristsFactionPage = lazyArchetype(() => import('../pages/factionDetail/mobileArchetypes/EphemeristsFactionPage'))
const EphemeristsFeedFrame = lazyArchetype(() => import('../components/feed/EphemeristsFeedFrame'))
const EphemeristsHome = lazyArchetype(() => import('../pages/fieldDesk/mobileArchetypes/EphemeristsHome'))
const EphemeristsProfileBody = lazyArchetype(() => import('../pages/characterProfile/archetypes/EphemeristsProfileBody'))
const EphemeristsTaskCard = lazyArchetype(() => import('../components/cards/EphemeristsTaskCard'))
const EphemeristsTaskDetail = lazyArchetype(() => import('../pages/taskDetail/archetypes/EphemeristsTaskDetail'))
const EphemeristsVote = lazyArchetype(() => import('../components/vote/EphemeristsVote'))
const EphemeristsPraxisCard = lazyArchetype(() => import('../components/praxisCard/desktop/EphemeristsPraxisCard'))
const EphemeristsPraxisDetail = lazyArchetype(() => import('../pages/praxisDetail/archetypes/EphemeristsPraxisDetail'))
const EphemeristsScoreStamp = lazyArchetype(() => import('../components/praxisCard/scoreStamp/EphemeristsScoreStamp'))
const EphemeristsSeal = lazyArchetype(() => import('../components/metaTaskSeal/skins/EphemeristsSeal'))
const EphemeristsSigil = lazyArchetype(() => import('../components/cards/EphemeristsSigil'))
const EphemeristsCard = lazyArchetype(() => import('../components/cards/FactionCard').then((m) => ({ default: m.EphemeristsCard })))
const EphemeristsSelectCard = lazyArchetype(() => import('../components/cards/FactionSelectCard').then((m) => ({ default: m.EphemeristsSelectCard })))

export const EPHEMERISTS_MANIFEST: FactionManifest = {
  slug: 'ephemerists',

  factionCard: () => EphemeristsCard,
  factionSelectCard: () => EphemeristsSelectCard,
  taskCard: () => EphemeristsTaskCard,
  praxisCard: () => EphemeristsPraxisCard,
  // Dress over the ONE shared praxis-detail layout (#1120, epic #1085,
  // ADR-0061). Not a layout of its own: `DefaultPraxisDetail` remains the
  // contract, and dropping this line hands the surface straight back to it.
  praxisDetail: () => EphemeristsPraxisDetail,
  scoreStamp: () => EphemeristsScoreStamp,
  metaTaskSeal: () => EphemeristsSeal,
  avatar: () => EphemeristsAvatar,
  backdrop: () => EphemeristsBackdrop,
  sigil: () => EphemeristsSigil,
  comment: () => EphemeristsComment,
  feedFrame: () => EphemeristsFeedFrame,
  vote: () => EphemeristsVote,
  taskDetail: () => EphemeristsTaskDetail,
  editPraxis: () => EphemeristsEditPraxis,
  factionHero: () => EphemeristsFactionHero,
  factionBody: () => EphemeristsFactionBody,
  profileBody: () => EphemeristsProfileBody,
  duelSeal: () => EphemeristsDuelSealConfirm,
  mobileFactionPage: () => EphemeristsFactionPage,
  mobileFieldDesk: () => EphemeristsHome,
}
