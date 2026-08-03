// EverymenCard preview cells. EverymenCard is the Everymen faction's directory
// card — a union recruitment poster: cog seal, big Bebas headline (the faction
// name), a motto plaque, the catalog blurb, and a "what you get" perk list.
// Props are FactionCardProps { faction, status, invitationNote }.
import { EverymenCard } from 'worldzero-frontend'
import type { FactionOut } from '../../frontend/src/api/factions'

const wrap: React.CSSProperties = { padding: 24, display: 'flex', gap: 28, flexWrap: 'wrap' }
const col: React.CSSProperties = { width: 460 }

// ADR-0038: the poster's name and blurb come from `locales/en/factions.json`;
// `FactionOut` carries the slug and the row's own visibility, nothing else.
const EVERYMEN: FactionOut = { slug: 'everymen', status: 'visible' }

/** The recruitment poster as it reads in the faction directory: cog seal,
 *  headline, motto plaque, blurb, and the three-perk enlistment list. */
export function Poster() {
  return (
    <div style={wrap}>
      <div style={col}>
        <EverymenCard faction={EVERYMEN} status="not_invited" />
      </div>
    </div>
  )
}

/** With a fresh invitation: the kicker rule becomes a personal summons carrying
 *  the invitation note in the poster's banner. */
export function WithInvitation() {
  return (
    <div style={wrap}>
      <div style={col}>
        <EverymenCard
          faction={EVERYMEN}
          status="invited"
          invitationNote="the shop steward asked for you"
        />
      </div>
    </div>
  )
}

/** Already enlisted: `status="member"` drops the recruitment kicker, so the
 *  poster reads as a standing membership card rather than a call to join. */
export function Member() {
  return (
    <div style={wrap}>
      <div style={col}>
        <EverymenCard faction={EVERYMEN} status="member" />
      </div>
    </div>
  )
}
