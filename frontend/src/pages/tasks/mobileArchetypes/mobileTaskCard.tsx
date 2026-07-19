import type { TaskOut } from '../../../api/tasks'
import { pickVariant } from '../../../utils/factionDispatch'
import { surfaceMap } from '../../../factions'
import DefaultMobileTaskCard from './cards/DefaultMobileTaskCard'

export type MobileTaskCardProps = { task: TaskOut; points: number }

export default function MobileTaskCard({ task, points }: MobileTaskCardProps) {
  const Card = pickVariant(surfaceMap('mobileTaskCard'), task.primary_faction_slug, DefaultMobileTaskCard)
  return <Card task={task} points={points} />
}
