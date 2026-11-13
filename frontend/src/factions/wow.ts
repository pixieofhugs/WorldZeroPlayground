/**
 * wow — Warriors of Whimsy (#821). Claims every key in `SURFACE_KEYS`
 * (`surfaceDispatch.test.ts`). Two chromes on one palette, deliberately unalike:
 * a quest is ISSUED by decree (task card, comment, feed frame) and proof is
 * RECORDED in the chronicle (praxis card, praxis detail; ADR-0050).
 *
 * Shared vocabulary: `components/duel/wowLists.tsx` (duel seal),
 * `components/factionMarks/wowOrnament.tsx` (wavy rule, balloons, bunting;
 * §6/#849), `components/factionMarks/wowMobile.tsx` (field pavilion). Copy is the
 * shared Unaffiliated spec; WOW speaks in dress alone (#1204).
 */
import type { FactionManifest } from './manifest'
import { lazyArchetype } from './lazyArchetype'

const WowAvatar = lazyArchetype(() => import('../components/avatar/WowAvatar'))
const WowBackdrop = lazyArchetype(() => import('../components/backdrop/WowBackdrop'))
const WowSelectCard = lazyArchetype(() => import('../components/selectCard/WowSelectCard'))
const WowComment = lazyArchetype(() => import('../components/comments/voices/WowComment'))
const WowFeedFrame = lazyArchetype(() => import('../components/feed/WowFeedFrame'))
const WowFactionHero = lazyArchetype(() => import('../components/factionHero/WowFactionHero'))
const WowSigil = lazyArchetype(() => import('../components/sigil/WowSigil').then((m) => ({ default: m.WowSigil })))
const WowTaskCard = lazyArchetype(() => import('../components/taskCard/WowTaskCard'))
const WowProfileBody = lazyArchetype(() => import('../pages/characterProfile/archetypes/WowProfileBody'))
const WowVote = lazyArchetype(() => import('../components/vote/WowVote'))
const WowPraxisCard = lazyArchetype(() => import('../components/praxisCard/desktop/WowPraxisCard'))
const WowScoreStamp = lazyArchetype(() => import('../components/praxisCard/scoreStamp/WowScoreStamp'))
const WowSeal = lazyArchetype(() => import('../components/metataskSeal/skins/WowSeal'))
const WowEditPraxis = lazyArchetype(() => import('../pages/editPraxis/archetypes/WowEditPraxis'))
const WowDuelSealConfirm = lazyArchetype(() => import('../components/duel/WowDuelSealConfirm'))
const WowFieldDesk = lazyArchetype(() => import('../pages/fieldDesk/mobileArchetypes/WowFieldDesk'))
const WowTaskDetail = lazyArchetype(() => import('../pages/taskDetail/archetypes/WowTaskDetail'))
const WowPraxisDetail = lazyArchetype(() => import('../pages/praxisDetail/archetypes/WowPraxisDetail'))
const WowFactionBody = lazyArchetype(() => import('../pages/factionDetail/archetypes/WowFactionBody'))
const WowCreateCharacter = lazyArchetype(() => import('../pages/characterPaths/archetypes/WowCreateCharacter'))
const WowEditCharacter = lazyArchetype(() => import('../pages/characterPaths/archetypes/WowEditCharacter'))
const WowInvitationLetter = lazyArchetype(() => import('../components/invitation/WowInvitationLetter'))
const WowProposeTask = lazyArchetype(() => import('../pages/proposeTask/archetypes/WowProposeTask'))

export const WOW_MANIFEST: FactionManifest = {
  slug: 'wow',

  sigil: () => WowSigil,
  avatar: () => WowAvatar,
  taskCard: () => WowTaskCard,
  // #1037 — the parchment field. One responsive component (ADR-0058).
  taskDetail: () => WowTaskDetail,
  // #1121 — the chronicle entry: dress over the shared praxis-detail page
  // (ADR-0061, ADR-0063).
  praxisDetail: () => WowPraxisDetail,
  comment: () => WowComment,
  feedFrame: () => WowFeedFrame,
  praxisCard: () => WowPraxisCard,
  scoreStamp: () => WowScoreStamp,
  metataskSeal: () => WowSeal,
  vote: () => WowVote,
  editPraxis: () => WowEditPraxis,

  factionHero: () => WowFactionHero,
  // Derived, not drawn (no sheet): `wowOrnament` + the other bodies' main/rail
  // shape. Both widths (ADR-0078).
  factionBody: () => WowFactionBody,
  backdrop: () => WowBackdrop,
  profileBody: () => WowProfileBody,
  factionSelectCard: () => WowSelectCard,

  // #895 — the lists (tourney joust), one responsive component.
  duelSeal: () => WowDuelSealConfirm,

  // #901 — the field pavilion, the kit's one phone screen. The pavilion profile
  // lives on as the phone branch of `WowProfileBody`.
  mobileFieldDesk: () => WowFieldDesk,

  // #2350 — THE CHARTER, derived (owner ruling): the decree's head over the
  // writ composer's chassis. One responsive component.
  createCharacter: () => WowCreateCharacter,

  // #2537 — THE AMENDED CHARTER, derived: the charter plus a codicil holding
  // `editCharacterSlots`' shared slots, mounted not redrawn (#2788).
  editCharacter: () => WowEditCharacter,

  // #2538 — THE PETITION, derived from the charter. Slug is the TARGET faction.
  proposeTask: () => WowProposeTask,

  // #3294 — the invitation letter: the chronicle, in the cards' own ornaments.
  invitationLetter: () => WowInvitationLetter,
}
