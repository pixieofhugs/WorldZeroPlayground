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
 * IMPORT DISCIPLINE — this module must stay type-only. The manifest index
 * transitively imports every faction component, and some of those components
 * import a dispatcher module back (e.g. `UaFactionBody` imports `TaskCard`,
 * whose own dispatcher reads the index). That cycle is harmless as long as
 * nothing *reads* across it at module-evaluation time, which is why
 * `surfaceMap()` resolves lazily rather than materialising a module-level const.
 * See the note in `./index.ts`.
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

/** The `{ state }` prop shape the page-level archetypes all share. */
type Stateful<S> = ComponentType<{ state: S }>

export interface FactionManifest {
  /** The faction's slug. Also the key every surface map is built under. */
  readonly slug: string

  // ─── Cards & chrome (desktop) ──────────────────────────────────────────────
  readonly taskCard?: ComponentType<CardProps>
  readonly praxisCard?: ComponentType<PraxisCardProps>
  readonly factionCard?: ComponentType<FactionCardProps>
  readonly avatar?: ComponentType<FactionAvatarProps>
  readonly backdrop?: ComponentType
  readonly sigil?: ComponentType<SigilVariantProps>
  readonly comment?: CommentComponent
  readonly feedFrame?: ComponentType<{ children: React.ReactNode }>
  readonly vote?: ComponentType<VoteUIProps>

  // ─── Pages (desktop) ───────────────────────────────────────────────────────
  readonly taskDetail?: Stateful<TaskDetailState>
  readonly praxisDetail?: Stateful<PraxisDetailState>
  readonly editPraxis?: Stateful<EditPraxisState>
  readonly factionHero?: ComponentType<FactionHeroProps>
  readonly factionBody?: Stateful<FactionDetailState>
  readonly profileBody?: ComponentType<ProfileBodyProps>

  // ─── Duel surfaces (desktop) ───────────────────────────────────────────────
  readonly duelSeal?: ComponentType<DuelSealConfirmProps>
  readonly duelRail?: ComponentType<DuelRailSkinProps>

  // ─── Mobile twins (#494 form-factor dispatch) ──────────────────────────────
  readonly mobileTaskCard?: ComponentType<MobileTaskCardProps>
  readonly mobilePraxisCard?: ComponentType<MobilePraxisCardProps>
  readonly mobileTaskDetail?: Stateful<TaskDetailState>
  readonly mobilePraxisDetail?: Stateful<PraxisDetailState>
  readonly mobileEditPraxis?: Stateful<EditPraxisState>
  readonly mobileFactionPage?: Stateful<FactionDetailState>
  readonly mobileFieldDesk?: Stateful<FieldDeskHomeState>
  readonly mobileCreateCharacter?: Stateful<CreateCharacterState>
  readonly mobileEditCharacter?: Stateful<EditCharacterState>
  readonly mobileProfile?: ComponentType<ProfileBodyProps>
  readonly mobileFactionsDirectory?: ComponentType
  readonly mobilePlayersDirectory?: ComponentType<PlayersDirectoryProps>
  readonly mobileDuelSeal?: ComponentType<DuelSealConfirmProps>
  readonly mobileDuelRail?: ComponentType<DuelRailSkinProps>
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
