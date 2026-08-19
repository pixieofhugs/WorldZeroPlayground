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
import { lazyArchetype } from './lazyArchetype'

const EverymenAvatar = lazyArchetype(() => import('../components/avatar/EverymenAvatar'))
const EverymenBackdrop = lazyArchetype(() => import('../components/backdrop/EverymenBackdrop'))
const EverymenComment = lazyArchetype(() => import('../components/comments/voices/EverymenComment'))
const EverymenDuelSealConfirm = lazyArchetype(() => import('../components/duel/EverymenDuelSealConfirm'))
const EverymenEditPraxis = lazyArchetype(() => import('../pages/editPraxis/archetypes/EverymenEditPraxis'))
const EverymenFactionBody = lazyArchetype(() => import('../pages/factionDetail/archetypes/EverymenFactionBody'))
const EverymenFactionHero = lazyArchetype(() => import('../components/factionHero/EverymenFactionHero'))
const EverymenFeedFrame = lazyArchetype(() => import('../components/feed/EverymenFeedFrame'))
const EverymenFieldDesk = lazyArchetype(() => import('../pages/fieldDesk/mobileArchetypes/EverymenFieldDesk'))
const EverymenProfileBody = lazyArchetype(() => import('../pages/characterProfile/archetypes/EverymenProfileBody'))
const EverymenTaskCard = lazyArchetype(() => import('../components/taskCard/EverymenTaskCard'))
const EverymenTaskDetail = lazyArchetype(() => import('../pages/taskDetail/archetypes/EverymenTaskDetail'))
const EverymenVote = lazyArchetype(() => import('../components/vote/EverymenVote'))
const EverymenPraxisCard = lazyArchetype(() => import('../components/praxisCard/desktop/EverymenPraxisCard'))
const EverymenPraxisDetail = lazyArchetype(() => import('../pages/praxisDetail/archetypes/EverymenPraxisDetail'))
const EverymenScoreStamp = lazyArchetype(() => import('../components/praxisCard/scoreStamp/EverymenScoreStamp'))
const EverymenSeal = lazyArchetype(() => import('../components/metataskSeal/skins/EverymenSeal'))
const EverymenSigil = lazyArchetype(() => import('../components/sigil/EverymenSigil').then((m) => ({ default: m.EverymenSigil })))
const EverymenSelectCard = lazyArchetype(() => import('../components/selectCard/EverymenSelectCard'))

export const EVERYMEN_MANIFEST: FactionManifest = {
  slug: 'everymen',

  factionSelectCard: () => EverymenSelectCard,
  taskCard: () => EverymenTaskCard,
  praxisCard: () => EverymenPraxisCard,
  scoreStamp: () => EverymenScoreStamp,
  metataskSeal: () => EverymenSeal,
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
  mobileFieldDesk: () => EverymenFieldDesk,
}
