import { SnideMasthead } from 'worldzero-frontend'

// Shared S.N.I.D.E. masthead — the acid "S.N.I.D.E." wordmark with a
// right-aligned subtitle over an acid underline. Reused across the SNIDE card
// surfaces (task card, praxis card, faction byline). Takes a subtitle string and
// an optional wordmark size.

// As used on the SNIDE task card: a dispatch number in the subtitle slot.
export function DispatchNumber() {
  return <SnideMasthead subtitle="Dispatch No. 0042" />
}

// As used on the SNIDE praxis card: a section label in the subtitle slot.
export function FieldReport() {
  return <SnideMasthead subtitle="Field Report — Filed" />
}

// The larger wordmark size the faction byline uses.
export function LargeWordmark() {
  return <SnideMasthead subtitle="Recruiting Cell" size={18} />
}
