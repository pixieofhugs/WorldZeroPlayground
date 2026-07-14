import { WowFactionHero } from 'worldzero-frontend'

// Warriors of Whimsy faction-page hero — whimsy.exe pinned to a cork memo board.
// Hardcoded to WoW chrome; the page hands it the faction name, blurb, and three
// raw counts rendered as taped sticker charms.

export function CorkBoard() {
  return (
    <WowFactionHero
      name="Warriors of Whimsy"
      description="We fight gloom with glitter. Bring your sidewalk chalk, your kazoo, your most questionable pun — every act of joy counts double here, and no one is too small to start a parade."
      members={188}
      tasks={44}
      praxes={519}
    />
  )
}

// Fallback path: the coven speaks its own blurb when the page supplies none.
export function BoardFallback() {
  return <WowFactionHero name="Warriors of Whimsy" description={null} members={9} tasks={4} praxes={22} />
}
