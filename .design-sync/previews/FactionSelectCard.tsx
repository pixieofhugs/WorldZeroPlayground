// FactionSelectCard preview cells. FactionSelectCard is the character-creation
// faction PICKER tile: one per faction slug, each in its full archetype at a
// uniform 360×300. The faction-agnostic payload is { faction, state, members,
// onVisit } — name/blurb/status/CTA copy are component-owned, derived from the
// slug. Cells sweep the faction axis and the locked/eligible/member state axis.
import { FactionSelectCard } from 'worldzero-frontend'
import { noop } from './_fixtures'

const wrap: React.CSSProperties = {
  padding: 24,
  display: 'flex',
  flexWrap: 'wrap',
  gap: 28,
  alignItems: 'flex-start',
}

/** UA gilt placard, Wow whimsy.exe window, Snide ransom dispatch — three tiles
 *  as a player meets them in "Choose your faction", with member-count proof. */
export function GiltWhimsyRansom() {
  return (
    <div style={wrap}>
      <FactionSelectCard faction="ua" state="eligible" members={214} onVisit={noop} />
      <FactionSelectCard faction="wow" state="locked" members={512} onVisit={noop} />
      <FactionSelectCard faction="snide" state="locked" members={88} onVisit={noop} />
    </div>
  )
}

/** Ephemerists codex leaf, Singularity terminal printout, Everymen union
 *  poster, Albescent vellum letter — the remaining four archetypes. */
export function CodexTerminalPosterVellum() {
  return (
    <div style={wrap}>
      <FactionSelectCard faction="ephemerists" state="eligible" members={137} onVisit={noop} />
      <FactionSelectCard faction="singularity" state="locked" members={301} onVisit={noop} />
      <FactionSelectCard faction="everymen" state="member" members={604} onVisit={noop} />
      <FactionSelectCard faction="albescent" state="locked" onVisit={noop} />
    </div>
  )
}

/** The state axis on one faction: locked (can't join yet), eligible (may join),
 *  member (already in) — the status line and its treatment differ per state. */
export function StateAxis() {
  return (
    <div style={wrap}>
      <FactionSelectCard faction="ua" state="locked" members={214} onVisit={noop} />
      <FactionSelectCard faction="ua" state="eligible" members={214} onVisit={noop} />
      <FactionSelectCard faction="ua" state="member" members={214} onVisit={noop} />
    </div>
  )
}

/** Legacy-slug fallback: retired `gestalt`/`journeymen` slugs resolve to their
 *  live archetypes (Wow / Ephemerists), and members omitted drops the count. */
export function LegacyAndNoCount() {
  return (
    <div style={wrap}>
      <FactionSelectCard faction="gestalt" state="eligible" onVisit={noop} />
      <FactionSelectCard faction="journeymen" state="member" onVisit={noop} />
    </div>
  )
}
