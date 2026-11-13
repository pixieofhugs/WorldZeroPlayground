/**
 * albescent — the hidden faction (#783, ADR-0048).
 *
 * A secret society hiding in plain sight: it must look like an unaffiliated
 * player everywhere. Every row is `Default` PLUS a flourish (usually motion),
 * never a skin of its own. Every surface in `SURFACE_KEYS` is named here
 * (#2531, held by `surfaceDispatch.test.ts`), so a new surface costs one row.
 *
 * Rows are either RE-CUTS (change pixels where na already draws a mark) or
 * PASS-THROUGHS (render the Default byte-identically, so an absent row is not
 * misread as "nobody got to it"). `src/__tests__/albescentWrapperKinds.test.tsx`
 * holds each to its kind.
 *
 * Anything added here must read `--faction-default-*`: repainting Albescent in
 * its own colours puts it back in the spectrum and un-hides it. The edge is
 * livery, not novelty.
 */
import type { FactionManifest } from './manifest'
import { lazyArchetype } from './lazyArchetype'

const AlbescentSelectCard = lazyArchetype(() => import('../components/selectCard/AlbescentSelectCard'))
const AlbescentTaskCard = lazyArchetype(() => import('../components/taskCard/AlbescentTaskCard'))
const AlbescentVote = lazyArchetype(() => import('../components/vote/AlbescentVote'))
const AlbescentPraxisCard = lazyArchetype(() => import('../components/praxisCard/desktop/AlbescentPraxisCard'))
// All wrappers are lazy: each pulls in a whole na surface the initial load
// does not need.
const AlbescentScoreStamp = lazyArchetype(() => import('../components/praxisCard/scoreStamp/AlbescentScoreStamp'))
const AlbescentSeal = lazyArchetype(() => import('../components/metataskSeal/skins/AlbescentSeal'))
const AlbescentTaskDetail = lazyArchetype(() => import('../pages/taskDetail/archetypes/AlbescentTaskDetail'))
const AlbescentPraxisDetail = lazyArchetype(() => import('../pages/praxisDetail/archetypes/AlbescentPraxisDetail'))
const AlbescentFeedFrame = lazyArchetype(() => import('../components/feed/AlbescentFeedFrame'))
const AlbescentProfileBody = lazyArchetype(() => import('../pages/characterProfile/archetypes/AlbescentProfileBody'))
const AlbescentFactionHero = lazyArchetype(() => import('../components/factionHero/AlbescentFactionHero'))
const AlbescentFactionBody = lazyArchetype(() => import('../pages/factionDetail/archetypes/AlbescentFactionBody'))
const AlbescentEditPraxis = lazyArchetype(() => import('../pages/editPraxis/archetypes/AlbescentEditPraxis'))
const AlbescentFieldDesk = lazyArchetype(() => import('../pages/fieldDesk/mobileArchetypes/AlbescentFieldDesk'))
const AlbescentAvatar = lazyArchetype(() => import('../components/avatar/AlbescentAvatar'))
// The sigil adapters live in `FactionSigil.tsx`; reading one from here is
// safe only because of `lazyArchetype` (the thunk note in `./manifest.ts`).
const AlbescentSigilAdapter = lazyArchetype(() => import('../components/sigil/FactionSigil').then((m) => ({ default: m.AlbescentSigilAdapter })))
const AlbescentBackdrop = lazyArchetype(() => import('../components/backdrop/AlbescentBackdrop'))
const AlbescentComment = lazyArchetype(() => import('../components/comments/voices/AlbescentComment'))
const AlbescentCreateCharacter = lazyArchetype(() => import('../pages/characterPaths/archetypes/AlbescentCreateCharacter'))
const AlbescentEditCharacter = lazyArchetype(() => import('../pages/characterPaths/archetypes/AlbescentEditCharacter'))
const AlbescentDuelSealConfirm = lazyArchetype(() => import('../components/duel/AlbescentDuelSealConfirm'))
// #3294 PASS-THROUGH; `AlbescentInvitation` (the order's own letter) is a different surface.
const AlbescentInvitationLetter = lazyArchetype(() => import('../components/invitation/DefaultInvitationLetter'))
const AlbescentDuelReader = lazyArchetype(() => import('../pages/duelReader/archetypes/AlbescentDuelReader'))
const AlbescentProposeTask = lazyArchetype(() => import('../pages/proposeTask/archetypes/AlbescentProposeTask'))

