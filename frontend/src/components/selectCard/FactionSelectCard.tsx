// Faction display faces (#2079): `pages/Factions.tsx` imports this directly,
// with no archetype dispatch to fetch the sheet.
import "../../factionFaces";
import { resolveVariant } from "../../utils/factionDispatch";
import { hasOwnKey } from "../../utils/hasOwnKey";
import { surfaceMap } from "../../factions";

/**
 * FactionSelectCard — the dispatcher for the faction-directory tile (#2329).
 * Each faction's tile lives in its own file; `surfaceMap("factionSelectCard")`
 * is the only list (tiles are not all dark: Coven pink, UA cream).
 *
 * Every tile: a fluid box to a 360×300 ceiling (#732) and the seven slots of
 * `selectCardBlocks.tsx` (#3130), held by
 * `everySelectTileKeepsTheSevenSlots.test.tsx`. Payload is
 * { state, members?, onVisit }; copy is component-owned. The CTA visits the
 * faction page, which owns joining. Unregistered slugs get `DefaultSelectCard`.
 */

export type SelectState = "locked" | "eligible" | "member";

export interface FactionSelectCardProps {
  /** Faction slug (raw slug wins; legacy slugs fall back via LEGACY_SLUG). */
  faction: string;
  /** Viewer's relationship to the faction — drives the status line. */
  state?: SelectState;
  /** Member count (faction-specific label); omitted when unknown. */
  members?: number;
  /** Visit-faction handler (the per-faction "visit" CTA). */
  onVisit?: () => void;
}

// Retired slugs → live archetype; a raw registered slug wins first.
const LEGACY_SLUG: Record<string, string> = {
  gestalt: "coven",
  journeymen: "ephemerists",
};

export default function FactionSelectCard({ faction, ...rest }: FactionSelectCardProps) {
  const cards = surfaceMap("factionSelectCard");
  // Own-property-only on both tables (#1821).
  const key =
    !hasOwnKey(cards, faction) && hasOwnKey(LEGACY_SLUG, faction)
      ? LEGACY_SLUG[faction]
      : faction;
  // Unregistered keys land on the `na` row, `DefaultSelectCard` (#2530, #796).
  const Card = resolveVariant(cards, key);
  return <Card {...rest} />;
}
