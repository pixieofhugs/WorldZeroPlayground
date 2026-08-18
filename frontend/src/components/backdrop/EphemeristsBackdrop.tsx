import EphemerisNet from "../factionMarks/EphemerisNet";

/**
 * The Ephemerists full-page backdrop — the page as a sheet of the ephemeris.
 *
 * NOT aged vellum any more (#2144). This was a seven-layer wash — a gold corner
 * bleed, a nile corner bleed, two partial astrolabe rings, dot foxing, a
 * straight 26px ruling and a closing gradient — and all seven are replaced by
 * ONE layer: {@link EphemerisNet}, the warped chart. Owner ruling on #2140: a
 * chart is a thing an ephemerist made, where foxing is only something that
 * happened to the paper.
 *
 * The sheet COLOUR stays, in `.eph-backdrop` in index.css, and is the one thing
 * on that list not counted as a wash layer: it is what makes this page vellum
 * rather than the site's neutral ground, and dropping it would take the faction's
 * stock with it in both themes.
 *
 * 0.17 is the page's weight of the three the owner ruled — see the net's header
 * for the other two and why they differ.
 */
export default function EphemeristsBackdrop() {
  return (
    <div className="eph-backdrop" aria-hidden="true">
      <EphemerisNet opacity={0.17} />
    </div>
  );
}
