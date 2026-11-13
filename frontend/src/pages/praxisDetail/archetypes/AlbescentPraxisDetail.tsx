import DefaultPraxisDetail from './DefaultPraxisDetail'
import type { PraxisDetailState } from '../usePraxisDetail'

/**
 * Albescent praxis detail (#1140): not a skin, but the exact
 * {@link DefaultPraxisDetail} with light washed over it, so shared-layout changes
 * reach it with no edit here. Albescent hides in plain sight (ADR-0027, ADR-0048):
 * no token block, no voiced copy (a per-faction word identifies like a hue), only
 * motion. `.alb-prism` grounds the sheet (#2499); the ring and edge go through the
 * `ornament` slot because the column is opaque, so they must sit inside it, on top.
 * index.css owns the classes and the reduced-motion rest frame (#911).
 */
export default function AlbescentPraxisDetail({ state }: { state: PraxisDetailState }) {
  return (
    <div className="alb-praxis alb-moves alb-prism">
      <DefaultPraxisDetail
        state={state}
        ornament={
          <>
            <span aria-hidden="true" className="alb-praxis-ring" />
            <span aria-hidden="true" className="alb-praxis-edge" />
          </>
        }
      />
    </div>
  )
}
