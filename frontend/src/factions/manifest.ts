/**
 * Per-faction manifest — the shape a faction fills in to claim its surfaces.
 *
 * BEFORE (#782): each *surface* owned a slug-keyed map of every faction, so
 * adding a faction meant editing 30 modules and discovering the one you forgot
 * visually, weeks later. NOW each *faction* owns one manifest declaring only the
 * surfaces it overrides, and the dispatchers read from it.
 *
 * The manifest is OVERRIDE-ONLY. Every field is optional; an undeclared surface
 * resolves to that surface's own `Default*` archetype via `pickVariant`. This
 * was already `pickVariant`'s behaviour — the manifest just makes it the
 * documented contract. A faction that declares nothing renders correctly
 * everywhere, including on surfaces that do not exist yet. Partial registration
 * is the normal case, not a degraded one.
 *
 * `Default*` NAMES AN ARCHETYPE, NOT NECESSARILY A FILE. Three surfaces carry
 * their na rendering inside the dispatcher instead of in a skin module:
 * `avatar` (`DefaultAvatar`, in `FactionAvatar.tsx`), `feedFrame`
 * (`DefaultFeedFrame`, in `FactionFeedFrame.tsx`) and `backdrop` (which falls
 * back to the site's own `WatercolorBackground`). Counting skin files therefore
 * UNDERCOUNTS those three by one each — every slug is still served. Read an
 * absent `Default*.tsx` as "co-located with its dispatcher", never as a hole in
 * the na kit.
 *
 * Adding a faction: one new module here, one line in `./index.ts`. Adding a
 * SURFACE: one field here, one entry in `SURFACE_KEYS`, and the dispatcher calls
 * `surfaceMap('<key>')` instead of declaring its own map.
 *
 * WHY EVERY ENTRY IS A THUNK (`taskCard: () => UaTaskCard`)
 * ---------------------------------------------------------
 * Dispatcher modules and archetype modules already import each other: an
 * archetype pulls shared atoms out of its dispatcher (`AlbescentAvatar` imports
 * `BadgedAvatar` from `FactionAvatar`), and ten archetypes are defined *inside*
 * their dispatcher outright (the seven praxis cards in `PraxisCard.tsx`, the
 * three sigil adapters in `FactionSigil.tsx`). Once a dispatcher also reads the
 * manifest index, that closes a module cycle.
 *
 * A plain object literal — `{ sigil: UaSigilAdapter }` — READS the imported
 * binding while the modules are still evaluating. Whenever the dispatcher
 * happens to enter the cycle first, that read lands on an uninitialised binding
 * and the manifest silently captures `undefined`, so the faction falls back to
 * the Default skin forever. This is not hypothetical: it is exactly how UA lost
 * its heraldic sigil during this refactor, and it is invisible to `tsc`.
 *
 * Wrapping each entry in `() =>` defers the read to render time, by which point
 * every module has finished evaluating. It costs one arrow per row and makes the
 * seam correct by construction, independent of import order — which matters
 * because a faction manifest may name a component from anywhere in the tree.
 */
import type { ComponentType } from 'react'

import type { CardProps } from '../components/taskCard/TaskCard'
import type { SealSkinProps } from '../components/metataskSeal/types'
import type { ArchetypeProps as PraxisCardProps } from '../components/praxisCard/PraxisCard'
import type { FactionAvatarProps } from '../components/avatar/FactionAvatar'
import type { SigilVariantProps } from '../components/sigil/FactionSigil'
import type { CommentComponent } from '../components/comments/shared'
import type { FeedFrameProps } from '../components/feed/feedFrameProps'
import type { VoteUIProps } from '../components/vote/VoteUI'
import type { ScoreStampProps } from '../components/praxisCard/scoreStamp/ScoreStamp'
import type { FactionSelectCardProps } from '../components/selectCard/FactionSelectCard'
import type { DuelSealConfirmProps } from '../components/duel/DuelSealConfirm'
import type { FactionHeroProps } from '../pages/FactionDetail'
import type { ProfileBodyProps } from '../pages/characterProfile/FactionProfileBody'
import type { TaskDetailState } from '../pages/taskDetail/useTaskDetail'
import type { PraxisDetailState } from '../pages/praxisDetail/usePraxisDetail'
import type { EditPraxisState } from '../pages/editPraxis/useEditPraxis'
import type { CreateCharacterState } from '../pages/characterPaths/useCreateCharacter'
import type { FactionDetailState } from '../pages/factionDetail/useFactionDetail'
import type { FieldDeskHomeState } from '../pages/fieldDesk/useFieldDeskHome'

