import { AlbescentFactionHero } from 'worldzero-frontend'

// Albescent faction-page hero — a still, meditative frontispiece on white
// cotton paper: the name set large in italic, the surveyor's mark watermarked
// behind and struck once at the side, counts kept as a quiet ledger. Always
// light; hardcoded to Albescent chrome.

export function CottonSheet() {
  return (
    <AlbescentFactionHero
      name="/Albescent"
      description="We keep the quiet tasks — the vigils, the listening, the work no one applauds. Nothing here is ranked. Nothing here is rushed."
      members={44}
      tasks={19}
      praxes={97}
    />
  )
}

// The blurb is optional in this hero — when omitted, the sheet stays even
// quieter, name and ledger alone.
export function NoBlurb() {
  return <AlbescentFactionHero name="/Albescent" description={null} members={44} tasks={19} praxes={97} />
}
