/**
 * Per-faction player-profile body dispatch (#459, ADR-0033).
 *
 * The player profile renders ONE faction-agnostic contract; the skin is
 * derived client-side from `character.faction_slug`, never stored. This is
 * the single seam where a faction's bespoke profile skin plugs in — mirrors
 * the `feedFrame` / `taskCard` / `praxisCard` surfaces.
 *
 * Every profile lays out the same locked section spine (§player-profile
 * contract): ① identity + progression (shared CredentialCard as header),
 * ③ badges (hidden when empty), ⑤ praxis (faction PraxisCard, FDL laurel on
 * the top entry) — plus the two kept features: proposed tasks (faction
 * TaskCard) and friend/foe (faction-skinned, folded into the identity area).
 *
 * The default / unaffiliated skin is fully built; a faction adopts its bespoke
 * skin by declaring a `profileBody` row in its own manifest (#460, #782) —
 * `factions/coven.ts` names `CovenProfileBody`, and so on for ua, wow, snide,
 * ephemerists, singularity and everymen. No dispatcher is touched.
 *
 * Albescent claims no profile skin (#783): a member's profile is the default
 * one, because a profile is exactly where a secret society would give itself
 * away.
 */
import type { ReactNode } from 'react'

import type { CharacterOut } from '../../api/auth'
import type { PraxisCardOut } from '../../api/praxis'
import type { TaskOut } from '../../api/tasks'
import { pickVariant } from '../../utils/factionDispatch'
import { surfaceMap } from '../../factions'
import DefaultProfileBody from './archetypes/DefaultProfileBody'

/**
 * The identity panel's progression read-out, mapped by `CharacterProfile` from
 * the one shared `levelTrack` derivation (#2127). Every figure here is already
 * computed — a skin reads, it does not re-derive, because the last time two
 * places did the same arithmetic the two bars disagreed.
 */
export interface ProfileProgression {
  /**
   * The level the current score is climbing toward — `null` at the top of the
   * era's curve, exactly as `levelTrack` reports it (#2383). This used to be
   * `number`, which forced `CharacterProfile` to coerce the `null` into the
   * current level: a level-8 character was told the next level was 8, beside a
   * band of "0 / 0 pts". A skin MUST branch on this rather than re-coerce.
   */
  nextLevel: number | null
  /** Absolute score where the current level began. */
  currentThreshold: number
  /** Absolute score where nextLevel begins; `0` at the top of the curve. */
  nextThreshold: number
  /** The bar's numerator: points banked inside the current level. */
  pointsIntoLevel: number
  /** The bar's denominator: the width of the current level's band. */
  levelSpan: number
  /** 0–100 fill of the points-into-level bar. */
  progressPercent: number
}

export interface ProfileBodyProps {
  character: CharacterOut
  /** The character's own praxis, newest first (⑤). */
  submissions: PraxisCardOut[]
  /** Approved tasks this character authored (kept feature, #419). */
  proposedTasks: TaskOut[]
  /** Null until game config loads — skins then hide the progression bar. */
  progression: ProfileProgression | null
  /** Friend/foe controls (faction-skinned), folded into the identity header.
   *  Null for own profile / logged-out viewers — hide, don't disable. */
  identityActions: ReactNode
  /**
   * Take one of these tasks (#2188). Passed for any signed-in viewer and
   * `undefined` otherwise — the card decides claim-vs-reason itself off
   * `task.signup_reason`, and an anonymous viewer has no reason on the wire.
   *
   * A profile does not hide tasks the viewer has already started the way a
   * browse does (#2126: `created_by` is not a browse), so a card here may well
   * draw the `already_active_member` refusal. That is the card being honest,
   * not a bug.
   */
  onSignup?: (id: number) => void
}

export default function FactionProfileBody(props: ProfileBodyProps) {
  const Body = pickVariant(
    surfaceMap('profileBody'),
    props.character.faction_slug,
    DefaultProfileBody,
  )
  return <Body {...props} />
}

