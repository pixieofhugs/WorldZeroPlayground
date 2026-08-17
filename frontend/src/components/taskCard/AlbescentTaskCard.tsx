import type { CardProps } from "./TaskCard";
import DefaultTaskCard from "./DefaultTaskCard";

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
 * Both flourishes are overlays: `.alb-task-edge` is a masked ring that lands on
 * Default's own rainbow border so the border appears to move, and
 * `.alb-task-aurora` blends over the sheet. index.css owns both, their dark
 * halves and their reduced-motion guard — a component may not inject a
 * stylesheet (#911).
 *
 * There is deliberately nothing between this and Default: it takes
 * {@link CardProps} and forwards it whole, so a change to the contract or to the
 * na card reaches Albescent with no edit here. That is the property a
 * hand-copied skin could never keep.
 */
export default function AlbescentTaskCard(props: CardProps) {
  return (
    <div
      /* The wrapper's one job besides holding the overlays: it repoints
         `--faction-default-cta-rule-opacity` for everything inside it, so the
         spectrum rule above the sign-up lands at 0.45 here and 0.6 on the
         unaffiliated sheet (#2030). A THIRD flourish of the same kind as the
         other two — the difference is a shimmer, never a colour — and it stays
         a cascade rather than a prop, which is what keeps the markup below
         byte-for-byte the na card's. */
      className="alb-task"
      style={{ position: "relative", width: "fit-content", maxWidth: "100%" }}
    >
      <DefaultTaskCard {...props} />
      <span aria-hidden="true" className="alb-task-aurora" />
      <span aria-hidden="true" className="alb-task-edge" />
    </div>
  );
}
