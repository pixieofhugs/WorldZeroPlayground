import type { ComponentType } from 'react'
import type { TaskOut } from '../../../api/tasks'
import { pickVariant } from '../../../utils/factionDispatch'
import DefaultMobileTaskCard from './cards/DefaultMobileTaskCard'
import UaMobileTaskCard from './cards/UaMobileTaskCard'
import WowMobileTaskCard from './cards/WowMobileTaskCard'
import SnideMobileTaskCard from './cards/SnideMobileTaskCard'
import EverymenMobileTaskCard from './cards/EverymenMobileTaskCard'
import SingularityMobileTaskCard from './cards/SingularityMobileTaskCard'
import EphemeristsMobileTaskCard from './cards/EphemeristsMobileTaskCard'
import AlbescentMobileTaskCard from './cards/AlbescentMobileTaskCard'

type MobileTaskCardProps = { task: TaskOut; points: number }

/**
 * Per-item MOBILE task-card dispatch (#565). Each card in the mobile browse feed
 * picks its own skin from its data item's faction slug — mirroring the desktop
 * `TaskCard` per-item dispatch — so a mixed feed shows every faction's own card
 * archetype side by side instead of theming the whole page to one faction.
 * Unregistered / factionless slugs fall through to the Default mobile card.
 */
export const MOBILE_TASK_CARD_BY_SLUG: Record<string, ComponentType<MobileTaskCardProps>> = {
  ua: UaMobileTaskCard,
  wow: WowMobileTaskCard,
  snide: SnideMobileTaskCard,
  everymen: EverymenMobileTaskCard,
  singularity: SingularityMobileTaskCard,
  ephemerists: EphemeristsMobileTaskCard,
  albescent: AlbescentMobileTaskCard,
}

export default function MobileTaskCard({ task, points }: MobileTaskCardProps) {
  const Card = pickVariant(MOBILE_TASK_CARD_BY_SLUG, task.primary_faction_slug, DefaultMobileTaskCard)
  return <Card task={task} points={points} />
}
