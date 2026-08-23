import { EverymenFactionHero } from 'worldzero-frontend'

// The Everymen faction-page hero — a union masthead poster: sunburst red field,
// cog seal, knockout Bebas wordmark, and a dark side "ledger" stat panel.
// Hardcoded to Everymen chrome; the page hands it the name and counts.

export function UnionMasthead() {
  return (
    <EverymenFactionHero
      slug="everymen"
      name="Everymen"
      members={302}
      tasks={47}
      praxes={534}
    />
  )
}

