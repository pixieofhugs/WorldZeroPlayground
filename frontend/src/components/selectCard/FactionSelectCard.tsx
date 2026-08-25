// Each select card is drawn in its faction's own display face, all six from the
// lazily-fetched faction sheet (#2079). `pages/Factions.tsx` imports this
// component directly rather than through `surfaceMap`, so the directory renders
// every card with no archetype dispatch to ask for the sheet.
import "../../factionFaces";
import { resolveVariant } from "../../utils/factionDispatch";
import { hasOwnKey } from "../../utils/hasOwnKey";
import { surfaceMap } from "../../factions";

/**
 * FactionSelectCard — the DISPATCHER for the faction-directory tile, and since
 * #2329 that is all it is. The compact card a player meets when browsing
 * "Choose your faction"; each faction's archetype now lives in its own file
 * beside this one, mirroring how `components/taskCard/` is laid out (epic
 * #2321). This file keeps the dispatcher, the shared types and `LEGACY_SLUG`.
 *
 * There is deliberately no inventory of the nine tiles here. The list this
 * docstring used to carry went stale every time a tile was redressed, and the
 * "the tiles are dark" premise it asserted alongside it was already false —
 * Coven's is pink, UA's is cream, Albescent's is white vellum — which is what
 * let two dark-only registers look correct on a surface that flips (#2321).
 * Each file states its own register; `surfaceMap("factionSelectCard")` is the
 * only authoritative list of who has one.
 *
 * The contract every tile honours: a UNIFORM 360×300 ceiling so the desktop grid
 * stays tidy, on a FLUID box rather than a fixed one — `width: 100%` up to a 360
 * max, `minHeight` rather than a hard height — so the same art survives a 375px
 * phone in the single-column mobile directory (#732). Desktop is unchanged;
 * DesktopFactions' flexWrap grid still hands each 360px.
 *
 * Faction-agnostic payload is just { state, members?, onVisit }; name /
 * archetype / blurb / status copy / CTA are component-owned, derived from the
 * faction slug. Joining is NOT on the tile — the CTA visits the faction's detail
 * page, which owns the Join block. Per-faction sigils are the shared canonical
 * *Sigil components (one dedicated file each) — never re-drawn inline.
 *
 * The neutral tile lives in its own file, `DefaultSelectCard.tsx`, next to the
 * rest of the na kit (`DefaultTaskCard`, `DefaultSigil`): it is the archetype
 * for the UNAFFILIATED state, and it is what the dispatcher falls back to.
 */

export type SelectState = "locked" | "eligible" | "member";

export interface FactionSelectCardProps {
  /** Faction slug (raw slug wins; legacy slugs fall back via LEGACY_SLUG). */
  faction: string;
  /** Viewer's relationship to the faction — drives the status line. */
  state?: SelectState;
  /** Member-count social proof (label is faction-specific). Omitted when
   *  unknown — the backend does not yet expose a per-faction count. */
  members?: number;
  /** Visit-faction handler (the per-faction "visit" CTA). */
  onVisit?: () => void;
}

// Retired/renamed slugs → their live archetype. Raw slug wins first, so a
// first-class faction always renders its own card rather than a legacy skin.
//
// This is the only alias table left in the frontend. The general-purpose one in
// utils/factions.ts had been an empty object since #232 and was deleted with the
// four resolution branches that consulted it (#1389); these two slugs were never
// in it, so nothing here changed.
const LEGACY_SLUG: Record<string, string> = {
  gestalt: "coven",
  journeymen: "ephemerists",
};

export default function FactionSelectCard({ faction, ...rest }: FactionSelectCardProps) {
  const cards = surfaceMap("factionSelectCard");
  // Own-property-only on both tables (#1821). `pickVariant` already refuses a
  // prototype key, so the rendered card was right either way — but the plain
  // bracket reads let `key` hold `Object.prototype.toString` under a `string`
  // annotation on the way there.
  const key =
    !hasOwnKey(cards, faction) && hasOwnKey(LEGACY_SLUG, faction)
      ? LEGACY_SLUG[faction]
      : faction;
  // The fallback IS the `na` registration. A manifest is override-only and
  // `na` deliberately has none (`factions/index.ts`: unaffiliated is a state,
  // not a faction, and falls through to the `Default*` skins everywhere), so
  // "register the Default archetype" means naming it here — exactly as
  // TaskCard names DefaultTaskCard and MetataskSeal names DefaultSeal.
  // It used to be UaSelectCard, which dressed every unaffiliated and unknown
  // slug in UA's costume (#796, the third instance of #418/#636).
  const Card = resolveVariant(cards, key);
  return <Card {...rest} />;
}
