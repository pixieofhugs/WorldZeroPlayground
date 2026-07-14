// EverymenCard preview cells. EverymenCard is the Everymen faction's directory
// card — a union recruitment poster: cog seal, big Bebas headline (the faction
// name), a motto plaque, a blurb from faction.description, and a "what you get"
// perk list. Props are FactionCardProps { faction, status, invitationNote }.
import { EverymenCard } from 'worldzero-frontend'
import type { FactionOut } from '../../frontend/src/api/factions'

const wrap: React.CSSProperties = { padding: 24, display: 'flex', gap: 28, flexWrap: 'wrap' }
const col: React.CSSProperties = { width: 460 }

const EVERYMEN: FactionOut = {
  slug: 'everymen',
  name: 'The Everymen',
  description:
    'Honest work, plainly done. We finish what we start and stamp our name on it — no heroes, just neighbors who show up and get it built.',
}

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

/** No description supplied → the poster falls back to its built-in blurb, so the
 *  card never renders a hole where the motto text should be. */
export function BlurbFallback() {
  return (
    <div style={wrap}>
      <div style={col}>
        <EverymenCard
          faction={{ slug: 'everymen', name: 'The Everymen', description: null }}
          status="member"
        />
      </div>
    </div>
  )
}
