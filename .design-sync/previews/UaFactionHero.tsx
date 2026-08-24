import { UaFactionHero } from 'worldzero-frontend'

// UA (University of Asthmatics) faction-page hero — the gilt-salon frontispiece
// at the top of the UA faction page. Hardcoded to UA chrome; the page hands it
// the faction name and three raw counts (patrons / commissions /
// acquisitions).

export function GiltSalon() {
  return (
    <UaFactionHero
      slug="ua"
      name="UA"
      members={214}
      tasks={38}
      praxes={472}
    />
  )
}

