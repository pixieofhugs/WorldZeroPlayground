/**
 * Faction marks — the devices a score stamp holds its total inside (ADR-0049).
 * Tintable from a token: inline SVG for small/multi-stop marks ({@link Lotus}),
 * `public/` asset + CSS mask for large single-colour ones ({@link Enso}).
 *
 * The folder's vocabulary modules (`uaAtoms`, `ephemeristsPlate`, `covenSlip`, …)
 * are NOT re-exported (#1316) — import them by path. This barrel is on the EAGER
 * path (`Sidebar` → `FactionSigil` → `UaSigil` → `Enso`), so every name here is
 * paid on first paint (#2779): only marks shared across factions belong below.
 */
export { default as Lotus, type FactionMarkProps } from "./Lotus";
export { default as Enso } from "./Enso";
export { default as PointsRoundel, type PointsRoundelProps } from "./PointsRoundel";
