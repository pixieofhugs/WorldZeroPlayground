// SingularityVote preview cells — THE CONSENSUS ARRAY: the 1-5 rating as a
// signal-strength ramp (noise → weak → signal → clear → verified) in square mono
// terminal keys, with a "cast signal" prompt. Always-dark terminal chrome. Auth
// is mocked authed so the interactive keys render. Ignores `mode`; state comes
// from currentValue / points / totalVotes.
import { SingularityVote } from 'worldzero-frontend'

const wrap: React.CSSProperties = { padding: 24, maxWidth: 520 }

/** Caster state — a mid-ramp key reached, no tally yet. */
export function Caster() {
  return (
    <div style={wrap}>
      <SingularityVote praxisId={751} currentValue={3} mode="caster" />
    </div>
  )
}

/** Summary state — a selection plus the accrued points / vote tally. */
export function Summary() {
  return (
    <div style={wrap}>
      <SingularityVote praxisId={751} currentValue={4} points={43} totalVotes={12} mode="summary" />
    </div>
  )
}

/** Top-rung "verified" key selected, full signal, with a full tally. */
export function TopRung() {
  return (
    <div style={wrap}>
      <SingularityVote praxisId={751} currentValue={5} points={59} totalVotes={17} mode="caster" />
    </div>
  )
}
