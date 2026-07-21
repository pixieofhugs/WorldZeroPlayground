import { useTranslation } from "react-i18next";
import { AdminOverlay } from "../shared";
import { PraxisBody, frameBase, type ArchetypeProps } from "./shared";

/**
 * The Ephemerists — THE CODEX (#841). A vellum folio bound in gold: a dotted
 * leaf, a gold hairline frame, engraved caps for the entry, and the score box
 * with its rubric set into the right column.
 *
 * What came off this card, and why — all three were inventions with no
 * counterpart in the vendored prototype, and together they made the folio read
 * as a filing header stapled to a texture:
 *
 *  • the dedicated RUNNING-HEAD BAR (a lapis-ruled strip across the frame). The
 *    design's running head is an EYEBROW LINE inside the left column — the
 *    first line of the entry, which stops at the score box instead of running
 *    under it. It is passed to `PraxisBody` as `eyebrow`;
 *  • the SIGIL that sat in that bar;
 *  • the `Foxing` texture layer. The leaf's own dotted ground is the texture.
 *
 * The frame's border was a neutral `color-mix` of the ink. The design binds the
 * folio in GOLD (`--eph-frame`), which is the difference between a codex and a
 * beige card with a border.
 */
export function EphemeristsPraxisCard({ praxis, adminProps, showCrown }: ArchetypeProps) {
  const { t } = useTranslation("praxis");
  return (
    <div
      style={{
        position: "relative",
        ...frameBase,
        borderRadius: 8, // codex folio
        overflow: "hidden",
        background: "var(--eph-vellum)",
        color: "var(--eph-vellum-text)",
        border: "1px solid var(--eph-frame)",
        fontFamily: "var(--eph-serif)",
        // The leaf's own ground — a fine dotted tooth, the design's texture.
        backgroundImage: "radial-gradient(rgba(42, 29, 18, 0.03) 1px, transparent 1px)",
        backgroundSize: "6px 6px",
        boxShadow: "0 3px 14px rgba(42, 29, 18, 0.14)",
        padding: "var(--space-xl) var(--space-xl) var(--space-lg)",
        transition: "background 150ms, color 150ms",
      }}
    >
      <AdminOverlay {...adminProps} />
      <PraxisBody
        praxis={praxis}
        tint="var(--eph-rubric)"
        muted="var(--eph-muted)"
        paper="var(--eph-vellum)"
        titleStyle={{ fontFamily: "var(--eph-display)", color: "var(--eph-vellum-text)" }}
        showCrown={showCrown}
        eyebrow={
          <div
            className="eyebrow"
            style={{
              fontFamily: "var(--eph-display)",
              letterSpacing: "0.2em",
              color: "var(--faction-ephemerists)",
              marginBottom: "var(--space-xs)",
            }}
          >
            {t("card.masthead.ephemerists")}
          </div>
        }
      />
    </div>
  );
}

export default EphemeristsPraxisCard;
