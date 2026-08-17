import { factionCssVar, factionName } from "../../utils/factions";

/**
 * Shared S.N.I.D.E. masthead — the acid "S.N.I.D.E." wordmark with a right-aligned
 * subtitle over an acid underline. Reused across the SNIDE card surfaces (task
 * card, faction byline, praxis card) so the dispatch header lives in one place.
 */
export default function SnideMasthead({
  /**
   * The right-aligned line beside the wordmark. Optional since #1909: the one
   * mount that passed it read `feed:factionCard.snide.subtitle` ("field
   * dispatch"), which the copy audit CUT — Snide was the only faction with a
   * subtitle on the card, and the surface is ruled generic.
   */
  subtitle,
  size = 12,
}: {
  subtitle?: string;
  size?: number;
}) {
  return (
    <div
      style={{
        position: "relative",
        display: "flex",
        justifyContent: "space-between",
        alignItems: "baseline",
        borderBottom: `2px solid ${factionCssVar("snide", "card-accent")}`,
        paddingBottom: "var(--space-xs)",
        marginBottom: "var(--space-sm)",
      }}
    >
      <span
        style={{
          fontFamily: "var(--faction-snide-font-cond)",
          fontSize: size,
          letterSpacing: "0.22em",
          color: factionCssVar("snide", "card-accent"),
        }}
      >
        {/* The wordmark IS the faction name (#1910): `feed:identity.snide.
            wordmark` held a second copy of "S.N.I.D.E." and is gone. */}
        {factionName("snide")}
      </span>
      {subtitle !== undefined && (
        <span
          style={{
            fontSize: "var(--text-md)",
            letterSpacing: "0.16em",
            textTransform: "uppercase",
            color: factionCssVar("snide", "card-muted"),
          }}
        >
          {subtitle}
        </span>
      )}
    </div>
  );
}
