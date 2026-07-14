import i18n from "../../i18n";
import { factionCssVar } from "../../utils/factions";

/**
 * Shared S.N.I.D.E. masthead — the acid "S.N.I.D.E." wordmark with a right-aligned
 * subtitle over an acid underline. Reused across the SNIDE card surfaces (task
 * card, faction byline, praxis card) so the dispatch header lives in one place.
 */
export default function SnideMasthead({
  subtitle,
  size = 12,
}: {
  subtitle: string;
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
        paddingBottom: 4,
        marginBottom: 9,
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
        {i18n.t("feed:identity.snide.wordmark")}
      </span>
      <span
        style={{
          fontSize: 7,
          letterSpacing: "0.16em",
          textTransform: "uppercase",
          color: factionCssVar("snide", "card-muted"),
        }}
      >
        {subtitle}
      </span>
    </div>
  );
}
