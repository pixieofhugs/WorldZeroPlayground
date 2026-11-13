import DefaultPraxisCard from "./DefaultPraxisCard";
import { useGroundIsBusy } from "../../backdrop/BackdropContext";
import { frameBase, type ArchetypeProps } from "./shared";

/**
 * Albescent — the secret-society tell (#821, ADR-0048): {@link DefaultPraxisCard}
 * with light washed over it. Never a repaint in Albescent's own colours, which
 * would un-hide it.
 *
 * - The light stops at the proof photo (#1646); this wrapper class scopes the
 *   `.user-media` lift in index.css to this skin.
 * - Ground: `.alb-prism` sets `--faction-default-card-sheet`, shared with the
 *   task card (#2499); this file paints nothing.
 * - `.alb-praxis-card-edge` is the twin of `.alb-task-edge` (3px, `alb-edge-travel`).
 * - Busy page ground (#2397): drop the `alb-prism` class, leaving the plain na
 *   card. The travelling ring never drops; it carries the tell.
 * - Radius is the Default/Albescent token; the ring inherits it.
 */
export function AlbescentPraxisCard(props: ArchetypeProps) {
  const groundIsBusy = useGroundIsBusy();
  return (
    <div
      className={groundIsBusy ? "alb-praxis-card alb-moves" : "alb-praxis-card alb-moves alb-prism"}
      style={{ ...frameBase, borderRadius: "var(--faction-default-card-radius)", /* inherits the Default sheet */ position: "relative", overflow: "hidden" }}
    >
      <DefaultPraxisCard {...props} />
      <span aria-hidden className="alb-praxis-card-edge" />
    </div>
  );
}

export default AlbescentPraxisCard;
