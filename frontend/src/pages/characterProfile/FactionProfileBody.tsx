/**
 * Player-profile body dispatch (#459, ADR-0033): skin derived from
 * `character.faction_slug` via each faction manifest's `profileBody` row (#782).
 * Locked spine: identity + progression, badges (hidden when empty), praxis, plus
 * proposed tasks and friend/foe. Albescent has no profile skin (#783): a profile
 * would give a secret society away.
 */
import type { ReactNode } from 'react'

import type { CharacterOut } from '../../api/auth'
import type { PraxisCardOut } from '../../api/praxis'
import type { TaskOut } from '../../api/tasks'
import { resolveVariant } from '../../utils/factionDispatch'
import { surfaceMap } from '../../factions'

/** Progression from the shared `levelTrack` (#2127). Skins read; never re-derive. */
export interface ProfileProgression {
  /** `null` at the top of the curve (#2383); branch on it, never coerce. */
  nextLevel: number | null
  /** Absolute score where the current level began. */
  currentThreshold: number
  /** Absolute score where nextLevel begins; `0` at the top of the curve. */
  nextThreshold: number
  pointsIntoLevel: number
  levelSpan: number
  /** 0–100. */
  progressPercent: number
}

export interface ProfileBodyProps {
  character: CharacterOut
  /** Newest first. */
  submissions: PraxisCardOut[]
  /** Approved tasks this character authored (#419). */
  proposedTasks: TaskOut[]
  /** Null until game config loads — skins then hide the progression bar. */
  progression: ProfileProgression | null
  /** Friend/foe controls. Null for own profile / logged out — hide, don't disable. */
  identityActions: ReactNode
  /**
   * Signed-in viewers only (#2188); the card picks claim-vs-reason from
   * `task.signup_reason`. A profile doesn't hide started tasks (#2126), so an
   * `already_active_member` refusal here is expected.
   */
  onSignup?: (id: number) => void
}

export default function FactionProfileBody(props: ProfileBodyProps) {
  const Body = resolveVariant(
    surfaceMap('profileBody'),
    props.character.faction_slug,
  )
  return <Body {...props} />
}

