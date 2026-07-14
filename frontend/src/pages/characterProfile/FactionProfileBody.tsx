/**
 * Per-faction player-profile body dispatch (#459, ADR-0033).
 *
 * The player profile renders ONE faction-agnostic contract; the skin is
 * derived client-side from `character.faction_slug`, never stored. This is
 * the single seam where a faction's bespoke profile skin plugs in — mirrors
 * FACTION_FEED_FRAMES / CARD_COMPONENTS / PRAXIS_CARD_BY_SLUG.
 *
 * Every profile lays out the same locked section spine (§player-profile
 * contract): ① identity + progression (shared CredentialCard as header),
 * ③ badges (hidden when empty), ⑤ praxis (faction PraxisCard, FDL laurel on
 * the top entry) — plus the two kept features: proposed tasks (faction
 * TaskCard) and friend/foe (faction-skinned, folded into the identity area).
 *
 * The default / unaffiliated skin is fully built; register a faction's row
 * below and its players adopt the bespoke skin with no other change (#460):
 *
 *   ua:          UaProfileBody,
 *   wow:         WowProfileBody,
 *   snide:       SnideProfileBody,
 *   ephemerists: EphemeristsProfileBody,
 *   singularity: SingularityProfileBody,
 *   everymen:    EverymenProfileBody,
 *   albescent:   AlbescentProfileBody,
 */
import type { ComponentType, ReactNode } from 'react'

import type { CharacterOut } from '../../api/auth'
import type { PraxisCardOut } from '../../api/praxis'
import type { TaskOut } from '../../api/tasks'
import { pickVariant } from '../../utils/factionDispatch'
import AlbescentProfileBody from './archetypes/AlbescentProfileBody'
import DefaultProfileBody from './archetypes/DefaultProfileBody'
import EphemeristsProfileBody from './archetypes/EphemeristsProfileBody'
import EverymenProfileBody from './archetypes/EverymenProfileBody'
import SingularityProfileBody from './archetypes/SingularityProfileBody'
import SnideProfileBody from './archetypes/SnideProfileBody'
import UaProfileBody from './archetypes/UaProfileBody'
import WowProfileBody from './archetypes/WowProfileBody'

export interface ProfileProgression {
  /** The level the current score is climbing toward (capped at max level). */
  nextLevel: number
  /** Absolute score where the current level began. */
  currentThreshold: number
  /** Absolute score where nextLevel begins. */
  nextThreshold: number
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
}

/** Per-faction profile skins (#460). Each renders the SAME locked section spine
 *  as DefaultProfileBody (via ProfileSkin) in the faction's costume; the default
 *  spectrum-band skin remains the fallback for na / unaffiliated / unknown.
 *  The explicit `albescent` entry beats the albescent→ua alias in pickVariant,
 *  so it renders its own colorless skin immediately. */
const FACTION_PROFILE_BODIES: Record<string, ComponentType<ProfileBodyProps>> = {
  ua: UaProfileBody,
  wow: WowProfileBody,
  snide: SnideProfileBody,
  ephemerists: EphemeristsProfileBody,
  singularity: SingularityProfileBody,
  everymen: EverymenProfileBody,
  albescent: AlbescentProfileBody,
}

export default function FactionProfileBody(props: ProfileBodyProps) {
  const Body = pickVariant(
    FACTION_PROFILE_BODIES,
    props.character.faction_slug,
    DefaultProfileBody,
  )
  return <Body {...props} />
}

export { FACTION_PROFILE_BODIES }
