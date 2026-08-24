import { WowFactionHero } from 'worldzero-frontend'

// Warriors of Whimsy faction-page hero — whimsy.exe pinned to a cork memo board.
// Hardcoded to WoW chrome; the page hands it the faction name and three
// raw counts rendered as taped sticker charms.

export function CorkBoard() {
  return (
    <WowFactionHero
      slug="wow"
      name="Warriors of Whimsy"
      members={188}
      tasks={44}
      praxes={519}
    />
  )
}

