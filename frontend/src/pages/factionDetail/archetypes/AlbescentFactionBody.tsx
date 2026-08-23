import type { FactionDetailState } from "../useFactionDetail";
import DefaultFactionBody from "./DefaultFactionBody";

/**
 * Albescent — the FACTION PAGE's body (#2504, epic #2496, ADR-0048).
 *
 * A WRAPPER. It renders {@link DefaultFactionBody} whole — five plates, the same
 * copy, the join block, the burn — and adds two things and nothing else:
 *
 *   the wrapper class, which in DARK carries the bloom on to the plates and
 *     every card inside them, by overriding the na sheet token they all already
 *     read. In LIGHT it declares nothing: epic ruling 9 washes the hero alone by
 *     day, and that asymmetry is a measured decision rather than an oversight.
 *
 *   the plate ORNAMENT — a travelling spectrum ring, handed to Default's
 *     `plateOrnament` slot rather than layered as a sibling span, because the
 *     ring has to clip to each plate's own rounded box and a span wrapped around
 *     the whole body clips to the page. Same reason `AlbescentPraxisDetail` uses
 *     `ornament` and `AlbescentProfileBody` uses `identityOrnament`.
 *
 * `.alb-plate-edge` is a member of the shared masked-ring list in index.css
 * (#2407) and of the travelling-child list in motion.ornament.css (#2498) — it
 * declares no geometry of its own, because the list's defaults are already this
 * mount's. Stilled, or before the deferred sheet arrives, it is the same still
 * ring the rail wears.
 *
 * No copy, no token of its own, no slot moved: a page that announced itself as
 * Albescent would un-hide the society (ADR-0027, #783).
 */
export default function AlbescentFactionBody({ state }: { state: FactionDetailState }) {
  return (
    <div className="alb-faction-body">
      <DefaultFactionBody
        state={state}
        plateOrnament={<span aria-hidden="true" className="alb-plate-edge" />}
      />
    </div>
  );
}