/**
 * A deferred reference to a component. See the thunk note above: manifest
 * entries must not be read at module-evaluation time.
 */
type Lazy<T> = () => T

/** The `{ state }` prop shape the page-level archetypes all share. */
type Stateful<S> = ComponentType<{ state: S }>

export interface FactionManifest {
  /** The faction's slug. Also the key every surface map is built under. */
  readonly slug: string

  // ─── Cards & chrome (desktop) ──────────────────────────────────────────────
  /**
   * The faction's task card. ONE responsive component per faction (ADR-0056):
   * it sizes itself for the phone via `useFormFactor()` internally, so there is
   * no `mobileTaskCard` twin — that surface was retired when the owner's QA
   * verdict accepted the unified card. "desktop" here names the section, not
   * the form factor this one serves.
   */
  readonly taskCard?: Lazy<ComponentType<CardProps>>
  readonly praxisCard?: Lazy<ComponentType<PraxisCardProps>>
  readonly factionSelectCard?: Lazy<
    ComponentType<Omit<FactionSelectCardProps, 'faction'>>
  >
  readonly avatar?: Lazy<ComponentType<FactionAvatarProps>>
  readonly backdrop?: Lazy<ComponentType>
  readonly sigil?: Lazy<ComponentType<SigilVariantProps>>
  readonly comment?: Lazy<CommentComponent>
  /**
   * The faction's activity-feed CHASSIS (surface #12). #1194 widened this from
   * `{ children }` to {@link FeedFrameProps}: a frame that owned only children
   * could not draw the kicker band, the timestamp or the archive control, all
   * three of which every design sheet puts on the chassis. Read that interface's
   * docblock before writing a faction skin — nothing may be written against the
   * old shape.
   */
  readonly feedFrame?: Lazy<ComponentType<FeedFrameProps>>
  readonly vote?: Lazy<ComponentType<VoteUIProps>>
  /**
   * The praxis-card score stamp (ADR-0049). Size-agnostic — the same component
   * serves the desktop card, the mobile card and the detail surfaces.
   */
  readonly scoreStamp?: Lazy<ComponentType<ScoreStampProps>>
  /**
   * The seal an issuing faction leaves on a praxis it metatasked (#927). One
   * responsive component per faction — no mobile twin, the sticker renders
   * near-identical at 340px.
   */
  readonly metataskSeal?: Lazy<ComponentType<SealSkinProps>>

  // ─── Pages (desktop) ───────────────────────────────────────────────────────
  readonly taskDetail?: Lazy<Stateful<TaskDetailState>>
  readonly praxisDetail?: Lazy<Stateful<PraxisDetailState>>
  readonly editPraxis?: Lazy<Stateful<EditPraxisState>>
  readonly factionHero?: Lazy<ComponentType<FactionHeroProps>>
  readonly factionBody?: Lazy<Stateful<FactionDetailState>>
  readonly profileBody?: Lazy<ComponentType<ProfileBodyProps>>
  /**
   * Character creation (#2346). ONE responsive component per faction — each
   * archetype reads `useFormFactor()` itself, the way `editPraxis` and the
   * profile bodies do. This is NOT the retired mobile-only
   * `mobileCreateCharacter` coming back under a new name; see the retirement
   * note below for what that slot was and why it went.
   *
   * The slug this dispatches on is not the viewer's faction and not the
   * character's — no character exists yet. It is `factionSlug` out of
   * {@link CreateCharacterState}, the calling being picked RIGHT NOW, so the
   * page reskins live as the pick changes and returns to Default when it is
   * cleared. `''` means born unaffiliated and resolves to the Default (na)
   * archetype, which is also where an unregistered slug lands: `albescent` is
   * pickable here since #2399 and deliberately renders Default, because every
   * Albescent registration is a wrapper rather than a skin (ADR-0027, #2401).
   */
  readonly createCharacter?: Lazy<Stateful<CreateCharacterState>>

