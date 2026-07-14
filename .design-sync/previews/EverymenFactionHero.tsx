import { EverymenFactionHero } from 'worldzero-frontend'

// The Everymen faction-page hero — a union masthead poster: sunburst red field,
// cog seal, knockout Bebas wordmark, and a dark side "ledger" stat panel.
// Hardcoded to Everymen chrome; the page hands it the name, blurb, and counts.

export function UnionMasthead() {
  return (
    <EverymenFactionHero
      name="Everymen"
      description="No heroes, only hands. We build the tool library, staff the mutual-aid table, and split the work so no one carries it alone."
      members={302}
      tasks={47}
      praxes={534}
    />
  )
}

// Fallback path: the masthead prints its own union line when no blurb is passed.
export function LedgerFallback() {
  return <EverymenFactionHero name="Everymen" description={null} members={21} tasks={9} praxes={64} />
}
