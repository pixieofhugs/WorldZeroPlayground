import { EphemeristsMasthead } from 'worldzero-frontend'

// The Ephemerists' engraved masthead (#1656) — the almanac plate that replaced
// the deco wordmark. An ensō-ruled sigil, the faction wordmark, a four-glyph
// register row, and a datum row carrying the surface's own timestamp.
//
// Two size tables: `page` for a surface header, `card` for the reduced cut that
// rides on a card. `date` is optional — a surface with no timestamp of its own
// (a praxis still being drafted) leaves the datum cell empty rather than
// inventing one.

// The page cut: the full plate as a surface header.
export function PageHeader() {
  return <EphemeristsMasthead slug="ephemerists" scale="page" date="2026-07-14T09:20:00Z" />
}

// The reduced cut that rides on a card surface.
export function CardHeader() {
  return <EphemeristsMasthead slug="ephemerists" scale="card" date="2026-07-14T09:20:00Z" />
}

// No timestamp — the datum cell is deliberately left empty.
export function Undated() {
  return <EphemeristsMasthead slug="ephemerists" scale="card" date={null} />
}
