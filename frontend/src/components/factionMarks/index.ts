/**
 * Faction marks — the signature devices a faction's score stamp holds its total
 * inside (ADR-0049). UA's ensō, the Ephemerists' rubric, Everymen's rubber-stamp
 * roundel, and so on; #821 collapsed all of them into one shared plate and this
 * module is where they come back.
 *
 * A mark must be TINTABLE FROM A TOKEN. Two mechanisms satisfy that, chosen per
 * mark by weight and colour count:
 *
 *   • inline React SVG — small and/or multi-stop marks ({@link Lotus});
 *   • `public/` asset + CSS mask — large single-colour marks ({@link Enso}).
 *
 * Either way no hex reaches the markup and dark mode flows through the
 * `[data-theme="dark"]` cascade. Consumers import from here and stay out of the
 * choice. Marks for the other factions land with their own card slices.
 */
export { default as Lotus, type FactionMarkProps } from "./Lotus";
export { default as Enso } from "./Enso";
export { default as PointsRoundel, type PointsRoundelProps } from "./PointsRoundel";
