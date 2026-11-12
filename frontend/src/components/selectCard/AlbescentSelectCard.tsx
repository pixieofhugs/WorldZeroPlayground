import type { FactionSelectCardProps } from "./FactionSelectCard";
import DefaultSelectCard from "./DefaultSelectCard";
import { ALBESCENT_FACTION_SLUG, isFactionRedacted } from "../../utils/factions";

/**
 * Albescent's directory tile: `DefaultSelectCard` in a wrapper (#2632; this
 * deliberately deletes #1891 ruling 1 — the tile wears na's face). The two
 * classes are the only delta: `.alb-prism` grounds the sheet triple as on the
 * other Albescent cards (#2550); `.alb-moves` walks the na hairline.
 *
 * Words and door share one predicate inside `DefaultSelectCard` (#2409,
 * ADR-0082); the read below is the same predicate, never a second answer. The
 * prism waits for the reveal (#2496 ruling 8): `[REDACTED]` is painted in its
 * own ground's colour, so that ground must stay flat. The mark comes from
 * `FactionSigil` (ADR-0083 §1).
 */
export default function AlbescentSelectCard(
  props: Omit<FactionSelectCardProps, "faction">,
) {
  const redacted = isFactionRedacted(ALBESCENT_FACTION_SLUG);
  return (
    <div
      className={redacted ? "alb-moves" : "alb-moves alb-prism"}
      /* Geometry only: the flex item both directories lay out (#732, #2579),
         and a growing column so the frame inherits the row's height (#3139). */
      style={{ width: "100%", maxWidth: 360, display: "flex", flexDirection: "column", flexGrow: 1 }}
    >
      <DefaultSelectCard {...props} slug={ALBESCENT_FACTION_SLUG} />
    </div>
  );
}
