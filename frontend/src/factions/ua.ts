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
import { lazyArchetype } from './lazyArchetype'

const UaAvatar = lazyArchetype(() => import('../components/avatar/UaAvatar'))
const UaBackdrop = lazyArchetype(() => import('../components/backdrop/UaBackdrop'))
const UaComment = lazyArchetype(() => import('../components/comments/voices/UaComment'))
const UaCreateCharacter = lazyArchetype(() => import('../pages/characterPaths/archetypes/UaCreateCharacter'))
const UaDuelSealConfirm = lazyArchetype(() => import('../components/duel/UaDuelSealConfirm'))
const UaEditPraxis = lazyArchetype(() => import('../pages/editPraxis/archetypes/UaEditPraxis'))
const UaFactionBody = lazyArchetype(() => import('../pages/factionDetail/archetypes/UaFactionBody'))
const UaFactionHero = lazyArchetype(() => import('../components/factionHero/UaFactionHero'))
const UaFeedFrame = lazyArchetype(() => import('../components/feed/UaFeedFrame'))
const UaFieldDesk = lazyArchetype(() => import('../pages/fieldDesk/mobileArchetypes/UaFieldDesk'))
const UaProfileBody = lazyArchetype(() => import('../pages/characterProfile/archetypes/UaProfileBody'))
const UaScoreStamp = lazyArchetype(() => import('../components/praxisCard/scoreStamp/UaScoreStamp'))
const UaSeal = lazyArchetype(() => import('../components/metataskSeal/skins/UaSeal'))
const UaTaskCard = lazyArchetype(() => import('../components/taskCard/UaTaskCard'))
const UaPraxisDetail = lazyArchetype(() => import('../pages/praxisDetail/archetypes/UaPraxisDetail'))
const UaTaskDetail = lazyArchetype(() => import('../pages/taskDetail/archetypes/UaTaskDetail'))
const UaVote = lazyArchetype(() => import('../components/vote/UaVote'))
const UaPraxisCard = lazyArchetype(() => import('../components/praxisCard/desktop/UaPraxisCard'))
const UaSigilAdapter = lazyArchetype(() => import('../components/sigil/FactionSigil').then((m) => ({ default: m.UaSigilAdapter })))
const UaSelectCard = lazyArchetype(() => import('../components/selectCard/UaSelectCard'))

export const UA_MANIFEST: FactionManifest = {
  slug: 'ua',

  factionSelectCard: () => UaSelectCard,
  taskCard: () => UaTaskCard,
  praxisCard: () => UaPraxisCard,
  scoreStamp: () => UaScoreStamp,
  metataskSeal: () => UaSeal,
  avatar: () => UaAvatar,
  backdrop: () => UaBackdrop,
  sigil: () => UaSigilAdapter,
  comment: () => UaComment,
  feedFrame: () => UaFeedFrame,
  vote: () => UaVote,
  duelSeal: () => UaDuelSealConfirm,
  taskDetail: () => UaTaskDetail,
  praxisDetail: () => UaPraxisDetail,
  editPraxis: () => UaEditPraxis,
  createCharacter: () => UaCreateCharacter,
  factionHero: () => UaFactionHero,
  factionBody: () => UaFactionBody,
  profileBody: () => UaProfileBody,
  mobileFieldDesk: () => UaFieldDesk,
}
