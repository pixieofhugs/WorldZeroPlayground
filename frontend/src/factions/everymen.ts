/**
 * everymen — the surfaces this faction overrides (#782).
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

const EverymenAvatar = lazyArchetype(() => import('../components/avatar/EverymenAvatar'))
const EverymenBackdrop = lazyArchetype(() => import('../components/backdrop/EverymenBackdrop'))
const EverymenComment = lazyArchetype(() => import('../components/comments/voices/EverymenComment'))
const EverymenCreateCharacter = lazyArchetype(() => import('../pages/characterPaths/archetypes/EverymenCreateCharacter'))
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
  // The enlistment paper (#2352). The slug this dispatches on is the calling
  // being PICKED, not a loaded record, so the page reskins to this bill live and
  // returns to the Default the moment the pick is cleared.
  createCharacter: () => EverymenCreateCharacter,
  factionHero: () => EverymenFactionHero,
  factionBody: () => EverymenFactionBody,
  profileBody: () => EverymenProfileBody,
  duelSeal: () => EverymenDuelSealConfirm,
  mobileFieldDesk: () => EverymenFieldDesk,
}
