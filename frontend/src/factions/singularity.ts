/** singularity — the surfaces this faction overrides (#782). Thunks: see `./manifest.ts`. */
import type { FactionManifest } from './manifest'
import { lazyArchetype } from './lazyArchetype'

const SingularityAvatar = lazyArchetype(() => import('../components/avatar/SingularityAvatar'))
const SingularityBackdrop = lazyArchetype(() => import('../components/backdrop/SingularityBackdrop'))
const SingularityComment = lazyArchetype(() => import('../components/comments/voices/SingularityComment'))
const SingularityCreateCharacter = lazyArchetype(() => import('../pages/characterPaths/archetypes/SingularityCreateCharacter'))
const SingularityEditCharacter = lazyArchetype(() => import('../pages/characterPaths/archetypes/SingularityEditCharacter'))
const SingularityDuelSealConfirm = lazyArchetype(() => import('../components/duel/SingularityDuelSealConfirm'))
const SingularityEditPraxis = lazyArchetype(() => import('../pages/editPraxis/archetypes/SingularityEditPraxis'))
const SingularityFactionBody = lazyArchetype(() => import('../pages/factionDetail/archetypes/SingularityFactionBody'))
const SingularityFactionHero = lazyArchetype(() => import('../components/factionHero/SingularityFactionHero'))
const SingularityFeedFrame = lazyArchetype(() => import('../components/feed/SingularityFeedFrame'))
const SingularityFieldDesk = lazyArchetype(() => import('../pages/fieldDesk/mobileArchetypes/SingularityFieldDesk'))
const SingularityProfileBody = lazyArchetype(() => import('../pages/characterProfile/archetypes/SingularityProfileBody'))
const SingularityProposeTask = lazyArchetype(() => import('../pages/proposeTask/archetypes/SingularityProposeTask'))
const SingularityTaskCard = lazyArchetype(() => import('../components/taskCard/SingularityTaskCard'))
const SingularityTaskDetail = lazyArchetype(() => import('../pages/taskDetail/archetypes/SingularityTaskDetail'))
const SingularityVote = lazyArchetype(() => import('../components/vote/SingularityVote'))
const SingularityPraxisCard = lazyArchetype(() => import('../components/praxisCard/desktop/SingularityPraxisCard'))
const SingularityPraxisDetail = lazyArchetype(() => import('../pages/praxisDetail/archetypes/SingularityPraxisDetail'))
const SingularityScoreStamp = lazyArchetype(() => import('../components/praxisCard/scoreStamp/SingularityScoreStamp'))
const SingularityInvitationLetter = lazyArchetype(() => import('../components/invitation/SingularityInvitationLetter'))
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
  // The terminal (#2353).
  createCharacter: () => SingularityCreateCharacter,
  // Derived (#2537). The `editCharacterSlots` sit in a pane of this kit's own
  // ground because the faction's alarm ink is cut for a near-black card.
  editCharacter: () => SingularityEditCharacter,
  // Derived (#2538).
  proposeTask: () => SingularityProposeTask,
  factionHero: () => SingularityFactionHero,
  factionBody: () => SingularityFactionBody,
  profileBody: () => SingularityProfileBody,
  duelSeal: () => SingularityDuelSealConfirm,
  invitationLetter: () => SingularityInvitationLetter,
  mobileFieldDesk: () => SingularityFieldDesk,
}