export const ALBESCENT_MANIFEST: FactionManifest = {
  slug: 'albescent',

  /** RE-CUT (#2632): `DefaultSelectCard` + a conditional ground and a walking hairline. Ships to every caller and redacts (ADR-0082). */
  factionSelectCard: () => AlbescentSelectCard,

  /** The na card + a slow rainbow drift (#821). */
  praxisCard: () => AlbescentPraxisCard,

  /** #2501: `DefaultScoreStamp` + one class that sets its two spectra moving. */
  scoreStamp: () => AlbescentScoreStamp,

  /** #1023: drifting spectrum edge + breathing aurora; one responsive card (ADR-0056). */
  taskCard: () => AlbescentTaskCard,

  /**
   * #1038: aurora, prism foil and spectrum edge; the score becomes a turning
   * prism ring via `worthSlot`. No faction copy (ADR-0057, ADR-0027): a page
   * announcing itself as Albescent would un-hide the society.
   */
  taskDetail: () => AlbescentTaskDetail,

  /**
   * #1140: three ornament layers through the `ornament` slot, no structural
   * delta. No `detail.albescent.*` copy, and nothing may voice a slot
   * (ADR-0061, ADR-0027).
   */
  praxisDetail: () => AlbescentPraxisDetail,

  /**
   * #1203: spectrum wash + travelling hairline over `DefaultFeedFrame`, all four
   * chrome slots forwarded. Archive/swipe/undo live in `FeedItemSlot`. No comment
   * voice (epic #1192 decision 13; see `comment`). `era_announcement` is
   * chassis-exempt for every faction.
   */
  feedFrame: () => AlbescentFeedFrame,

  /**
   * #1630: na's static spectrum band drifts via `identityOrnament`. A profile is
   * where a secret society would give itself away, so this row may only add
   * motion.
   */
  profileBody: () => AlbescentProfileBody,

  /**
   * #2502: one ornament span; badge stays na's (a labyrinth on every byline
   * would un-hide). The only size-conditional row: ring at 48px+, absent at
   * 24/32px bylines. Mounts with or without `.user-media` (#2457).
   */
  avatar: () => AlbescentAvatar,

  /**
   * #2529: not a wrapper. The labyrinth is an alpha stencil painted with
   * `--faction-default-rainbow-conic` — a shape, not a livery, so it keeps the
   * contract. Adds no motion: `alb-moves` is per-wrapper (ADR-0083 §1, §3).
   */
  sigil: () => AlbescentSigilAdapter,

  /**
   * Vote (#843): ferrofluid blobs morph over Default's row; tier words stay
   * gone (#783), plain numerals via `reframeLabel`.
   */
  /**
   * #2504: both halves of the faction page, reached only via `AlbescentGate`
   * (ADR-0027). Prism sheet, turning labyrinth, travelling ring, dark-only bloom.
   */
  factionHero: () => AlbescentFactionHero,
  factionBody: () => AlbescentFactionBody,

  vote: () => AlbescentVote,

  /**
   * #930: a seal keeps its ISSUER's voice, so it is a reveal moment. na stock;
   * the strip moves. Stays FLAT (no `.alb-prism`) or an Albescent host paints the
   * bloom twice.
   */
  metataskSeal: () => AlbescentSeal,

  /**
   * #2505: one ornament ring on the sheet edge, CHROME ONLY by measurement —
   * the quiet ink is already 3.67:1 light / 3.02:1 dark, so any wash behind the
   * textarea breaks legibility. One row covers both widths (ADR-0065 §2).
   */
  editPraxis: () => AlbescentEditPraxis,

  /**
   * #2505 ruling 5: `.alb-desk .spectrum-rule` sets the band's existing hairline
   * travelling (replacing, not adding, a spectrum). Mobile only by ruling; the
   * desktop `/field-desk` dispatches on no faction.
   */
  mobileFieldDesk: () => AlbescentFieldDesk,

  /** PASS-THROUGH. Only profiles dispatch a backdrop; an own ground would un-hide (ADR-0027). */
  backdrop: () => AlbescentBackdrop,

  /**
   * PASS-THROUGH. na's comment marks are unreachable by a wrapper: the hairline
   * is a per-slug `factionFill(slug, 'bar')` and the @mention text is
   * gradient-clipped. Epic #1192 decision 13.
   */
  comment: () => AlbescentComment,

  /**
   * RE-CUT: `.alb-moves` turns the credential card's `.spectrum-dial` ring
   * (both widths since #2992; archetype reads `useFormFactor()`). Slug is the
   * pick in progress. Mirrors `surfaceDispatch.test.ts`'s createCharacter note;
   * the two move together.
   */
  createCharacter: () => AlbescentCreateCharacter,

  /**
   * RE-CUT, the create row's twin (#2537, one mount since #2991). Slug is the
   * EDITED character's, so only an Albescent life's own page moves.
   */
  editCharacter: () => AlbescentEditCharacter,

  /**
   * PASS-THROUGH by decision (#2538, #2993): the sheet frame is an inline
   * background and the page mounts no `.spectrum-dial`/`.spectrum-rule`, so
   * `.alb-moves` has nothing to grab. Slug is the TARGET faction, reachable by
   * non-members (ADR-0027). See `AlbescentProposeTask`.
   */
  proposeTask: () => AlbescentProposeTask,

  /**
   * PASS-THROUGH: no spectrum to re-cut. Skinned by the TASK's faction (visible
   * to non-members) and forfeit is irreversible, so legibility beats a tell.
   */
  duelSeal: () => AlbescentDuelSealConfirm,

  /**
   * PASS-THROUGH (#1084, ADR-0092). `.design-sync/BRIEF-duel-surfaces.md` §6
   * forbids an Albescent duel dress without an owner ruling; same reach as
   * `duelSeal`, and the one na mark is a band (#1127).
   */
  duelReader: () => AlbescentDuelReader,

  /** The invitation letter (#3294) -- a PASS-THROUGH to the Default letter. */
  invitationLetter: () => AlbescentInvitationLetter,
}
