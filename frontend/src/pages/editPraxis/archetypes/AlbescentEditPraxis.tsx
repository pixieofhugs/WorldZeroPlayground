/**
 * Albescent composer (#2505): renders {@link DefaultEditPraxis} whole; the
 * wrapper div is a cascade handle that paints nothing (ADR-0083 §1).
 *
 * No wash: na's quiet tier already reads 3.67:1 light / 3.02:1 dark on the
 * aurora composite (#2485), so any second layer spends contrast it lacks.
 *
 * No ring either (#2553): na's 3px spectrum sheet frame is the sole carrier.
 * A ring can't ride that frame here because `ComposerSheet`'s `overflow: clip`
 * (#1028) clips descendants to the padding box.
 *
 * ponytail: so the carrier is STATIC, unlike the task card's (ADR-0083 §3a).
 * Upgrade: a `frame` slot on `ComposerSheet` rendering the ring as a sibling
 * inside the `maxWidth` column, where `inset: 0` covers na's frame.
 *
 * No Albescent colour or copy, which would un-hide the society (ADR-0083 §1,
 * ADR-0027). One responsive component (ADR-0065 §2).
 */
import DefaultEditPraxis from "./DefaultEditPraxis";
import { type EditPraxisState } from "../useEditPraxis";

export default function AlbescentEditPraxis({ state }: { state: EditPraxisState }) {
  return (
    <div className="alb-composer">
      <DefaultEditPraxis state={state} />
    </div>
  );
}
