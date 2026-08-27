/**
 * Per-faction manifest — the shape a faction fills in to claim its surfaces.
 *
 * Each *faction* owns one manifest declaring only the surfaces it overrides
 * (#782), and the dispatchers read from it — no dispatcher holds a slug-keyed
 * map of its own.
 *
 * The manifest is OVERRIDE-ONLY, WITH ONE EXCEPTION. Every field is optional; an
 * undeclared surface resolves to na's row for that surface, and a faction that
 * declares nothing renders correctly everywhere, including on surfaces that do
 * not exist yet.
 *
 * The exception is `./default.ts`, which IS na's row and must claim all twenty-two.
 * Nothing is behind it: a dispatcher reads `map[resolveSlug(map, slug)]` and
 * names no `Default*` of its own, so an unclaimed na surface renders NOTHING
 * rather than falling further back.
 *
 * Adding a faction: one new module here, one line in `./index.ts`. Adding a
 * SURFACE: one field here, one entry in `SURFACE_KEYS`, and the dispatcher calls
 * `surfaceMap('<key>')` instead of declaring its own map.
 *
 * WHY EVERY ENTRY IS A THUNK (`taskCard: () => UaTaskCard`)
 * ---------------------------------------------------------
 * Dispatcher modules and archetype modules already import each other: an
 * archetype pulls shared atoms out of its dispatcher (`CovenAvatar` imports
 * `BadgedAvatar` from `FactionAvatar`), and some archetypes are defined *inside*
 * their dispatcher outright (the sigil adapters in `FactionSigil.tsx`). Once a
 * dispatcher also reads the manifest index, that closes a module cycle.
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
import type { EditCharacterState } from '../pages/characterPaths/useEditCharacter'
import type { ProposeTaskState } from '../pages/proposeTask/useProposeTask'
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
   * it sizes itself for the phone via `useFormFactor()` internally. "desktop"
   * here names the section, not the form factor this one serves.
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
   * The faction's activity-feed CHASSIS. It owns the kicker band, the
   * timestamp and the archive control as well as its children, because every
   * design sheet puts all three on the chassis — read {@link FeedFrameProps}'s
   * docblock before writing a faction skin.
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
   * responsive component per faction: the sticker renders near-identical at
   * 340px, so it needs no phone branch at all.
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
   * profile bodies do.
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

  /**
   * Editing a character (#2537). ONE responsive component per faction, the same
   * discipline `createCharacter` landed with — each archetype reads
   * `useFormFactor()` itself. The phone-only twin this surface once had is
   * RETIRED and stays that way; `src/__tests__/retiredSurfaces.test.ts` holds
   * its name out of shipped source.
   *
   * The slug is the EDITED CHARACTER'S `faction_slug`, not the viewer's. They
   * are usually the same life and not always, and the page is about the one it
   * edits. `''` / `na` is an unaffiliated life and resolves to the Default (na)
   * archetype, which is also where an unregistered slug lands.
   *
   * Each faction's edit dress is DERIVED from its create dress (owner ruling,
   * 2026-08-27) plus the two slots a create page has no room for — the faction
   * row and the destructive action, drawn once in
   * `pages/characterPaths/editCharacterSlots.tsx` so all eight inherit them.
   */
  readonly editCharacter?: Lazy<Stateful<EditCharacterState>>

  /**
   * Proposing a task (#2538). ONE responsive component per faction, the same
   * discipline the two character paths landed with.
   *
   * THE SLUG IS THE TARGET FACTION — the one the task is being proposed FOR,
   * which the form asks for as a first-class field (#1824's chips) — and NOT the
   * viewer's. Owner ruling, 2026-08-24: "propose a task should have the faction
   * of the task being proposed". So the semantics are `createCharacter`'s,
   * deliberately and exactly, because a reader should not have to learn two: the
   * page reskins LIVE as the chips change, and returns to the Default (na)
   * archetype when the pick is cleared (`''`) or when "unaffiliated" (`na`) is
   * picked. An unregistered slug lands there too.
   *
   * ADR-0084's test is what licenses the dress at all — a page wears a faction
   * iff the page as a whole resolves to exactly one, and this one does. The
   * `Settings` exception (#2539) does not reach here: that page has a landed
   * neutral DESIGN, and this one has no sheet, which puts it back under the
   * standing rulings that a surface with no sheet gets DERIVED (2026-08-16)
   * rather than left generic.
   *
   * Each faction's propose dress is derived from that faction's
   * `createCharacter` page — same register, same geometry, same field furniture.
   *
   * `state.isLoggedIn` and `state.canProposeTask` are answered in the DISPATCHER,
   * above the archetype: an archetype only ever draws the happy-path form, or
   * its success screen. Eight copies of one gate is what that keeps out.
   */
  readonly proposeTask?: Lazy<Stateful<ProposeTaskState>>

  // ─── Duel surfaces ─────────────────────────────────────────────────────────
  // The duel SEAL is the only dispatched duel surface. ONE responsive component
  // per faction, both form factors (#1313): the skins hang their interior in
  // `components/duel/DuelSealSheet`, which is the single place the seal reads
  // `useFormFactor()`.
  //
  // The duel ITSELF is not dispatched. It is a card inside the praxis-detail
  // archetype (`pages/praxisDetail/DuelCard.tsx`), so a faction dresses it by
  // dressing its `praxisDetail`: the card takes `style`, `heading` and `ink`
  // (#1153), which is every part of it an archetype can reach.
  readonly duelSeal?: Lazy<ComponentType<DuelSealConfirmProps>>

  // ─── Mobile twins (#494 form-factor dispatch) ──────────────────────────────
  // The field desk is the ONLY form-factor-dispatched surface. Everywhere else
  // a faction ships one responsive component that reads `useFormFactor()`
  // itself, and each of those collapses is licensed by its own record
  // (ADR-0056, ADR-0058, ADR-0061, ADR-0065, ADR-0067, ADR-0078, #1313, #1319).
  // Every one of those licences is scoped to its surface and says in terms that
  // it licenses no further collapse: the next surface needs its own record, the
  // same way.
  //
  // The field desk is not the next one. ADR-0035 governs it, and #1320 says why:
  // it is a genuinely different screen rather than a narrow rendering of the
  // roster, so there is no one component for the two widths to share.
  //
  // Adding another mobile-only surface takes a record of its own AND its first
  // registration in the same commit. A slot no faction fills is not a seam; it
  // is a lookup that always returns the same answer.
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
  'editCharacter',
  'proposeTask',
  'duelSeal',
  'mobileFieldDesk',
] as const satisfies readonly FactionSurface[]

/**
 * Compile-time proof that SURFACE_KEYS misses nothing. If you add a surface to
 * {@link FactionManifest} and forget SURFACE_KEYS, this line stops the build.
 */
type MissingSurfaceKeys = Exclude<FactionSurface, (typeof SURFACE_KEYS)[number]>
export const SURFACE_KEYS_ARE_EXHAUSTIVE: MissingSurfaceKeys[] = []
