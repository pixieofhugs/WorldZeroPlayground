import DefaultPraxisCard from "./DefaultPraxisCard";
import { useGroundIsBusy } from "../../backdrop/BackdropContext";
import { frameBase, type ArchetypeProps } from "./shared";

/**
 * Albescent — the secret-society tell (#821, ADR-0048). NOT a from-scratch skin:
 * it is the exact spectrum {@link DefaultPraxisCard} an unaffiliated player sees,
 * with the light washed over it — the flourish that reveals the society to
 * someone already looking. A repaint in Albescent's own colours would put it back
 * in the spectrum and un-hide it, so this stays "na + light".
 *
 * #842 ADDED THREE TWINKLING ✦ AND #2555 TOOK THEM BACK OUT. They were "the
 * other half of the tell" for two years; the owner ruled the twinkle is not part
 * of the Albescent kit, and it came out rather than getting quieter. Nothing
 * replaces it: this card's whole delta over the unaffiliated one is now the prism
 * ground and the travelling edge below, which is what ADR-0083 says an Albescent
 * surface is — one ornament vocabulary shared with na, moving.
 *
 * #1646 narrows the light by one element: it stops at the proof photo, which is
 * the one thing here that is not the site's to tint. The class on this wrapper is
 * the scope index.css needs to raise `.user-media` above the ring for THIS skin
 * only — the media gallery is shared by all nine archetypes.
 *
 * ── #2499 (epic #2496) — THE OWNER'S LIVE REPORT, AND WHAT IT COST ──
 *
 * "The background and borders on the praxis and task cards are still different
 * from each other." They were, in both halves, and the two halves had different
 * owners.
 *
 * THE GROUND was Albescent's own. This card wore `.alb-rainbow` — a 190%-wide
 * rainbow tile rotated 24deg and walked 220px, which reads as STRIPES — while the
 * task card wore `.alb-task-aurora`, six blurred radials, which reads as CLOUD.
 * Two overlays, invented at two mounts, drawing the same idea differently. Both
 * are gone: `.alb-prism` sets `--faction-default-card-sheet` and every Albescent
 * surface reads the one value. `DefaultPraxisCard` composes that token through
 * `factionSpectrumSheet()`, so nothing in this file paints anything.
 *
 * THE BORDER was na's, and could not be fixed from here at all: this card had a
 * 1px cream hairline where the task card had a 3px spectrum frame. The owner
 * ruled the border in scope on 2026-08-23 and `DefaultPraxisCard` now wears the
 * task card's idiom, for every player. What follows for Albescent is that its
 * travelling ring had to grow with it — `.alb-praxis-card-edge` is the twin of
 * `.alb-task-edge`, 3px at full strength, where this card used to borrow the
 * RAIL's 1px ring at 0.6 through `.spectrum-frame` + `data-spectrum-drift`.
 * Both now travel on `alb-edge-travel`, so the two cards are the same object in
 * two sizes rather than two objects that happen to be near each other.
 *
 * THE ALTERNATION LAW NEEDED A NEW MECHANISM, not a new law (#2397, epic #2195).
 * One ornament per faction, worn on both cards, dropped on a patterned page
 * ground: "either burst, or plain" (owner, 2026-08-17). A span satisfied that by
 * not being mounted. A background layer has nothing to unmount, so the card drops
 * the CLASS instead and the na sheet stands. Strip `alb-prism` and what is left
 * is the unaffiliated card exactly — which is what "plain" has always meant here.
 *
 * WHAT DOES NOT BRANCH, because it is chrome: the travelling ring, the masthead
 * and the score box. The ring is now the ONLY thing carrying the tell on a
 * patterned ground — the sparks used to be named here as the second carrier, and
 * #2555 retired them. ADR-0048 reveals the society by motion and the ring moves,
 * so the alternation still takes the ground and never the tell.
 *
 * The radius is the token rather than the literal 10 it was typed as. Same
 * number, and now the one place it is written: `--faction-default-card-radius` is
 * the Default/Albescent rung, and the ring reads it back with
 * `border-radius: inherit`.
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
