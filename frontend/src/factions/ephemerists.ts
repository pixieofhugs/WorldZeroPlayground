/** ephemerists — the surfaces this faction overrides (#782). Thunks: see `./manifest.ts`. */
import type { FactionManifest } from './manifest'
import { lazyArchetype } from './lazyArchetype'

const EphemeristsAvatar = lazyArchetype(() => import('../components/avatar/EphemeristsAvatar'))
const EphemeristsBackdrop = lazyArchetype(() => import('../components/backdrop/EphemeristsBackdrop'))
const EphemeristsComment = lazyArchetype(() => import('../components/comments/voices/EphemeristsComment'))
const EphemeristsCreateCharacter = lazyArchetype(() => import('../pages/characterPaths/archetypes/EphemeristsCreateCharacter'))
const EphemeristsDuelSealConfirm = lazyArchetype(() => import('../components/duel/EphemeristsDuelSealConfirm'))
const EphemeristsEditCharacter = lazyArchetype(() => import('../pages/characterPaths/archetypes/EphemeristsEditCharacter'))
const EphemeristsEditPraxis = lazyArchetype(() => import('../pages/editPraxis/archetypes/EphemeristsEditPraxis'))
const EphemeristsFactionBody = lazyArchetype(() => import('../pages/factionDetail/archetypes/EphemeristsFactionBody'))
const EphemeristsFactionHero = lazyArchetype(() => import('../components/factionHero/EphemeristsFactionHero'))
const EphemeristsFeedFrame = lazyArchetype(() => import('../components/feed/EphemeristsFeedFrame'))
const EphemeristsFieldDesk = lazyArchetype(() => import('../pages/fieldDesk/mobileArchetypes/EphemeristsFieldDesk'))
const EphemeristsProfileBody = lazyArchetype(() => import('../pages/characterProfile/archetypes/EphemeristsProfileBody'))
const EphemeristsProposeTask = lazyArchetype(() => import('../pages/proposeTask/archetypes/EphemeristsProposeTask'))
const EphemeristsTaskCard = lazyArchetype(() => import('../components/taskCard/EphemeristsTaskCard'))
const EphemeristsTaskDetail = lazyArchetype(() => import('../pages/taskDetail/archetypes/EphemeristsTaskDetail'))
const EphemeristsVote = lazyArchetype(() => import('../components/vote/EphemeristsVote'))
const EphemeristsPraxisCard = lazyArchetype(() => import('../components/praxisCard/desktop/EphemeristsPraxisCard'))
const EphemeristsPraxisDetail = lazyArchetype(() => import('../pages/praxisDetail/archetypes/EphemeristsPraxisDetail'))
const EphemeristsScoreStamp = lazyArchetype(() => import('../components/praxisCard/scoreStamp/EphemeristsScoreStamp'))
const EphemeristsSeal = lazyArchetype(() => import('../components/metataskSeal/skins/EphemeristsSeal'))
const EphemeristsInvitationLetter = lazyArchetype(() => import('../components/invitation/EphemeristsInvitationLetter'))
const EphemeristsSigil = lazyArchetype(() => import('../components/sigil/EphemeristsSigil'))
const EphemeristsSelectCard = lazyArchetype(() => import('../components/selectCard/EphemeristsSelectCard'))

export const EPHEMERISTS_MANIFEST: FactionManifest = {
  slug: 'ephemerists',

  factionSelectCard: () => EphemeristsSelectCard,
  taskCard: () => EphemeristsTaskCard,
  praxisCard: () => EphemeristsPraxisCard,
  // Dress over the shared praxis-detail layout (#1120, ADR-0061).
  praxisDetail: () => EphemeristsPraxisDetail,
  scoreStamp: () => EphemeristsScoreStamp,
  metataskSeal: () => EphemeristsSeal,
  avatar: () => EphemeristsAvatar,
  invitationLetter: () => EphemeristsInvitationLetter,
  backdrop: () => EphemeristsBackdrop,
  sigil: () => EphemeristsSigil,
  comment: () => EphemeristsComment,
  feedFrame: () => EphemeristsFeedFrame,
  vote: () => EphemeristsVote,
  taskDetail: () => EphemeristsTaskDetail,
  editPraxis: () => EphemeristsEditPraxis,
  factionHero: () => EphemeristsFactionHero,
  factionBody: () => EphemeristsFactionBody,
  profileBody: () => EphemeristsProfileBody,
  createCharacter: () => EphemeristsCreateCharacter,
  // Derived from the create plate (#2537); shared slots mounted from
  // `characterPaths/editCharacterSlots`, never re-drawn.
  editCharacter: () => EphemeristsEditCharacter,
  // Derived from the create plate (#2538).
  proposeTask: () => EphemeristsProposeTask,
  duelSeal: () => EphemeristsDuelSealConfirm,
  mobileFieldDesk: () => EphemeristsFieldDesk,
}
