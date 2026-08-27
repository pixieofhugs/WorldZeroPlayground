/**
 * na (Unaffiliated) — the ninth faction's twenty-one surfaces (#2530, #2537).
 *
 * NOT AN OVERRIDE LIST, AND THE ONLY MANIFEST OF WHICH THAT IS TRUE. The other
 * eight declare what they override; this one declares what everything else
 * falls back TO, so it must claim every key in `SURFACE_KEYS` and
 * `defaultManifest.test.tsx` fails the build if it misses one. A surface with no
 * row here renders nothing at all for an unaffiliated player — there is no
 * second mechanism behind it any more.
 *
 * WHY THIS FILE EXISTS. `Default*` stopped being a fallback some time before the
 * 2026-08-23 audit named it: 160 of 160 (surface × faction) slots are filled, so
 * "partial registration is the normal case" had become false, and `Default*` was
 * simply na's skin — reached by a SECOND mechanism, the third argument to
 * `pickVariant`, spelled out by hand at ~20 dispatchers. Two mechanisms, one of
 * which served exactly one slug. The cost was never bytes; it was that the model
 * in the docs was not the model in the code and a reader had to hold both.
 *
 * IT IS A DISPATCH CHANGE, NOT A COLOUR ONE. `CSS_KEY['na'] === 'default'` is
 * untouched, `isKnownFaction('na')` still returns false (load-bearing for
 * ornament, #749), and there is no `--faction-na-*` token block — na reads
 * `--faction-default-*` and that is ADR-0039. The rendered output of all 180
 * (surface, slug) pairs is byte-identical across this change; that is the
 * acceptance test, and the identity table in `defaultManifest.test.tsx` is it.
 *
 * THREE ROWS POINT AT A MODULE THAT IS NOT NAMED `Default*`, or was not a module
 * at all until this issue:
 *
 *   - `backdrop` is `WatercolorBackground` — the site's own watercolour ground,
 *     which IS the designed neutral for a page with no faction. There was never
 *     a `DefaultBackdrop.tsx` and adding one now would be a re-export with a
 *     nicer name.
 *   - `avatar` and `feedFrame` were functions defined inside their own
 *     dispatchers. #2530 extracted both, unchanged, so this file has something to
 *     point at.
 *
 * Three more (`sigil`, `comment`, `duelSeal`) are still named exports of their
 * dispatcher and are reached the way `UaSigilAdapter` already was — a `.then()`
 * that picks the export. That is a co-location, not a bypass: the manifest is
 * the only thing that reads them.
 *
 * Entries are thunks over `lazyArchetype`, the same discipline as the other
 * eight and for both of the same reasons: the deferred read keeps the
 * dispatcher/archetype module cycle harmless (see the note in `./manifest.ts` —
 * a plain object literal captures `undefined` and the faction falls back
 * forever, invisible to `tsc`), and the dynamic import keeps every archetype
 * out of the entry chunk. `manifestsStayLazy.test.ts` holds both.
 */
import type { FactionManifest } from './manifest'
import { lazyArchetype } from './lazyArchetype'

const DefaultAvatar = lazyArchetype(() => import('../components/avatar/DefaultAvatar'))
const DefaultBackdrop = lazyArchetype(() => import('../components/layout/WatercolorBackground'))
const DefaultComment = lazyArchetype(() => import('../components/comments/CommentThread').then((m) => ({ default: m.DefaultComment })))
const DefaultCreateCharacter = lazyArchetype(() => import('../pages/characterPaths/archetypes/DefaultCreateCharacter'))
const DefaultDuelSealConfirm = lazyArchetype(() => import('../components/duel/DuelSealConfirm').then((m) => ({ default: m.DefaultDuelSealConfirm })))
const DefaultEditCharacter = lazyArchetype(() => import('../pages/characterPaths/archetypes/DefaultEditCharacter'))
const DefaultEditPraxis = lazyArchetype(() => import('../pages/editPraxis/archetypes/DefaultEditPraxis'))
const DefaultFactionBody = lazyArchetype(() => import('../pages/factionDetail/archetypes/DefaultFactionBody'))
const DefaultFactionHero = lazyArchetype(() => import('../components/factionHero/DefaultFactionHero'))
const DefaultFeedFrame = lazyArchetype(() => import('../components/feed/DefaultFeedFrame'))
const DefaultFieldDesk = lazyArchetype(() => import('../pages/fieldDesk/mobileArchetypes/DefaultFieldDesk'))
const DefaultPraxisCard = lazyArchetype(() => import('../components/praxisCard/desktop/DefaultPraxisCard'))
const DefaultPraxisDetail = lazyArchetype(() => import('../pages/praxisDetail/archetypes/DefaultPraxisDetail'))
const DefaultProfileBody = lazyArchetype(() => import('../pages/characterProfile/archetypes/DefaultProfileBody'))
const DefaultScoreStamp = lazyArchetype(() => import('../components/praxisCard/scoreStamp/DefaultScoreStamp'))
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
  taskDetail: () => DefaultTaskDetail,
  praxisDetail: () => DefaultPraxisDetail,
  editPraxis: () => DefaultEditPraxis,
  createCharacter: () => DefaultCreateCharacter,
  editCharacter: () => DefaultEditCharacter,
  factionHero: () => DefaultFactionHero,
  factionBody: () => DefaultFactionBody,
  profileBody: () => DefaultProfileBody,
  mobileFieldDesk: () => DefaultFieldDesk,
}
