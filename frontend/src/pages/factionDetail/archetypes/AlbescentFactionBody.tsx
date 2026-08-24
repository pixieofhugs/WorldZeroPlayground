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
 * THE EDGE IS THE TELL, AND #2504 SHIPPED THE FAINTEST VERSION OF IT (#2519).
 * `.alb-plate-edge` joined the shared masked-ring list in index.css (#2407) and
 * declared nothing, so it took that rule's defaults — 1px at 0.6 — on a page
 * whose whole light-mode delta is that the borders talk. The design canvas draws
 * a 3px spectrum border at full strength on every plate and says why: *"the
 * prism WASH stays on the hero alone, so the borders sing against a flat cream
 * ground instead of a tinted one, and body copy keeps its contrast."* It is now
 * a 3px ring at opacity 1, in the one rule the task card, the praxis card, the
 * composer and the field desk share, so the five carriers cannot drift apart
 * again. The wash is untouched — epic ruling 9 still washes the hero alone by
 * day, and that flat ground is the point of the change, not a gap in it.
 *
 * IT MOUNTS ON THREE PLATES, NOT FIVE, and `plateOrnament`'s docstring carries
 * the reason: the two card-holding sections hold cards with edges of their own.
 * Stilled, or before the deferred sheet arrives, it is a still 3px spectrum
 * frame — the same picture, standing.
 *
 * No copy, no token of its own, no slot moved: a page that announced itself as
 * Albescent would un-hide the society (ADR-0027, #783).
 */
export default function AlbescentFactionBody({ state }: { state: FactionDetailState }) {
  return (
    <div className="alb-faction-body alb-moves">
      <DefaultFactionBody
        state={state}
        plateOrnament={<span aria-hidden="true" className="alb-plate-edge" />}
      />
    </div>
  );
}
