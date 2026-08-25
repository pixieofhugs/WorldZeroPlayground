import type { CSSProperties } from "react";
import { factionRoleVars } from "../../../utils/factionRoles";
import { EverymenBand } from "../../cardMasthead/factionBands";
import { useGroundIsBusy } from "../../backdrop/BackdropContext";
import { AdminOverlay } from "../shared";
import { PraxisBody, frameBase, type ArchetypeProps } from "./shared";

/**
 * Everymen — THE BROADSHEET (#841). A union work report printed on ruled cream
 * newsprint: a full-width red masthead across the head of the sheet, a red
 * margin rule down the left, and the tally stamp + points roundel struck into
 * the right column.
 *
 * Three corrections to what #821/#586 left here, all from the vendored
 * prototype:
 *
 *  • the MASTHEAD was absent entirely — the loudest single thing the design
 *    gives this faction, and the reason the card reads as a newspaper rather
 *    than as a beige panel. What #841 put back was a hand-rolled bar that did
 *    not match the task card's; #2185 replaced it with the shared band, which
 *    is the same correction made once for both kits;
 *  • the frame's border was `--color-border`, the app's neutral chrome. On a
 *    broadsheet the rule around the sheet is part of the PRINTING, so it is the
 *    faction ink (`--everymen-frame`);
 *  • the torn-bottom `clipPath` had no design counterpart at all. It was
 *    invented, and it clipped the foot of every card it was on.
 *
 * The masthead is kept deliberately low and tightly tracked so it frames the
 * report rather than shouting over the headline — and since #2185 that setting
 * is the task card's, not a second one measured here.
 *
 * THE SHEET IS NO LONGER RULED (#2195/#2393). This card carried a 17/18px
 * ledger line at its own alpha, and the grill that opened the ornament epic
 * started at exactly that: why does the Everymen praxis card have ruled paper
 * when the task card has a sunburst? The answer the owner gave is that a
 * faction has ONE ornament and both its cards wear it, so the rule is gone and
 * the bill's burst is here instead — and where the burst is not worn, the sheet
 * is BARE, not ruled. The red margin rule below is not a texture; it is a
 * single left-edge line and it stays.
 */

/** The sheet, named once: it is both the frame's ground and the value
 *  `PraxisBody` needs to knock its own boxes back out of. */
const PAPER = "var(--ev-praxis-paper)";

/** The red margin rule down the sheet. Static (#586). */
const everymenMarginRule: CSSProperties = {
  position: "absolute",
  left: 22,
  top: 0,
  bottom: 0,
  width: 1,
  background: "color-mix(in srgb, var(--everymen-red) 28%, transparent)",
};

export function EverymenPraxisCard({ praxis, adminProps, showCrown }: ArchetypeProps) {
  const groundIsBusy = useGroundIsBusy();
  return (
    <div
      style={{
        ...frameBase,
        ...factionRoleVars("everymen", "ev-praxis"),
        borderRadius: 2, // broadsheet — near-square
        overflow: "hidden",
        background: PAPER,
        border: "1px solid var(--everymen-frame)",
        boxShadow: "0 3px 14px var(--color-cast-shadow-soft)",
        position: "relative",
        fontFamily: "var(--font-faction-typewriter)",
        color: "var(--ev-praxis-ink)",
        transition: "background 150ms, color 150ms",
      }}
    >
      {/* THE FACTION'S ONE ORNAMENT, and it alternates (#2195/#2393) — the same
          `.em-burst` the task card mounts, on the same terms: dropped entirely
          on a patterned page ground, and nothing else on the card branches. */}
      {!groundIsBusy && <div aria-hidden="true" className="em-burst" />}
      {/* THE MASTHEAD IS THE BILL'S OWN NOW (#2185).

          This card drew its own red bar — `--everymen-red`, `--font-accent` at
          15px, two flanking cogs and no name — while `EverymenTaskCard` drew
          `--faction-everymen-bill-mast` in Bebas at `--text-title` under a
          double rule. Two mastheads for one faction, which is exactly what
          `CardMasthead` was created to prevent. The band is mounted from
          `cardMasthead/factionBands` now, so there is one of them.

          THE COGS STAND DOWN, for the reason they did on the task card (#2029):
          they flanked the centre the wordmark now holds. The cog stays the
          bill's motif on the hero rule and the in-progress line. */}
      <EverymenBand />

      <div
        style={{
          position: "relative",
          padding: "var(--space-lg) var(--space-xl) var(--space-xl) var(--space-2xl)",
        }}
      >
        <div style={everymenMarginRule} />
        <AdminOverlay {...adminProps} />
        <PraxisBody
          praxis={praxis}
          tint="var(--ev-praxis-accent)"
          muted="var(--ev-praxis-quiet)"
          paper={PAPER}
          showCrown={showCrown}
          // Bebas Neue is Everymen's declared card font and, until #888, reached
          // task and faction cards but never a praxis card. The broadsheet's own
          // Special Elite stays on the reading matter.
          fonts={{
            display: "var(--ev-praxis-face)",
            body: "var(--font-faction-typewriter)",
          }}
        />
      </div>
    </div>
  );
}

export default EverymenPraxisCard;
