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
 * choice.
 *
 * THE FOLDER IS WIDER THAN THIS BARREL (#1316). It also holds the faction
 * vocabulary modules — `uaAtoms`, `UaMandala`, `ephemeristsPlate`, `covenSlip`,
 * `wowOrnament`, `wowMobile`, `snideAtoms` — and `TaskCrown`, the one praxis
 * mark. Every one of them is read by MORE THAN ONE dispatched surface, which is
 * why none of them could follow a surface into `taskCard/`, `sigil/`,
 * `factionHero/`, `selectCard/` or `factionCard/` when `components/cards/` was
 * split up. They are NOT re-exported here: a second name for a module is the
 * thing that split was undoing, so import them by path.
 *
 * NEITHER IS `CovenCauldron`, AND THAT IS A BYTE RULE (#2779). This barrel is on
 * the EAGER path — `Sidebar` -> `FactionSigil` -> `UaSigil` imports `Enso` from
 * here on every page — so a name re-exported here is a name every first paint
 * pays for. The cauldron's re-export had zero consumers (both surfaces already
 * import it by path) and cost 2.0 KB gzipped of blocking JS, because it dragged
 * `covenSlip` behind it. Import a faction's own ornament by path; only marks
 * more than one faction's surfaces share belong in the three lines below.
 */
export { default as Lotus, type FactionMarkProps } from "./Lotus";
export { default as Enso } from "./Enso";
export { default as PointsRoundel, type PointsRoundelProps } from "./PointsRoundel";
