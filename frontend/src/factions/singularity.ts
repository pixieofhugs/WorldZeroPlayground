/**
 * singularity — the surfaces this faction overrides (#782).
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

const SingularityAvatar = lazyArchetype(() => import('../components/avatar/SingularityAvatar'))
const SingularityBackdrop = lazyArchetype(() => import('../components/backdrop/SingularityBackdrop'))
const SingularityComment = lazyArchetype(() => import('../components/comments/voices/SingularityComment'))
const SingularityCreateCharacter = lazyArchetype(() => import('../pages/characterPaths/archetypes/SingularityCreateCharacter'))
const SingularityDuelSealConfirm = lazyArchetype(() => import('../components/duel/SingularityDuelSealConfirm'))
const SingularityEditPraxis = lazyArchetype(() => import('../pages/editPraxis/archetypes/SingularityEditPraxis'))
const SingularityFactionBody = lazyArchetype(() => import('../pages/factionDetail/archetypes/SingularityFactionBody'))
const SingularityFactionHero = lazyArchetype(() => import('../components/factionHero/SingularityFactionHero'))
const SingularityFeedFrame = lazyArchetype(() => import('../components/feed/SingularityFeedFrame'))
const SingularityFieldDesk = lazyArchetype(() => import('../pages/fieldDesk/mobileArchetypes/SingularityFieldDesk'))
const SingularityProfileBody = lazyArchetype(() => import('../pages/characterProfile/archetypes/SingularityProfileBody'))
const SingularityTaskCard = lazyArchetype(() => import('../components/taskCard/SingularityTaskCard'))
const SingularityTaskDetail = lazyArchetype(() => import('../pages/taskDetail/archetypes/SingularityTaskDetail'))
const SingularityVote = lazyArchetype(() => import('../components/vote/SingularityVote'))
const SingularityPraxisCard = lazyArchetype(() => import('../components/praxisCard/desktop/SingularityPraxisCard'))
const SingularityPraxisDetail = lazyArchetype(() => import('../pages/praxisDetail/archetypes/SingularityPraxisDetail'))
const SingularityScoreStamp = lazyArchetype(() => import('../components/praxisCard/scoreStamp/SingularityScoreStamp'))
const SingularitySeal = lazyArchetype(() => import('../components/metataskSeal/skins/SingularitySeal'))
const SingularitySigilAdapter = lazyArchetype(() => import('../components/sigil/FactionSigil').then((m) => ({ default: m.SingularitySigilAdapter })))
const SingularitySelectCard = lazyArchetype(() => import('../components/selectCard/SingularitySelectCard'))

export const SINGULARITY_MANIFEST: FactionManifest = {
  slug: 'singularity',

  factionSelectCard: () => SingularitySelectCard,
  taskCard: () => SingularityTaskCard,
  praxisCard: () => SingularityPraxisCard,
  scoreStamp: () => SingularityScoreStamp,
  metataskSeal: () => SingularitySeal,
  avatar: () => SingularityAvatar,
  backdrop: () => SingularityBackdrop,
  sigil: () => SingularitySigilAdapter,
  comment: () => SingularityComment,
  feedFrame: () => SingularityFeedFrame,
  vote: () => SingularityVote,
  taskDetail: () => SingularityTaskDetail,
  praxisDetail: () => SingularityPraxisDetail,
  editPraxis: () => SingularityEditPraxis,
  // The terminal dresses character creation (#2353, epic #2346). The slug this
  // dispatches on is the calling being PICKED, not a loaded record, so the page
  // reskins to this chassis live and returns to the Default the moment the pick
  // is cleared.
  createCharacter: () => SingularityCreateCharacter,
  factionHero: () => SingularityFactionHero,
  factionBody: () => SingularityFactionBody,
  profileBody: () => SingularityProfileBody,
  duelSeal: () => SingularityDuelSealConfirm,
  mobileFieldDesk: () => SingularityFieldDesk,
}
