import type { ComponentType } from 'react'
import type { PraxisCardOut } from '../../../api/praxis'
import { pickVariant } from '../../../utils/factionDispatch'
import UaMobilePraxisCard from './UaMobilePraxisCard'
import WowMobilePraxisCard from './WowMobilePraxisCard'
import SnideMobilePraxisCard from './SnideMobilePraxisCard'
import EphemeristsMobilePraxisCard from './EphemeristsMobilePraxisCard'
import SingularityMobilePraxisCard from './SingularityMobilePraxisCard'
import EverymenMobilePraxisCard from './EverymenMobilePraxisCard'
import AlbescentMobilePraxisCard from './AlbescentMobilePraxisCard'
import DefaultMobilePraxisCard from './DefaultMobilePraxisCard'

type MobilePraxisCardProps = { praxis: PraxisCardOut }

/**
 * Per-item MOBILE praxis-card dispatch (#573). Each proof in the mobile stream
 * picks its own bespoke faction skin from its item's `task_faction_slug` —
 * mirroring the desktop `PraxisCard` per-item dispatch — so a mixed feed shows
 * every faction's own card archetype instead of theming the whole page. One card
 * per faction renders solo, collab, AND duel: the roster and mode chip are the
 * only conditional slots. Unregistered / factionless slugs fall through to the
 * Default mobile card.
 */
export const MOBILE_PRAXIS_CARD_BY_SLUG: Record<string, ComponentType<MobilePraxisCardProps>> = {
  ua: UaMobilePraxisCard,
  wow: WowMobilePraxisCard,
  snide: SnideMobilePraxisCard,
  ephemerists: EphemeristsMobilePraxisCard,
  singularity: SingularityMobilePraxisCard,
  everymen: EverymenMobilePraxisCard,
  // First-class Albescent identity (#232 slice 1). The explicit entry beats the
  // albescent→ua alias in pickVariant, so it renders immediately.
  albescent: AlbescentMobilePraxisCard,
}

export default function MobilePraxisCard({ praxis }: MobilePraxisCardProps) {
  const Card = pickVariant(MOBILE_PRAXIS_CARD_BY_SLUG, praxis.task_faction_slug, DefaultMobilePraxisCard)
  return <Card praxis={praxis} />
}
