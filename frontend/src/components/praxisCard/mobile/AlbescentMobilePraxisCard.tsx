import type { PraxisCardOut } from '../../../api/praxis'
import DefaultMobilePraxisCard from './DefaultMobilePraxisCard'
import { AlbescentSparks } from '../shared'

/**
 * Albescent MOBILE praxis card (#821, ADR-0048) — the mobile twin of the desktop
 * tell: the spectrum {@link DefaultMobilePraxisCard} an unaffiliated player sees,
 * with the slow rainbow DRIFT (`.alb-rainbow`) washed over the sheet. NOT a
 * from-scratch skin — a repaint would un-hide the society. Every other Albescent
 * surface still falls through to Default (#783). #842 added the sparks the
 * design pairs with the drift, which #821 left unbuilt.
 */
export default function AlbescentMobilePraxisCard({ praxis }: { praxis: PraxisCardOut }) {
  return (
    <div style={{ position: 'relative', overflow: 'hidden', borderRadius: 10 }}>
      <DefaultMobilePraxisCard praxis={praxis} />
      <span aria-hidden className="alb-rainbow" />
      <AlbescentSparks />
    </div>
  )
}
