/**
 * snide — the surfaces this faction overrides (#782).
 *
 * Override-only: any surface absent here renders na's row for that surface —
 * the `Default*` archetype, registered in `./default.ts` since #2530. Adding a
 * surface is one line; no dispatcher is touched. Removing one hands the surface
 * back to na.
 *
 * Entries are thunks (`() => Component`) so they are read at render time, never
 * during module evaluation — see the cycle note in `./manifest.ts`.
 */
import type { FactionManifest } from './manifest'
import { lazyArchetype } from './lazyArchetype'

const SnideAvatar = lazyArchetype(() => import('../components/avatar/SnideAvatar'))
const SnideDuelSealConfirm = lazyArchetype(() => import('../components/duel/SnideDuelSealConfirm'))
const SnideBackdrop = lazyArchetype(() => import('../components/backdrop/SnideBackdrop'))
const SnideComment = lazyArchetype(() => import('../components/comments/voices/SnideComment'))
const SnideCreateCharacter = lazyArchetype(() => import('../pages/characterPaths/archetypes/SnideCreateCharacter'))
const SnideEditCharacter = lazyArchetype(() => import('../pages/characterPaths/archetypes/SnideEditCharacter'))
const SnideEditPraxis = lazyArchetype(() => import('../pages/editPraxis/archetypes/SnideEditPraxis'))
const SnideFactionBody = lazyArchetype(() => import('../pages/factionDetail/archetypes/SnideFactionBody'))
const SnideFactionHero = lazyArchetype(() => import('../components/factionHero/SnideFactionHero'))
const SnideFeedFrame = lazyArchetype(() => import('../components/feed/SnideFeedFrame'))
const SnideFieldDesk = lazyArchetype(() => import('../pages/fieldDesk/mobileArchetypes/SnideFieldDesk'))
const SnidePraxisDetail = lazyArchetype(() => import('../pages/praxisDetail/archetypes/SnidePraxisDetail'))
const SnideProfileBody = lazyArchetype(() => import('../pages/characterProfile/archetypes/SnideProfileBody'))
const SnideTaskCard = lazyArchetype(() => import('../components/taskCard/SnideTaskCard'))
const SnideTaskDetail = lazyArchetype(() => import('../pages/taskDetail/archetypes/SnideTaskDetail'))
const SnideVote = lazyArchetype(() => import('../components/vote/SnideVote'))
const SnidePraxisCard = lazyArchetype(() => import('../components/praxisCard/desktop/SnidePraxisCard'))
const SnideScoreStamp = lazyArchetype(() => import('../components/praxisCard/scoreStamp/SnideScoreStamp'))
const SnideSeal = lazyArchetype(() => import('../components/metataskSeal/skins/SnideSeal'))
const SnideSigil = lazyArchetype(() => import('../components/sigil/SnideSigil').then((m) => ({ default: m.SnideSigil })))
const SnideSelectCard = lazyArchetype(() => import('../components/selectCard/SnideSelectCard'))

export const SNIDE_MANIFEST: FactionManifest = {
  slug: 'snide',

  factionSelectCard: () => SnideSelectCard,
  taskCard: () => SnideTaskCard,
  praxisCard: () => SnidePraxisCard,
  scoreStamp: () => SnideScoreStamp,
  metataskSeal: () => SnideSeal,
  avatar: () => SnideAvatar,
  backdrop: () => SnideBackdrop,
  sigil: () => SnideSigil,
  comment: () => SnideComment,
  feedFrame: () => SnideFeedFrame,
  vote: () => SnideVote,
  taskDetail: () => SnideTaskDetail,
  praxisDetail: () => SnidePraxisDetail,
  editPraxis: () => SnideEditPraxis,
  createCharacter: () => SnideCreateCharacter,
  editCharacter: () => SnideEditCharacter,
  factionHero: () => SnideFactionHero,
  factionBody: () => SnideFactionBody,
  profileBody: () => SnideProfileBody,
  duelSeal: () => SnideDuelSealConfirm,
  mobileFieldDesk: () => SnideFieldDesk,
}
