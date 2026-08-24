import { SnideFactionHero } from 'worldzero-frontend'

// S.N.I.D.E. faction-page hero — a flyposted wall with a slapped sigil sticker,
// skewed acid wordmark, and staggered stat chits on the side. Hardcoded to SNIDE
// chrome; the page hands it the faction name and three raw counts.

export function FlypostedWall() {
  return (
    <SnideFactionHero
      slug="snide"
      name="S.N.I.D.E."
      members={143}
      tasks={29}
      praxes={361}
    />
  )
}

