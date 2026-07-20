import DefaultPraxisCard from "./DefaultPraxisCard";
import { frameBase, type ArchetypeProps } from "./shared";

/**
 * Albescent — the secret-society tell (#821, ADR-0048). NOT a from-scratch skin:
 * it is the exact spectrum {@link DefaultPraxisCard} an unaffiliated player sees,
 * with a slow rainbow DRIFT (`.alb-rainbow`) washed over the whole sheet — the
 * one flourish that reveals the society to someone already looking. A repaint in
 * Albescent's own colours would put it back in the spectrum and un-hide it, so
 * this stays "NA + drift". The overlay is pointer-events:none and blends over the
 * card; reduced-motion stills the drift (the wash remains).
 */
export function AlbescentPraxisCard(props: ArchetypeProps) {
  return (
    <div style={{ ...frameBase, position: "relative", overflow: "hidden" }}>
      <DefaultPraxisCard {...props} />
      <span aria-hidden className="alb-rainbow" />
    </div>
  );
}

export default AlbescentPraxisCard;
