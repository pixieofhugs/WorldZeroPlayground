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
const CovenFactionHero = lazyArchetype(() => import('../components/factionHero/CovenFactionHero'))
const CovenFeedFrame = lazyArchetype(() => import('../components/feed/CovenFeedFrame'))
const CovenFieldDesk = lazyArchetype(() => import('../pages/fieldDesk/mobileArchetypes/CovenFieldDesk'))
const CovenPraxisDetail = lazyArchetype(() => import('../pages/praxisDetail/archetypes/CovenPraxisDetail'))
const CovenProfileBody = lazyArchetype(() => import('../pages/characterProfile/archetypes/CovenProfileBody'))
const CovenTaskCard = lazyArchetype(() => import('../components/taskCard/CovenTaskCard'))
const CovenTaskDetail = lazyArchetype(() => import('../pages/taskDetail/archetypes/CovenTaskDetail'))
const CovenVote = lazyArchetype(() => import('../components/vote/CovenVote'))
const CovenPraxisCard = lazyArchetype(() => import('../components/praxisCard/desktop/CovenPraxisCard'))
const CovenScoreStamp = lazyArchetype(() => import('../components/praxisCard/scoreStamp/CovenScoreStamp'))
const CovenSeal = lazyArchetype(() => import('../components/metataskSeal/skins/CovenSeal'))
const CovenSigil = lazyArchetype(() => import('../components/sigil/CovenSigil').then((m) => ({ default: m.CovenSigil })))
const CovenSelectCard = lazyArchetype(() => import('../components/selectCard/CovenSelectCard'))

export const COVEN_MANIFEST: FactionManifest = {
  slug: 'coven',

  factionSelectCard: () => CovenSelectCard,
  taskCard: () => CovenTaskCard,
  praxisCard: () => CovenPraxisCard,
  scoreStamp: () => CovenScoreStamp,
  metataskSeal: () => CovenSeal,
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
  mobileFieldDesk: () => CovenFieldDesk,
}
