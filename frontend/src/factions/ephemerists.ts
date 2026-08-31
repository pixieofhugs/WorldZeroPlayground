/**
 * ephemerists — the surfaces this faction overrides (#782).
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
const EphemeristsTaskCard = lazyArchetype(() => import('../components/taskCard/EphemeristsTaskCard'))
const EphemeristsTaskDetail = lazyArchetype(() => import('../pages/taskDetail/archetypes/EphemeristsTaskDetail'))
const EphemeristsVote = lazyArchetype(() => import('../components/vote/EphemeristsVote'))
const EphemeristsPraxisCard = lazyArchetype(() => import('../components/praxisCard/desktop/EphemeristsPraxisCard'))
const EphemeristsPraxisDetail = lazyArchetype(() => import('../pages/praxisDetail/archetypes/EphemeristsPraxisDetail'))
const EphemeristsScoreStamp = lazyArchetype(() => import('../components/praxisCard/scoreStamp/EphemeristsScoreStamp'))
const EphemeristsSeal = lazyArchetype(() => import('../components/metataskSeal/skins/EphemeristsSeal'))
const EphemeristsSigil = lazyArchetype(() => import('../components/sigil/EphemeristsSigil'))
const EphemeristsSelectCard = lazyArchetype(() => import('../components/selectCard/EphemeristsSelectCard'))

export const EPHEMERISTS_MANIFEST: FactionManifest = {
  slug: 'ephemerists',

  factionSelectCard: () => EphemeristsSelectCard,
  taskCard: () => EphemeristsTaskCard,
  praxisCard: () => EphemeristsPraxisCard,
  // Dress over the ONE shared praxis-detail layout (#1120, epic #1085,
  // ADR-0061). Not a layout of its own: `DefaultPraxisDetail` remains the
  // contract, and dropping this line hands the surface straight back to it.
  praxisDetail: () => EphemeristsPraxisDetail,
  scoreStamp: () => EphemeristsScoreStamp,
  metataskSeal: () => EphemeristsSeal,
  avatar: () => EphemeristsAvatar,
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
  // The first registration on `createCharacter` (#2347), landing in the same PR
  // as the surface itself — the manifest forbids merging a slot no faction
  // fills. The slug this dispatches on is the calling being PICKED, not a
  // loaded record, so the page reskins to this plate live and returns to the
  // Default the moment the pick is cleared.
  createCharacter: () => EphemeristsCreateCharacter,
  // The edit half of the same page family (#2537's fan-out). DERIVED from the
  // create plate above — same chassis, same ground, same field furniture — and
  // extended to the four groups a create dress has no slot for: location,
  // handle, the faction row and the delete danger zone. The last two are
  // MOUNTED from `characterPaths/editCharacterSlots`, never re-drawn.
  editCharacter: () => EphemeristsEditCharacter,
  duelSeal: () => EphemeristsDuelSealConfirm,
  mobileFieldDesk: () => EphemeristsFieldDesk,
}
