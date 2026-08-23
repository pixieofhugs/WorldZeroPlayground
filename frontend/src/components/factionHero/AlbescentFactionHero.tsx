import type { FactionHeroProps } from "../../pages/FactionDetail";
import DefaultFactionHero from "./DefaultFactionHero";

/**
 * Albescent — the FACTION PAGE's frontispiece (#2504, epic #2496, ADR-0048).
 *
 * A WRAPPER, like the eight before it. It renders {@link DefaultFactionHero}
 * whole — the same plate, the same five slots, the same words — and adds one
 * class. Strip `.alb-faction-hero` and the two heroes are byte-identical.
 *
 * THE MARK IS NOT THIS FILE'S. `FactionSigil` resolves the labyrinth from the
 * slug the page passes, so the ornament here dresses a mark it never names, and
 * the na hero on a future unaffiliated page will spin nothing at all.
 *
 * WHAT THE CLASS BUYS, all of it in index.css and motion.ornament.css:
 *   the prism sheet — a token override, per epic ruling 2, so the na plate
 *                     repaints itself rather than being selector-surgeried;
 *   the labyrinth turns — `alb-detail-spin`, the repo's cheap idiom: a rotate on
 *                     a static mark, not a walked gradient parameter;
 *   the bloom, in DARK ONLY — epic ruling 9. Light washes the hero and nothing
 *                     else; dark carries it on to the plates and the cards. That
 *                     asymmetry is measured and ruled, and it is not a bug.
 */
export default function AlbescentFactionHero(props: FactionHeroProps) {
  return (
    <div className="alb-faction-hero">
      <DefaultFactionHero {...props} />
    </div>
  );
}
