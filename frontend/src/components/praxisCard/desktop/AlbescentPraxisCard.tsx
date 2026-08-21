import DefaultPraxisCard from "./DefaultPraxisCard";
import { AlbescentSparks } from "../shared";
import { useGroundIsBusy } from "../../backdrop/BackdropContext";
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
 *
 * #2397 (epic #2195) gives this card the kit's ORNAMENT and alternates it. The
 * law, owner 2026-08-17: one ornament per faction, worn on both cards, dropped
 * on a patterned page ground. Albescent's is the AURORA, which until now was
 * worn on the task card and not here — so the two cards showed a different
 * texture, which is the exact complaint the epic opened on.
 *
 * ONE DRAWING, TWO MOUNTS. `.alb-task-aurora` is reused rather than copied under
 * a praxis-shaped name: the epic's own supporting ruling is "one drawing per
 * faction, not one per surface", and a second class name would state a second
 * drawing. The `-task-` in it is historical — where it was first drawn, not what
 * it belongs to. It carries its own geometry (inset 22%, blurred past
 * recognition), so it needs nothing from this sheet but a positioned, clipping
 * parent, which this wrapper already is.
 *
 * THE DRIFT GOES WITH IT. `.alb-rainbow` is this card's other background
 * texture, so leaving it standing while the aurora comes off would be the
 * "substitute texture" the ruling forbids ("either burst, or plain"): the card
 * would still be two textures fighting the ground, just quieter ones.
 *
 * WHAT DOES NOT BRANCH, because it is chrome: the drifting `.spectrum-frame`
 * ring (shared with five other mounts since #2407), the masthead, the score box
 * — and the three `AlbescentSparks`. The sparks are three ✦ glyphs, not a
 * ground texture, and they are the half of the tell (#842) that keeps an
 * Albescent card on someone else's patterned profile from reading as a plain
 * unaffiliated card. ADR-0048 reveals the society by motion; the alternation
 * takes the texture, never the tell.
 */
export function AlbescentPraxisCard(props: ArchetypeProps) {
  const groundIsBusy = useGroundIsBusy();
  return (
    <div
      className="alb-praxis-card spectrum-frame"
      data-spectrum-drift=""
      style={{ ...frameBase, borderRadius: "var(--faction-default-card-radius)", /* inherits the Default sheet */ position: "relative", overflow: "hidden" }}
    >
      <DefaultPraxisCard {...props} />
      {!groundIsBusy && (
        <>
          <span aria-hidden className="alb-rainbow" />
          <span aria-hidden className="alb-task-aurora" />
        </>
      )}
      <AlbescentSparks />
    </div>
  );
}

export default AlbescentPraxisCard;
