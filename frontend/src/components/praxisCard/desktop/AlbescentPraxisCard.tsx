import DefaultPraxisCard from "./DefaultPraxisCard";
import { AlbescentSparks } from "../shared";
import { frameBase, type ArchetypeProps } from "./shared";

/**
 * Albescent — the secret-society tell (#821, ADR-0048). NOT a from-scratch skin:
 * it is the exact spectrum {@link DefaultPraxisCard} an unaffiliated player sees,
 * with a slow rainbow DRIFT (`.alb-rainbow`) washed over the whole sheet — the
 * one flourish that reveals the society to someone already looking. A repaint in
 * Albescent's own colours would put it back in the spectrum and un-hide it, so
 * this stays "NA + drift". The overlay is pointer-events:none and blends over the
 * card; reduced-motion stills the drift (the wash remains).
 *
 * #842 added the other half of the tell: the design pairs the drift with three
 * faint gold sparks ({@link AlbescentSparks}), and only the drift had shipped.
 *
 * #1646 narrows "the whole sheet" by one element: the drift stops at the proof
 * photo, which is the one thing here that is not the site's to tint. The class
 * on this wrapper is the scope index.css needs to raise `.user-media` above
 * `.alb-rainbow` for THIS skin only — the media gallery is shared by all nine
 * archetypes. No layer moves; the photo simply paints last.
 *
 * #2404 adds the third: the FRAME drifts. The owner ruled the rainbow in the
 * borders of all Albescent things moves slowly, and a census found this the only
 * ordinary Albescent surface without a drifting spectrum edge — the task card,
 * the task detail, the praxis detail, the feed row and the profile header all
 * shipped one already. `.spectrum-frame` is the SHARED ring an unaffiliated rail
 * now wears too; `data-spectrum-drift` is the whole of the difference, and it
 * buys motion only (the rule that matches it is in the deferred motion sheet).
 * Still na plus a shimmer, never a colour — ADR-0048 holds.
 *
 * The radius is the token rather than the literal 10 it was typed as. Same
 * number, and now the one place it is written: `--faction-default-card-radius`
 * is the Default/Albescent rung, and the ring reads it back with
 * `border-radius: inherit`.
 */
export function AlbescentPraxisCard(props: ArchetypeProps) {
  return (
    <div
      className="alb-praxis-card spectrum-frame"
      data-spectrum-drift=""
      style={{ ...frameBase, borderRadius: "var(--faction-default-card-radius)", /* inherits the Default sheet */ position: "relative", overflow: "hidden" }}
    >
      <DefaultPraxisCard {...props} />
      <span aria-hidden className="alb-rainbow" />
      <AlbescentSparks />
    </div>
  );
}

export default AlbescentPraxisCard;
