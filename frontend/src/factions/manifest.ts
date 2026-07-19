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

import type { CardProps } from '../components/TaskCard'
import type { ArchetypeProps as PraxisCardProps } from '../components/PraxisCard'
import type { MobilePraxisCardProps } from '../components/praxisCard/mobile/MobilePraxisCard'
import type { MobileTaskCardProps } from '../pages/tasks/mobileArchetypes/mobileTaskCard'
import type { FactionAvatarProps } from '../components/avatar/FactionAvatar'
import type { SigilVariantProps } from '../components/cards/FactionSigil'
import type { CommentComponent } from '../components/comments/shared'
import type { VoteUIProps } from '../components/vote/VoteUI'
import type { FactionCardProps } from '../components/cards/FactionCard'
import type { DuelSealConfirmProps } from '../components/duel/DuelSealConfirm'
import type { DuelRailSkinProps } from '../pages/praxisDetail/DuelCrossLink'
import type { FactionHeroProps } from '../pages/FactionDetail'
import type { ProfileBodyProps } from '../pages/characterProfile/FactionProfileBody'
import type { PlayersDirectoryProps } from '../pages/players/mobileArchetypes/DefaultPlayers'
import type { TaskDetailState } from '../pages/taskDetail/useTaskDetail'
import type { PraxisDetailState } from '../pages/praxisDetail/usePraxisDetail'
import type { EditPraxisState } from '../pages/editPraxis/useEditPraxis'
import type { FactionDetailState } from '../pages/factionDetail/useFactionDetail'
import type { FieldDeskHomeState } from '../pages/fieldDesk/useFieldDeskHome'
import type { CreateCharacterState } from '../pages/characterPaths/useCreateCharacter'
import type { EditCharacterState } from '../pages/characterPaths/useEditCharacter'

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
  readonly taskCard?: Lazy<ComponentType<CardProps>>
  readonly praxisCard?: Lazy<ComponentType<PraxisCardProps>>
  readonly factionCard?: Lazy<ComponentType<FactionCardProps>>
  readonly avatar?: Lazy<ComponentType<FactionAvatarProps>>
  readonly backdrop?: Lazy<ComponentType>
  readonly sigil?: Lazy<ComponentType<SigilVariantProps>>
  readonly comment?: Lazy<CommentComponent>
  readonly feedFrame?: Lazy<ComponentType<{ children: React.ReactNode }>>
  readonly vote?: Lazy<ComponentType<VoteUIProps>>

  // ─── Pages (desktop) ───────────────────────────────────────────────────────
  readonly taskDetail?: Lazy<Stateful<TaskDetailState>>
  readonly praxisDetail?: Lazy<Stateful<PraxisDetailState>>
  readonly editPraxis?: Lazy<Stateful<EditPraxisState>>
  readonly factionHero?: Lazy<ComponentType<FactionHeroProps>>
  readonly factionBody?: Lazy<Stateful<FactionDetailState>>
  readonly profileBody?: Lazy<ComponentType<ProfileBodyProps>>

  // ─── Duel surfaces (desktop) ───────────────────────────────────────────────
  readonly duelSeal?: Lazy<ComponentType<DuelSealConfirmProps>>
  readonly duelRail?: Lazy<ComponentType<DuelRailSkinProps>>

  // ─── Mobile twins (#494 form-factor dispatch) ──────────────────────────────
  readonly mobileTaskCard?: Lazy<ComponentType<MobileTaskCardProps>>
  readonly mobilePraxisCard?: Lazy<ComponentType<MobilePraxisCardProps>>
  readonly mobileTaskDetail?: Lazy<Stateful<TaskDetailState>>
  readonly mobilePraxisDetail?: Lazy<Stateful<PraxisDetailState>>
  readonly mobileEditPraxis?: Lazy<Stateful<EditPraxisState>>
  readonly mobileFactionPage?: Lazy<Stateful<FactionDetailState>>
  readonly mobileFieldDesk?: Lazy<Stateful<FieldDeskHomeState>>
  readonly mobileCreateCharacter?: Lazy<Stateful<CreateCharacterState>>
  readonly mobileEditCharacter?: Lazy<Stateful<EditCharacterState>>
  readonly mobileProfile?: Lazy<ComponentType<ProfileBodyProps>>
  readonly mobileFactionsDirectory?: Lazy<ComponentType>
  readonly mobilePlayersDirectory?: Lazy<ComponentType<PlayersDirectoryProps>>
  readonly mobileDuelSeal?: Lazy<ComponentType<DuelSealConfirmProps>>
  readonly mobileDuelRail?: Lazy<ComponentType<DuelRailSkinProps>>
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
  'factionCard',
  'avatar',
  'backdrop',
  'sigil',
  'comment',
  'feedFrame',
  'vote',
  'taskDetail',
  'praxisDetail',
  'editPraxis',
  'factionHero',
  'factionBody',
  'profileBody',
  'duelSeal',
  'duelRail',
  'mobileTaskCard',
  'mobilePraxisCard',
  'mobileTaskDetail',
  'mobilePraxisDetail',
  'mobileEditPraxis',
  'mobileFactionPage',
  'mobileFieldDesk',
  'mobileCreateCharacter',
  'mobileEditCharacter',
  'mobileProfile',
  'mobileFactionsDirectory',
  'mobilePlayersDirectory',
  'mobileDuelSeal',
  'mobileDuelRail',
] as const satisfies readonly FactionSurface[]

/**
 * Compile-time proof that SURFACE_KEYS misses nothing. If you add a surface to
 * {@link FactionManifest} and forget SURFACE_KEYS, this line stops the build.
 */
type MissingSurfaceKeys = Exclude<FactionSurface, (typeof SURFACE_KEYS)[number]>
export const SURFACE_KEYS_ARE_EXHAUSTIVE: MissingSurfaceKeys[] = []
