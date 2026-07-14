// SnideVote preview cells — the S.N.I.D.E. vote UI: a junk-drawer of mismatched
// rubber stamps climbing from a dismissive "meh" to the black ANARCHY seal.
// Auth is mocked authed so the interactive stamps render. SnideVote ignores
// `mode`; state comes from currentValue / points / totalVotes.
import { SnideVote } from 'worldzero-frontend'

const wrap: React.CSSProperties = { padding: 24, maxWidth: 520 }

/** Caster state — a mid-ramp selection, stamps reached up to it, no tally. */
export function Caster() {
  return (
    <div style={wrap}>
      <SnideVote praxisId={731} currentValue={3} mode="caster" />
    </div>
  )
}

/** Summary state — a selection plus the accrued points / vote tally. */
export function Summary() {
  return (
    <div style={wrap}>
      <SnideVote praxisId={731} currentValue={4} points={39} totalVotes={9} mode="summary" />
    </div>
  )
}

/** Top-rung ANARCHY seal selected, with a full tally. */
export function TopRung() {
  return (
    <div style={wrap}>
      <SnideVote praxisId={731} currentValue={5} points={52} totalVotes={14} mode="caster" />
    </div>
  )
}
