import type { CSSProperties } from "react";
import { useTranslation } from "react-i18next";
import { factionCssVar } from "../../../utils/factions";
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
 *    than as a beige panel;
 *  • the frame's border was `--color-border`, the app's neutral chrome. On a
 *    broadsheet the rule around the sheet is part of the PRINTING, so it is the
 *    faction ink (`--everymen-frame`);
 *  • the torn-bottom `clipPath` had no design counterpart at all. It was
 *    invented, and it clipped the foot of every card it was on.
 *
 * The masthead is kept deliberately low and tightly tracked so it frames the
 * report rather than shouting over the headline.
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
  const { t } = useTranslation("praxis");
  return (
    <div
      style={{
        ...frameBase,
        borderRadius: 2, // broadsheet — near-square
        overflow: "hidden",
        background: factionCssVar("everymen", "card-bg"),
        border: "1px solid var(--everymen-frame)",
        boxShadow: "0 3px 14px rgba(34, 26, 18, 0.16)",
        position: "relative",
        fontFamily: "var(--font-faction-typewriter)",
        color: factionCssVar("everymen", "card-text"),
        backgroundImage:
          "repeating-linear-gradient(to bottom, transparent, transparent 17px, rgba(100,140,200,0.08) 17px, rgba(100,140,200,0.08) 18px)",
        transition: "background 150ms, color 150ms",
      }}
    >
      {/* Masthead — the paper's name across the head of the sheet. */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          gap: "var(--space-md)",
          padding: "var(--space-xs) var(--space-lg)",
          background: "var(--everymen-red)",
          color: "var(--everymen-masthead-text)",
          fontFamily: "var(--font-accent)",
          // eslint-disable-next-line local/no-raw-style-values -- ornament: masthead lettering at the design's 15, kept low so it frames rather than shouts (§4a)
          fontSize: 15,
          letterSpacing: "0.3em",
          textTransform: "uppercase",
          boxShadow: "0 2px 0 rgba(34, 26, 18, 0.22)",
        }}
      >
        {/* Cogs flank the name — a drawn glyph, not an icon (§7). */}
        {/* eslint-disable-next-line local/no-raw-style-values -- ornament: flanking cog glyph, sized under the lettering (§4a) */}
        <span aria-hidden style={{ fontSize: 12, opacity: 0.85 }}>
          ⚙
        </span>
        <span>{t("card.masthead.everymen")}</span>
        {/* eslint-disable-next-line local/no-raw-style-values -- ornament: flanking cog glyph, sized under the lettering (§4a) */}
        <span aria-hidden style={{ fontSize: 12, opacity: 0.85 }}>
          ⚙
        </span>
      </div>

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