  // ─── Duel surfaces ─────────────────────────────────────────────────────────
  // ONE responsive component per faction, both form factors (#1313): the seven
  // skins hang their interior in `components/duel/DuelSealSheet`, which is the
  // single place the seal reads `useFormFactor()`. The duel SEAL is the only
  // dispatched duel surface. `duelRail` /
  // `mobileDuelRail` were retired outright in #1090: the duel stopped being a
  // dispatched surface at all. It is now a card INSIDE the praxis-detail
  // archetype (`pages/praxisDetail/DuelCard.tsx`), so a faction dresses it by
  // dressing its `praxisDetail` — there is no second dispatcher left to feed.
  // #1153 finished that thought: the card takes `style`, `heading` AND `ink`, so
  // an archetype can reach every part of it a rail skin used to own.
  //
  // This is deliberately NOT the `praxisDetail` move (#1089), which kept its
  // field with zero registrations because the epic-#1085 designs were about to
  // re-register there — as all eight since have. A
  // surface with no dispatcher is not "empty"; it is gone, and keeping the field
  // would mean keeping a dead `DuelRailSkinProps` alive to type it.
  readonly duelSeal?: Lazy<ComponentType<DuelSealConfirmProps>>

  // ─── Mobile twins (#494 form-factor dispatch) ──────────────────────────────
  // Task cards, task detail, praxis detail, the EDIT-PRAXIS COMPOSER, the PRAXIS
  // CARD, the CHARACTER PROFILE, the DUEL SEAL and now the FACTION PAGE have no
  // mobile twin: ADR-0056, ADR-0058, ADR-0061/#1085, ADR-0065/#1181, ADR-0067,
  // #1319, #1313 and ADR-0078 each collapsed their surface to one responsive
  // component per faction and retired it. Every one of those licences is scoped
  // to its own surface — ADR-0035 still governs `mobileFieldDesk` below, and
  // each record says in terms that it licenses no further collapse: the next
  // surface needs its own record, the same way. `mobileFieldDesk` is not the
  // next one: it is a genuinely different screen rather than a narrow rendering
  // of the roster, and #1320 says so.
  //
  // `mobileFactionPage` is the eighth (ADR-0078). It looked like the others —
  // eight skins beside eight bodies — and was not: the two registries held two
  // DIFFERENT CONTENT SETS. Coven's body reads twenty bespoke `coven.*` keys;
  // Coven's phone skin read one, plus a shared generic set, so a phone got
  // generic chrome in a faction dress and the manifesto, the spotlight and the
  // bespoke join flow did not exist there at all. The collapse was therefore not
  // output-neutral, and that was the point of it. `.wz-faction-grid` already
  // carried the ≤860px drop to one column, so no chassis was needed; the one
  // skin that wants the viewport reads `useFormFactor()` itself.
  //
  // `mobileDuelSeal` is the seventh (#1313). It was the tightest pair in the
  // set: SEVEN twins whose difference was the positioning shell — a centred
  // 460px card over a scrim, or a full-bleed sheet — repeated seven times, with
  // byte-identical slots, tokens, contrast-measured inks and copy modes on both
  // sides of each pair. That shell is `DuelSealSheet` now: a skin declares its
  // `ground` (paper, ink, face, the opponent's edge) and its `card` (border,
  // radius, clip, shadow — the chrome that only means something while it floats)
  // and the chassis picks. No skin lost its frame; the branch went from fourteen
  // files to one.
  //
  // `mobileProfile` is the sixth (#1319). It was the clearest case for the
  // collapse and the weakest seam in the set: TWO of nine slugs ever filled it
  // (na by being the call site's Default, wow by registering), so a Coven or UA
  // player got the na spectrum profile on a phone and their own dress on a
  // laptop. Both skins are now the mobile branch of their own `profileBody`
  // (`DefaultProfileBody`, `WowProfileBody`), and every other faction reaches
  // its own body at both widths through `ProfileSkin`, which grew the same
  // `useFormFactor()` read.
  //
  // `mobilePraxisCard` is the fifth (ADR-0067). It was the last CARD-level twin
  // and the largest — ten skins and a 556-line slot library that re-derived the
  // byline, task ref, title, excerpt, roster, mode chip, media gallery and vote
  // footer the desktop slots already drew from the same fields. The mobile feed
  // page survives; only its cards changed.
  //
  // `mobileEditPraxis` is gone rather than kept empty, which is the same choice
  // `duelRail` made and the OPPOSITE of what `praxisDetail` did (#1089 kept its
  // field with zero registrations because the epic-#1085 designs were about to
  // re-register there). ADR-0065 §2 picks the retirement deliberately: all nine
  // composer designs were committed before a single archetype was rebuilt, so
  // the mobile skins are superseded by a committed design rather than held open
  // pending one. There is no partial-registration story for a surface that no
  // longer exists, and no future issue should try to re-register it.
  //
  // `mobileCreateCharacter`, `mobileEditCharacter`, `mobileFactionsDirectory`
  // and `mobilePlayersDirectory` are gone the same way. They were declared by
  // #516/#901 and never claimed by a single faction, so all four dispatchers
  // resolved to their `Default*` skin on every render. Those four pages now
  // render the Default directly. A future faction skin for one of them adds the
  // field back with a registration in the same commit — a slot no faction fills
  // is not a seam, it is a lookup that always returns the same answer.
  //
  // #2346 IS THAT COMMIT, for the first of the four, and it is worth reading
  // what it did and did not restore. `createCharacter` above is a NEW,
  // RESPONSIVE surface, not `mobileCreateCharacter` un-retired: the mobile-only
  // slot stays dead and `mobileArchetypes/DefaultCreateCharacter` was folded
  // into `archetypes/DefaultCreateCharacter` rather than left as a second
  // mobile path, so the page has one archetype per faction at both widths like
  // every collapse above it. And it landed WITH its first registrations
  // (ephemerists, #2347) in the same PR, which is the whole of the rule this
  // note states — the chassis was never merged with an empty slot. The other
  // three remain retired and unclaimed.
  readonly mobileFieldDesk?: Lazy<Stateful<FieldDeskHomeState>>
}

