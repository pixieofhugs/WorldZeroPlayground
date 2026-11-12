/**
 * Albescent — the mobile field desk's tell (#2505, #2519). Not a skin: renders
 * {@link DefaultFieldDesk} whole plus one inert span. Mobile only (epic #2496
 * ruling 5: desktop has no faction dispatch).
 *
 * One carrier per object (#2519): a masked 3px travelling spectrum ring
 * around the identity card; `.alb-desk .spectrum-rule` hides the hairline.
 * It goes through the `identityOrnament` slot so it clips to the card.
 * Travel is `alb-edge-travel` behind the reduced-motion gate (#911, #1003).
 *
 * No Albescent colours or copy: that would un-hide the society (ADR-0048).
 */
import DefaultFieldDesk from './DefaultFieldDesk'
import type { FieldDeskHomeState } from '../useFieldDeskHome'

export default function AlbescentFieldDesk({ state }: { state: FieldDeskHomeState }) {
  return (
    <div className="alb-desk">
      <DefaultFieldDesk
        state={state}
        identityOrnament={<span aria-hidden="true" className="alb-desk-edge" />}
      />
    </div>
  )
}
