// VoteStamps preview cells — the neutral 1-5 rating ramp (five numbered stamp
// tiles with word labels) used as the factionless fallback. Auth is mocked
// authed, so the interactive stamps render, not the login prompt. VoteStamps
// ignores `mode`; state is driven purely by currentValue / points / totalVotes.
import { VoteStamps } from 'worldzero-frontend'

const wrap: React.CSSProperties = { padding: 24, maxWidth: 520 }

/** Caster state — a mid-ramp "good" selection, no tally yet. */
export function Caster() {
  return (
    <div style={wrap}>
      <VoteStamps praxisId={711} currentValue={3} />
    </div>
  )
}

/** Summary state — a selection plus the accrued points / vote tally. */
export function Summary() {
  return (
    <div style={wrap}>
      <VoteStamps praxisId={711} currentValue={4} points={40} totalVotes={10} />
    </div>
  )
}

/** Top-rung "legendary" selection with a full tally. */
export function TopRung() {
  return (
    <div style={wrap}>
      <VoteStamps praxisId={711} currentValue={5} points={55} totalVotes={13} />
    </div>
  )
}
