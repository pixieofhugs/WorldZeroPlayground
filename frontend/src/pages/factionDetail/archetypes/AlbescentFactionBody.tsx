import type { FactionDetailState } from "../useFactionDetail";
import DefaultFactionBody from "./DefaultFactionBody";

/**
 * Albescent's faction-page body (#2504, ADR-0048): a wrapper around
 * {@link DefaultFactionBody} adding only the `.alb-faction-body` class (prism
 * ground in both cascades, #2550; selectors in index.css) and a 3px spectrum
 * ring via `plateOrnament`, so it clips to each plate's rounded box (#2519; see
 * `plateOrnament` for why only three plates). No copy or token of its own: a page
 * announcing itself as Albescent would un-hide the society (ADR-0027).
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
