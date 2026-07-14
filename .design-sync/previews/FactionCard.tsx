// FactionCard preview cells. FactionCard is the DISPATCHER: it reads
// faction.slug and renders that faction's bespoke directory/summary card
// (gilt placard, whimsy.exe window, ransom sheet, codex leaf, terminal
// printout, union poster), falling back to a generic bordered card for any
// slug without an archetype. It carries no controls — the whole card is a link
// to the faction detail page. Each card wants a column width, so cells lay them
// out in a fixed-width flex wrap.
import { FactionCard } from 'worldzero-frontend'
import type { FactionOut } from '../../frontend/src/api/factions'

const wrap: React.CSSProperties = {
  padding: 24,
  display: 'flex',
  flexWrap: 'wrap',
  gap: 28,
  alignItems: 'flex-start',
}
const col: React.CSSProperties = { width: 300 }

const FACTIONS: Record<string, FactionOut> = {
  ua: {
    slug: 'ua',
    name: 'University of Asthmatics',
    description:
      'A gilt salon for the patient craftsman. We prize the slow hand, the studied line, and work that will outlast the desk it was made on.',
  },
  wow: {
    slug: 'wow',
    name: 'Warriors of Whimsy',
    description:
      'Joy is a discipline. We flood the grey world with chalk suns and sidewalk parades until delight becomes contagious.',
  },
  snide: {
    slug: 'snide',
    name: 'SNIDE',
    description:
      'Paste it before they paint over it. Anonymous, unruly, loud — art that argues with the wall it lives on.',
  },
  ephemerists: {
    slug: 'ephemerists',
    name: 'The Ephemerists',
    description:
      'We catalogue what the world forgets: every bench, every tide line, every name carved and left to weather.',
  },
  singularity: {
    slug: 'singularity',
    name: 'The Singularity',
    description:
      'Measure yourself into optimization. Log the signal, tighten the variance, converge on a better protocol.',
  },
  everymen: {
    slug: 'everymen',
    name: 'The Everymen',
    description:
      'Honest work, plainly done. We finish what we start and stamp our name on it — no heroes, just neighbors.',
  },
  albescent: {
    slug: 'albescent',
    name: 'The Albescent',
    description:
      'Where exactly are you? We keep quiet company with what is passing, and write down only that it happened.',
  },
}

/** The gilt-salon (UA), whimsy.exe window (Wow), and ransom sheet (Snide)
 *  archetypes side by side — the switcher's three most distinct chromes. */
export function GiltWhimsyRansom() {
  return (
    <div style={wrap}>
      <div style={col}>
        <FactionCard faction={FACTIONS.ua} status="member" />
      </div>
      <div style={col}>
        <FactionCard faction={FACTIONS.wow} status="not_invited" />
      </div>
      <div style={col}>
        <FactionCard faction={FACTIONS.snide} status="not_invited" />
      </div>
    </div>
  )
}

/** The codex leaf (Ephemerists), terminal printout (Singularity), and union
 *  poster (Everymen) — the other three bespoke archetypes. */
export function CodexTerminalPoster() {
  return (
    <div style={wrap}>
      <div style={col}>
        <FactionCard faction={FACTIONS.ephemerists} status="invited" />
      </div>
      <div style={col}>
        <FactionCard faction={FACTIONS.singularity} status="not_invited" />
      </div>
      <div style={col}>
        <FactionCard faction={FACTIONS.everymen} status="member" />
      </div>
    </div>
  )
}

/** Status + invitation axes: a fresh invitation eyebrow (UA), a "welcome back"
 *  returnable (Snide), and a burned membership (Ephemerists). */
export function StatusAndInvitation() {
  return (
    <div style={wrap}>
      <div style={col}>
        <FactionCard
          faction={FACTIONS.ua}
          status="invited"
          invitationNote="delivered this morning"
        />
      </div>
      <div style={col}>
        <FactionCard faction={FACTIONS.snide} status="welcome_back" />
      </div>
      <div style={col}>
        <FactionCard faction={FACTIONS.ephemerists} status="burned" />
      </div>
    </div>
  )
}

/** The generic fallback: a slug with no bespoke archetype (Albescent, and a
 *  truly unknown slug) renders the plain bordered card in that faction's ink. */
export function GenericFallback() {
  return (
    <div style={wrap}>
      <div style={col}>
        <FactionCard faction={FACTIONS.albescent} status="member" />
      </div>
      <div style={col}>
        <FactionCard
          faction={{
            slug: 'mystery',
            name: 'An Unlisted Order',
            description:
              'A faction the client has never seen — still rendered legibly in the neutral card frame.',
          }}
          status="not_invited"
        />
      </div>
    </div>
  )
}