/** Every surface key except `slug`. */
export type FactionSurface = Exclude<keyof FactionManifest, 'slug'>

/**
 * The exhaustive surface list, for tests that must walk every surface.
 *
 * The `satisfies` clause makes this list and {@link FactionManifest} check each
 * other: adding a field to the interface without adding it here fails to
 * compile at `SURFACE_KEYS_ARE_EXHAUSTIVE` below, and vice versa. That is the
 * guard that stops a new dispatcher from quietly bypassing the manifest.
 */
export const SURFACE_KEYS = [
  'taskCard',
  'praxisCard',
  'factionSelectCard',
  'avatar',
  'backdrop',
  'sigil',
  'comment',
  'feedFrame',
  'vote',
  'scoreStamp',
  'metataskSeal',
  'taskDetail',
  'praxisDetail',
  'editPraxis',
  'factionHero',
  'factionBody',
  'profileBody',
  'createCharacter',
  'duelSeal',
  'mobileFieldDesk',
] as const satisfies readonly FactionSurface[]

/**
 * Compile-time proof that SURFACE_KEYS misses nothing. If you add a surface to
 * {@link FactionManifest} and forget SURFACE_KEYS, this line stops the build.
 */
type MissingSurfaceKeys = Exclude<FactionSurface, (typeof SURFACE_KEYS)[number]>
export const SURFACE_KEYS_ARE_EXHAUSTIVE: MissingSurfaceKeys[] = []
