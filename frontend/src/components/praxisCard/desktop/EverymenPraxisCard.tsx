import type { CSSProperties } from "react";
import { factionCssVar } from "../../../utils/factions";
import FactionMasthead from "../../cardMasthead/FactionMasthead";
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
 */

/** The red margin rule down the ruled sheet. Static (#586). */
const everymenMarginRule: CSSProperties = {
  position: "absolute",
  left: 22,
  top: 0,
  bottom: 0,
  width: 1,
  background: "color-mix(in srgb, var(--everymen-red) 28%, transparent)",
};

export function EverymenPraxisCard({ praxis, adminProps, showCrown }: ArchetypeProps) {
  return (
    <div
      style={{
        ...frameBase,
        borderRadius: 2, // broadsheet — near-square
        overflow: "hidden",
        background: factionCssVar("everymen", "card-bg"),
        border: "1px solid var(--everymen-frame)",
        boxShadow: "0 3px 14px var(--color-cast-shadow-soft)",
        position: "relative",
        fontFamily: "var(--font-faction-typewriter)",
        color: factionCssVar("everymen", "card-text"),
        // ornament (#1609): the BROADSHEET's ruled line, at its own 17/18px
        // pitch and its own 0.08. It is deliberately NOT
        // `--faction-everymen-dispatch-rule` (0.12, every 24px) — that token
        // names the dispatch SLIP's rule, and collapsing two drawings the
        // family keeps apart would be picking a winner (§6, #1654). Stays raw.
        backgroundImage:
          "repeating-linear-gradient(to bottom, transparent, transparent 17px, rgba(100,140,200,0.08) 17px, rgba(100,140,200,0.08) 18px)",
        transition: "background 150ms, color 150ms",
      }}
    >
      {/* THE MASTHEAD IS THE BILL'S OWN NOW (#2185).

          This card drew its own red bar — `--everymen-red`, `--font-accent` at
          15px, two flanking cogs and no name — while `EverymenTaskCard` drew
          `--faction-everymen-bill-mast` in Bebas at `--text-title` under a
          double rule. Two mastheads for one faction, which is exactly what
          `CardMasthead` was created to prevent. The band is mounted from
          `cardMasthead/FactionMasthead` now, so there is one of them.

          THE COGS STAND DOWN, for the reason they did on the task card (#2029):
          they flanked the centre the wordmark now holds. The cog stays the
          bill's motif on the hero rule and the in-progress line. */}
      <FactionMasthead slug="everymen" />

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
          tint={factionCssVar("everymen", "card-accent")}
          muted={factionCssVar("everymen", "card-muted")}
          paper={factionCssVar("everymen", "card-bg")}
          showCrown={showCrown}
          // Bebas Neue is Everymen's declared card font and, until #888, reached
          // task and faction cards but never a praxis card. The broadsheet's own
          // Special Elite stays on the reading matter.
          fonts={{
            display: "var(--faction-everymen-card-font)",
            body: "var(--font-faction-typewriter)",
          }}
        />
      </div>
    </div>
  );
}

export default EverymenPraxisCard;
