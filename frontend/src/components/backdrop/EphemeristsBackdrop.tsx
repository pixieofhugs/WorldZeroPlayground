import EphemerisNet from "../factionMarks/EphemerisNet";

/**
 * Ephemerists page backdrop: the page as a sheet of the ephemeris (#2144) —
 * one layer, {@link EphemerisNet}, over `.eph-backdrop`'s vellum colour.
 * 0.17 is the page weight; the net's header explains the other two.
 */
export default function EphemeristsBackdrop() {
  return (
    <div className="eph-backdrop" aria-hidden="true">
      <EphemerisNet opacity={0.17} />
    </div>
  );
}
