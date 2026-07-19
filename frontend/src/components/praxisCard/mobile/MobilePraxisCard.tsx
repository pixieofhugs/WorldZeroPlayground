import type { } from 'react'
import type { PraxisCardOut } from '../../../api/praxis'
import { pickVariant } from '../../../utils/factionDispatch'
import { surfaceMap } from '../../../factions'
import { useVotedPraxis } from '../../vote/useVotedPraxis'
import DefaultMobilePraxisCard from './DefaultMobilePraxisCard'

export type MobilePraxisCardProps = { praxis: PraxisCardOut }

export default function MobilePraxisCard({ praxis }: MobilePraxisCardProps) {
  // Merge the viewer's own just-cast vote (#626) before the skin sees it, so the
  // score and the vote tally move together on one object.
  const voted = useVotedPraxis(praxis)
  const Card = pickVariant(surfaceMap('mobilePraxisCard'), voted.task_faction_slug, DefaultMobilePraxisCard)
  return <Card praxis={voted} />
}
