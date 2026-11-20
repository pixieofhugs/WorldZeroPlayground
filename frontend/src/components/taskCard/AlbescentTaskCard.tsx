import type { CardProps } from "./TaskCard";
import DefaultTaskCard from "./DefaultTaskCard";
import { useGroundIsBusy } from "../backdrop/BackdropContext";

/**
 * Albescent — the task card's tell (#1023, ADR-0048): exactly the na
 * {@link DefaultTaskCard}, props forwarded whole, plus motion — a drifting edge
 * and a prism ground. Revealed by a shimmer, never a colour or a word (#783,
 * WORLD_ZERO_STYLE §3).
 *
 * The prism is a layer of the card's own background (`.alb-prism` overrides
 * `--faction-default-card-sheet`, #2499); the edge stays an overlay since a
 * gradient can't be a `border-color`. index.css owns both (#911). On a busy
 * ground (#2397) only the prism class drops; the edge is chrome and stays.
 */
export default function AlbescentTaskCard(props: CardProps) {
  const groundIsBusy = useGroundIsBusy();
  return (
    <div
      /* `alb-task` repoints the CTA rule's opacity (unconditional, #2030);
         `alb-prism` is the ground, the one the alternation drops. */
      className={groundIsBusy ? "alb-task alb-moves task-fit-card" : "alb-task alb-moves task-fit-card alb-prism"}
    >
      <DefaultTaskCard {...props} />
      <span aria-hidden="true" className="alb-task-edge" />
    </div>
  );
}
