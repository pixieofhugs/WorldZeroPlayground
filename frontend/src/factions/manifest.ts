/**
 * Per-faction manifest: the surfaces a faction overrides (#782). Dispatchers
 * read it via `surfaceMap('<key>')`; none holds its own slug-keyed map.
 *
 * Override-only: an undeclared surface resolves to na's row. Exception:
 * `./default.ts` IS na's row and must claim every surface — nothing is behind
 * it, so an unclaimed na surface renders NOTHING.
 *
 * New faction: one module + one line in `./index.ts`. New surface: one field
 * here + one `SURFACE_KEYS` entry.
 *
 * THUNK NOTE — why every entry is `() => X`: dispatchers and archetypes import
 * each other (some archetypes live inside their dispatcher, e.g. the sigil
 * adapters in `FactionSigil.tsx`), so a plain `{ sigil: UaSigilAdapter }` can
 * read an uninitialised binding during evaluation and silently capture
 * `undefined` — the faction falls back to Default forever, invisible to `tsc`.
 * The arrow defers the read to render time, correct regardless of import order.
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
import type { DuelReaderState } from '../pages/duelReader/useDuelReader'
import type { InvitationLetterProps } from '../components/invitation/letterTypes'

/** Deferred component reference; see the thunk note above. */
type Lazy<T> = () => T

type Stateful<S> = ComponentType<{ state: S }>

export interface FactionManifest {
  /** Also the key every surface map is built under. */
  readonly slug: string

  // Cards & chrome
  /** One responsive component per faction (ADR-0056). */
  readonly taskCard?: Lazy<ComponentType<CardProps>>
  readonly praxisCard?: Lazy<ComponentType<PraxisCardProps>>
  readonly factionSelectCard?: Lazy<
    ComponentType<Omit<FactionSelectCardProps, 'faction'>>
  >
  readonly avatar?: Lazy<ComponentType<FactionAvatarProps>>
  readonly backdrop?: Lazy<ComponentType>
  readonly sigil?: Lazy<ComponentType<SigilVariantProps>>
  readonly comment?: Lazy<CommentComponent>
  /** The feed CHASSIS: owns kicker, timestamp and archive control. Read {@link FeedFrameProps} first. */
  readonly feedFrame?: Lazy<ComponentType<FeedFrameProps>>
  readonly vote?: Lazy<ComponentType<VoteUIProps>>
  /** Score stamp (ADR-0049); size-agnostic, serves cards and detail pages. */
  readonly scoreStamp?: Lazy<ComponentType<ScoreStampProps>>
  /** The issuing faction's seal on a metatasked praxis (#927); no phone branch needed. */
  readonly metataskSeal?: Lazy<ComponentType<SealSkinProps>>

  // Pages
  readonly taskDetail?: Lazy<Stateful<TaskDetailState>>
  readonly praxisDetail?: Lazy<Stateful<PraxisDetailState>>
  readonly editPraxis?: Lazy<Stateful<EditPraxisState>>
  readonly factionHero?: Lazy<ComponentType<FactionHeroProps>>
  readonly factionBody?: Lazy<Stateful<FactionDetailState>>
  readonly profileBody?: Lazy<ComponentType<ProfileBodyProps>>
  /**
   * Character creation (#2346), one responsive component. Dispatches on the
   * faction being PICKED (`state.factionSlug`), so the page reskins live; `''`
   * resolves to Default.
   */
  readonly createCharacter?: Lazy<Stateful<CreateCharacterState>>

  /**
   * Editing a character (#2537), one responsive component; the phone twin is
   * retired (`retiredSurfaces.test.ts`). Slug is the EDITED character's. Dress
   * derives from the create dress plus `editCharacterSlots.tsx`.
   */
  readonly editCharacter?: Lazy<Stateful<EditCharacterState>>

  /**
   * Proposing a task (#2538). Slug is the TARGET faction (the chips), with
   * `createCharacter`'s live-reskin semantics; ADR-0084 licenses the dress.
   * Dress derives from that faction's `createCharacter`. Login and
   * `canProposeTask` gates live in the DISPATCHER, not the archetypes.
   */
  readonly proposeTask?: Lazy<Stateful<ProposeTaskState>>

  // Duel surfaces
  // Duel seal: one responsive component (#1313); `DuelSealSheet` is the one
  // `useFormFactor()` reader.
  readonly duelSeal?: Lazy<ComponentType<DuelSealConfirmProps>>

  /**
   * Side-by-side duel reader (#1084, ADR-0092). The chassis
   * (`pages/duelReader/shared.tsx`) owns `useFormFactor()`. Slug is the TASK's
   * faction (both duellists share it); the chassis already spreads
   * `factionRoleVars`, so a row is extra dress.
   */
  readonly duelReader?: Lazy<Stateful<DuelReaderState>>

  // The duel CARD is not dispatched: it lives in praxis-detail
  // (`pages/praxisDetail/DuelCard.tsx`) and takes `style`/`heading`/`ink` (#1153).

  /**
   * Invitation letter body (#3294). `LetterSheet` owns `useFormFactor()`; the
   * popup keeps all behaviour (ADR-0090). Slug is the INVITING faction.
   */
  readonly invitationLetter?: Lazy<ComponentType<InvitationLetterProps>>

  // Mobile twins (#494). The field desk is the ONLY form-factor-dispatched
  // surface (ADR-0035, #1320: a different screen, not a narrow roster). Each
  // other collapse has its own ADR; a new mobile-only surface needs its own
  // record AND its first registration in the same commit.
  readonly mobileFieldDesk?: Lazy<Stateful<FieldDeskHomeState>>
}

export type FactionSurface = Exclude<keyof FactionManifest, 'slug'>

/** Exhaustive surface list; `satisfies` + `SURFACE_KEYS_ARE_EXHAUSTIVE` make it and the interface check each other. */
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
  'duelReader',
  'invitationLetter',
  'mobileFieldDesk',
] as const satisfies readonly FactionSurface[]

type MissingSurfaceKeys = Exclude<FactionSurface, (typeof SURFACE_KEYS)[number]>
export const SURFACE_KEYS_ARE_EXHAUSTIVE: MissingSurfaceKeys[] = []
