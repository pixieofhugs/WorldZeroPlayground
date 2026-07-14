import { UAFactionHero } from 'worldzero-frontend'

// UA (University of Asthmatics) faction-page hero — the gilt-salon frontispiece
// at the top of the UA faction page. Hardcoded to UA chrome; the page hands it
// the faction name, blurb, and three raw counts (patrons / commissions /
// acquisitions).

export function GiltSalon() {
  return (
    <UAFactionHero
      name="UA"
      description="The University of Asthmatics keeps the slow arts — drawing, letters, the patient made things. We commission work that rewards a second look, and acquire only what deserves to outlast the season."
      members={214}
      tasks={38}
      praxes={472}
    />
  )
}

// Fallback path: no faction blurb supplied, so the salon prints its own
// engraved statement, and a smaller, newer chapter's counts.
export function HouseFallback() {
  return <UAFactionHero name="UA" description={null} members={17} tasks={6} praxes={41} />
}
