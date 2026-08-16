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
 */
export function AlbescentPraxisCard(props: ArchetypeProps) {
  return (
    <div className="alb-praxis-card" style={{ ...frameBase, borderRadius: 10, /* inherits the Default sheet */ position: "relative", overflow: "hidden" }}>
      <DefaultPraxisCard {...props} />
      <span aria-hidden className="alb-rainbow" />
      <AlbescentSparks />
    </div>
  );
}

export default AlbescentPraxisCard;
