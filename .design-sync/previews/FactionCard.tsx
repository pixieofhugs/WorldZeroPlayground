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

// ADR-0038: the card reads each faction's name and description from
// `locales/en/factions.json`, so no wording is left here to drift. `FactionOut`
// itself is the slug plus the row's own visibility, and `GET /factions`
// answers only visible rows.
const FACTIONS: Record<string, FactionOut> = {
  ua: { slug: 'ua', status: 'visible' },
  wow: { slug: 'wow', status: 'visible' },
  snide: { slug: 'snide', status: 'visible' },
  ephemerists: { slug: 'ephemerists', status: 'visible' },
  singularity: { slug: 'singularity', status: 'visible' },
  everymen: { slug: 'everymen', status: 'visible' },
  albescent: { slug: 'albescent', status: 'visible' },
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
          // A slug with no archetype and no catalog entry — the neutral card
          // frame still renders it legibly.
          faction={{ slug: 'mystery', status: 'visible' }}
          status="not_invited"
        />
      </div>
    </div>
  )
}
