import { SnideFactionHero } from 'worldzero-frontend'

// S.N.I.D.E. faction-page hero — a flyposted wall with a slapped sigil sticker,
// skewed acid wordmark, and staggered stat chits on the side. Hardcoded to SNIDE
// chrome; the page hands it the faction name, blurb, and three raw counts.

export function FlypostedWall() {
  return (
    <SnideFactionHero
      name="S.N.I.D.E."
      description="We paste what the city would rather forget. No permits, no apologies — just the wall, the wheatpaste, and whatever you were brave enough to say out loud before the sweepers came through."
      members={143}
      tasks={29}
      praxes={361}
    />
  )
}

// Fallback path: the wall prints its own manifesto when no blurb is supplied.
export function WallFallback() {
  return <SnideFactionHero name="S.N.I.D.E." description={null} members={12} tasks={5} praxes={18} />
}
