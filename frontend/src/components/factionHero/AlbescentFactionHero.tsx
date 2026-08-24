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
 *   the labyrinth turns — `alb-spin`, the repo's cheap idiom: a rotate on
 *                     a static mark, not a walked gradient parameter.
 *
 * THE GROUND IS `.alb-prism`, THE CARDS' OWN (#2550). This class used to declare
 * a ground of its own — #2504's fainter cut of the same sweep — so the faction
 * page and a task card beside it were two drawings of one idea, and epic ruling
 * 9 made the light/dark asymmetry under it (hero alone by day, hero and body by
 * night) a looks decision. The owner reversed that: Albescent's backgrounds are
 * in general the task and praxis cards'. `.alb-faction-hero` now joins
 * `.alb-prism`'s selector lists in index.css, in both cascades and in the
 * reduced-motion rest frame, so there is one declaration and it cannot drift.
 */
export default function AlbescentFactionHero(props: FactionHeroProps) {
  return (
    <div className="alb-faction-hero">
      <DefaultFactionHero {...props} />
    </div>
  );
}
