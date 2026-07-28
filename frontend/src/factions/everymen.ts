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
const EverymenDuelRail = lazyArchetype(() => import('../pages/praxisDetail/duelRails/EverymenDuelRail'))
const EverymenDuelSealConfirm = lazyArchetype(() => import('../components/duel/EverymenDuelSealConfirm'))
const EverymenEditPraxis = lazyArchetype(() => import('../pages/editPraxis/archetypes/EverymenEditPraxis'))
const EverymenFactionBody = lazyArchetype(() => import('../pages/factionDetail/archetypes/EverymenFactionBody'))
const EverymenFactionHero = lazyArchetype(() => import('../components/cards/EverymenFactionHero'))
const EverymenFactionPage = lazyArchetype(() => import('../pages/factionDetail/mobileArchetypes/EverymenFactionPage'))
const EverymenFeedFrame = lazyArchetype(() => import('../components/feed/EverymenFeedFrame'))
const EverymenHome = lazyArchetype(() => import('../pages/fieldDesk/mobileArchetypes/EverymenHome'))
const EverymenMobileDuelRail = lazyArchetype(() => import('../pages/praxisDetail/duelRails/EverymenMobileDuelRail'))
const EverymenMobileDuelSealConfirm = lazyArchetype(() => import('../components/duel/EverymenMobileDuelSealConfirm'))
const EverymenMobileEditPraxis = lazyArchetype(() => import('../pages/editPraxis/mobileArchetypes/EverymenComposer'))
const EverymenMobilePraxisCard = lazyArchetype(() => import('../components/praxisCard/mobile/EverymenMobilePraxisCard'))
const EverymenMobilePraxisDetail = lazyArchetype(() => import('../pages/praxisDetail/mobileArchetypes/EverymenPraxisDetail'))
const EverymenPraxisDetail = lazyArchetype(() => import('../pages/praxisDetail/archetypes/EverymenPraxisDetail'))
const EverymenProfileBody = lazyArchetype(() => import('../pages/characterProfile/archetypes/EverymenProfileBody'))
const EverymenTaskCard = lazyArchetype(() => import('../components/cards/EverymenTaskCard'))
const EverymenTaskDetail = lazyArchetype(() => import('../pages/taskDetail/archetypes/EverymenTaskDetail'))
const EverymenVote = lazyArchetype(() => import('../components/vote/EverymenVote'))
const EverymenPraxisCard = lazyArchetype(() => import('../components/praxisCard/desktop/EverymenPraxisCard'))
const EverymenScoreStamp = lazyArchetype(() => import('../components/praxisCard/scoreStamp/EverymenScoreStamp'))
const EverymenSeal = lazyArchetype(() => import('../components/metaTaskSeal/skins/EverymenSeal'))
const EverymenSigil = lazyArchetype(() => import('../components/cards/EverymenSigil').then((m) => ({ default: m.EverymenSigil })))
const EverymenCard = lazyArchetype(() => import('../components/cards/EverymenFactionCard'))
const EverymenSelectCard = lazyArchetype(() => import('../components/cards/FactionSelectCard').then((m) => ({ default: m.EverymenSelectCard })))

export const EVERYMEN_MANIFEST: FactionManifest = {
  slug: 'everymen',

  factionCard: () => EverymenCard,
  factionSelectCard: () => EverymenSelectCard,
  taskCard: () => EverymenTaskCard,
  praxisCard: () => EverymenPraxisCard,
  scoreStamp: () => EverymenScoreStamp,
  metaTaskSeal: () => EverymenSeal,
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
  duelRail: () => EverymenDuelRail,
  mobilePraxisCard: () => EverymenMobilePraxisCard,
  mobilePraxisDetail: () => EverymenMobilePraxisDetail,
  mobileEditPraxis: () => EverymenMobileEditPraxis,
  mobileFactionPage: () => EverymenFactionPage,
  mobileFieldDesk: () => EverymenHome,
  mobileDuelSeal: () => EverymenMobileDuelSealConfirm,
  mobileDuelRail: () => EverymenMobileDuelRail,
}
