import { EphemeristsMasthead } from 'worldzero-frontend'

// The Ephemerists' engraved masthead (#1656) — the almanac plate that replaced
// the deco wordmark. An ensō-ruled sigil, the faction wordmark, and the NOTATION
// BAND: a row of mathematical marks whose count is measured off the band's own
// rendered width and whose draw is seeded per surface (#2143).
//
// Two size tables: `page` for a surface header, `card` for the reduced cut that
// rides on a card. `seed` is required and must be stable per surface — a task or
// praxis id. Two surfaces with different seeds wear different rows; one surface
// wears the same row across every re-render, which is what makes a screenshot of
// it reproducible.
//
// The datum row — date, right ascension, declination — used to sit here. It
// moved to `EphemeristsColophon` at the foot of the sheet, where it is labelled
// as the PLATE's provenance rather than left as a bare coordinate pair (#2124).

// The page cut: the full plate as a surface header.
export function PageHeader() {
  return <EphemeristsMasthead slug="ephemerists" scale="page" seed="task:314" />
}

// The reduced cut that rides on a card surface.
export function CardHeader() {
  return <EphemeristsMasthead slug="ephemerists" scale="card" seed="task:314" />
}

// A second surface at the same scale — the band differs because the seed does.
export function CardHeaderOtherSurface() {
  return <EphemeristsMasthead slug="ephemerists" scale="card" seed="praxis:314" />
}
