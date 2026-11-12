/**
 * na (Unaffiliated): NOT an override list. It is what everything falls back TO,
 * so it claims every `SURFACE_KEYS` key (`defaultManifest.test.tsx`); a missing
 * row renders nothing (#2530).
 *
 * Dispatch only, not colour: `CSS_KEY['na'] === 'default'`, `isKnownFaction('na')`
 * stays false (#749), and na reads `--faction-default-*` (ADR-0039).
 *
 * `backdrop` is `WatercolorBackground`, the designed neutral ground. `sigil`,
 * `comment`, `duelSeal` are named exports of their dispatchers, picked via
 * `.then()`. Laziness held by `manifestsStayLazy.test.ts`.
 */
import type { FactionManifest } from './manifest'
import { lazyArchetype } from './lazyArchetype'

const DefaultAvatar = lazyArchetype(() => import('../components/avatar/DefaultAvatar'))
const DefaultBackdrop = lazyArchetype(() => import('../components/layout/WatercolorBackground'))
const DefaultComment = lazyArchetype(() => import('../components/comments/CommentThread').then((m) => ({ default: m.DefaultComment })))
const DefaultCreateCharacter = lazyArchetype(() => import('../pages/characterPaths/archetypes/DefaultCreateCharacter'))
const DefaultDuelSealConfirm = lazyArchetype(() => import('../components/duel/DuelSealConfirm').then((m) => ({ default: m.DefaultDuelSealConfirm })))
const DefaultDuelReader = lazyArchetype(() => import('../pages/duelReader/archetypes/DefaultDuelReader'))
const DefaultEditCharacter = lazyArchetype(() => import('../pages/characterPaths/archetypes/DefaultEditCharacter'))
const DefaultEditPraxis = lazyArchetype(() => import('../pages/editPraxis/archetypes/DefaultEditPraxis'))
const DefaultFactionBody = lazyArchetype(() => import('../pages/factionDetail/archetypes/DefaultFactionBody'))
const DefaultFactionHero = lazyArchetype(() => import('../components/factionHero/DefaultFactionHero'))
const DefaultFeedFrame = lazyArchetype(() => import('../components/feed/DefaultFeedFrame'))
const DefaultFieldDesk = lazyArchetype(() => import('../pages/fieldDesk/mobileArchetypes/DefaultFieldDesk'))
const DefaultPraxisCard = lazyArchetype(() => import('../components/praxisCard/desktop/DefaultPraxisCard'))
const DefaultPraxisDetail = lazyArchetype(() => import('../pages/praxisDetail/archetypes/DefaultPraxisDetail'))
const DefaultProfileBody = lazyArchetype(() => import('../pages/characterProfile/archetypes/DefaultProfileBody'))
const DefaultProposeTask = lazyArchetype(() => import('../pages/proposeTask/archetypes/DefaultProposeTask'))
const DefaultScoreStamp = lazyArchetype(() => import('../components/praxisCard/scoreStamp/DefaultScoreStamp'))
const DefaultInvitationLetter = lazyArchetype(() => import('../components/invitation/DefaultInvitationLetter'))
const DefaultSeal = lazyArchetype(() => import('../components/metataskSeal/skins/DefaultSeal'))
const DefaultSelectCard = lazyArchetype(() => import('../components/selectCard/DefaultSelectCard'))
const DefaultSigilAdapter = lazyArchetype(() => import('../components/sigil/FactionSigil').then((m) => ({ default: m.DefaultSigilAdapter })))
const DefaultTaskCard = lazyArchetype(() => import('../components/taskCard/DefaultTaskCard'))
const DefaultTaskDetail = lazyArchetype(() => import('../pages/taskDetail/archetypes/DefaultTaskDetail'))
const DefaultVote = lazyArchetype(() => import('../components/vote/DefaultVote'))

export const DEFAULT_MANIFEST: FactionManifest = {
  slug: 'na',

  factionSelectCard: () => DefaultSelectCard,
  taskCard: () => DefaultTaskCard,
  praxisCard: () => DefaultPraxisCard,
  scoreStamp: () => DefaultScoreStamp,
  metataskSeal: () => DefaultSeal,
  avatar: () => DefaultAvatar,
  backdrop: () => DefaultBackdrop,
  sigil: () => DefaultSigilAdapter,
  comment: () => DefaultComment,
  feedFrame: () => DefaultFeedFrame,
  vote: () => DefaultVote,
  duelSeal: () => DefaultDuelSealConfirm,
  duelReader: () => DefaultDuelReader,
  invitationLetter: () => DefaultInvitationLetter,
  taskDetail: () => DefaultTaskDetail,
  praxisDetail: () => DefaultPraxisDetail,
  editPraxis: () => DefaultEditPraxis,
  createCharacter: () => DefaultCreateCharacter,
  editCharacter: () => DefaultEditCharacter,
  proposeTask: () => DefaultProposeTask,
  factionHero: () => DefaultFactionHero,
  factionBody: () => DefaultFactionBody,
  profileBody: () => DefaultProfileBody,
  mobileFieldDesk: () => DefaultFieldDesk,
}
