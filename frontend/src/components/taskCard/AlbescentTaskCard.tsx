import type { CardProps } from "./TaskCard";
import DefaultTaskCard from "./DefaultTaskCard";
import { useGroundIsBusy } from "../backdrop/BackdropContext";

/**
 * Albescent — the task card's tell (#1023, ADR-0048). The SECOND Albescent
 * surface to unfreeze, and built to the same rule as the first (the praxis
 * card): this is NOT a from-scratch skin. It is the exact spectrum
 * {@link DefaultTaskCard} an unaffiliated player sees, with two flourishes
 * washed over it — the rainbow edge comes alive and drifts, and an aurora blooms
 * and breathes under the vellum.
 *
 * The design says the same thing the ADR does. Its palette IS the na card's, its
 * layout IS the na card's slot for slot, and every delta is motion: a drifting
 * spectrum edge, an aurora, a turning prism ring. A secret society hiding in
 * plain sight is revealed by a shimmer, never by a colour — a repaint in
 * Albescent's own hues would put it back in the spectrum and un-hide it, and a
 * per-faction WORD would do the same (WORLD_ZERO_STYLE §3), which is why the
 * card keeps na's copy down to the sign-up call. Every other Albescent surface
 * stays frozen on Default until its own design lands (ADR-0046 / ADR-0048).
 *
 * THE GROUND IS NO LONGER AN OVERLAY (#2499, epic #2496 ruling 2).
 * `.alb-task-aurora` was a blended span over the sheet; the prism sweep is a
 * LAYER OF THE CARD'S OWN BACKGROUND, reached by overriding
 * `--faction-default-card-sheet` under `.alb-prism`. `DefaultTaskCard` reads
 * that token and knows nothing about Albescent, which is the whole point of the
 * seam. The edge stays an overlay: a gradient cannot be a `border-color`, so a
 * masked ring is still the only way to make Default's own rainbow border move.
 * index.css owns both, their dark halves, their reduced-motion frame and their
 * gate — a component may not inject a stylesheet (#911).
 *
 * There is deliberately nothing between this and Default: it takes
 * {@link CardProps} and forwards it whole, so a change to the contract or to the
 * na card reaches Albescent with no edit here. That is the property a
 * hand-copied skin could never keep.
 *
 * THE ALTERNATION LAW SURVIVES THE CHANGE OF MECHANISM (#2397, epic #2195). "One
 * ornament per faction; a card on an ornamented ground goes plain" — the card
 * used to satisfy it by not MOUNTING the aurora span. A background layer has
 * nothing to unmount, so the card now drops the CLASS and the na sheet stands
 * underneath, unchanged. Same predicate, same law, and the plain card is still
 * byte-for-byte the unaffiliated one plus an edge. That edge is CHROME and never
 * branches — it is `.spectrum-frame`'s shared ring since #2407, worn by eight
 * mounts, seven of which are not this card's to decide — so an Albescent card on
 * the Everymen wall is still revealed by motion, which is what ADR-0048
 * requires; only the ground yields.
 */
export default function AlbescentTaskCard(props: CardProps) {
  const groundIsBusy = useGroundIsBusy();
  return (
    <div
      /* Two classes, two jobs.
         `alb-task` repoints `--faction-default-cta-rule-opacity` for everything
         inside it, so the spectrum rule above the sign-up lands at 0.45 here and
         0.6 on the unaffiliated sheet (#2030) — a flourish of the same kind as
         the light, since the difference is a shimmer and never a colour. It is
         unconditional: it is not a ground texture.
         `alb-prism` is the ground, and it is the one the alternation takes. */
      className={groundIsBusy ? "alb-task alb-moves" : "alb-task alb-moves alb-prism"}
      style={{ position: "relative", width: "fit-content", maxWidth: "100%" }}
    >
      <DefaultTaskCard {...props} />
      <span aria-hidden="true" className="alb-task-edge" />
    </div>
  );
}
