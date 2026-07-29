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
import { lazyArchetype } from './lazyArchetype'

const CovenAvatar = lazyArchetype(() => import('../components/avatar/CovenAvatar'))
const CovenBackdrop = lazyArchetype(() => import('../components/backdrop/CovenBackdrop'))
const CovenComment = lazyArchetype(() => import('../components/comments/voices/CovenComment'))
const CovenDuelSealConfirm = lazyArchetype(() => import('../components/duel/CovenDuelSealConfirm'))
const CovenEditPraxis = lazyArchetype(() => import('../pages/editPraxis/archetypes/CovenEditPraxis'))
const CovenFactionBody = lazyArchetype(() => import('../pages/factionDetail/archetypes/CovenFactionBody'))
const CovenFactionHero = lazyArchetype(() => import('../components/cards/CovenFactionHero'))
const CovenFactionPage = lazyArchetype(() => import('../pages/factionDetail/mobileArchetypes/CovenFactionPage'))
const CovenFeedFrame = lazyArchetype(() => import('../components/feed/CovenFeedFrame'))
const CovenFieldDesk = lazyArchetype(() => import('../pages/fieldDesk/mobileArchetypes/CovenFieldDesk'))
const CovenMobileDuelSealConfirm = lazyArchetype(() => import('../components/duel/CovenMobileDuelSealConfirm'))
const CovenMobilePraxisCard = lazyArchetype(() => import('../components/praxisCard/mobile/CovenMobilePraxisCard'))
const CovenPraxisDetail = lazyArchetype(() => import('../pages/praxisDetail/archetypes/CovenPraxisDetail'))
const CovenProfileBody = lazyArchetype(() => import('../pages/characterProfile/archetypes/CovenProfileBody'))
const CovenTaskCard = lazyArchetype(() => import('../components/cards/CovenTaskCard'))
const CovenTaskDetail = lazyArchetype(() => import('../pages/taskDetail/archetypes/CovenTaskDetail'))
const CovenVote = lazyArchetype(() => import('../components/vote/CovenVote'))
const CovenPraxisCard = lazyArchetype(() => import('../components/praxisCard/desktop/CovenPraxisCard'))
const CovenScoreStamp = lazyArchetype(() => import('../components/praxisCard/scoreStamp/CovenScoreStamp'))
const CovenSeal = lazyArchetype(() => import('../components/metaTaskSeal/skins/CovenSeal'))
const CovenSigil = lazyArchetype(() => import('../components/cards/CovenSigil').then((m) => ({ default: m.CovenSigil })))
const CovenCard = lazyArchetype(() => import('../components/cards/FactionCard').then((m) => ({ default: m.CovenCard })))
const COVENSelectCard = lazyArchetype(() => import('../components/cards/FactionSelectCard').then((m) => ({ default: m.COVENSelectCard })))

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
  mobilePraxisCard: () => CovenMobilePraxisCard,
  mobileFactionPage: () => CovenFactionPage,
  mobileFieldDesk: () => CovenFieldDesk,
  mobileDuelSeal: () => CovenMobileDuelSealConfirm,
}
