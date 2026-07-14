// EverymenVote preview cells — union "approval stamps" with an escalating ink
// ramp (gold → red → the authoritative black seal at 5), Bebas Neue numerals and
// a dashed inset on the active stamp. Auth is mocked authed so the interactive
// stamps render. Ignores `mode`; state comes from currentValue / points /
// totalVotes.
import { EverymenVote } from 'worldzero-frontend'

const wrap: React.CSSProperties = { padding: 24, maxWidth: 520 }

/** Caster state — a mid-ramp stamp selected, stamps filled up to it, no tally. */
export function Caster() {
  return (
    <div style={wrap}>
      <EverymenVote praxisId={761} currentValue={3} mode="caster" />
    </div>
  )
}

/** Summary state — a selection plus the accrued points / vote tally. */
export function Summary() {
  return (
    <div style={wrap}>
      <EverymenVote praxisId={761} currentValue={4} points={45} totalVotes={13} mode="summary" />
    </div>
  )
}

/** Top-rung authoritative black seal (5) selected, with a full tally. */
export function TopRung() {
  return (
    <div style={wrap}>
      <EverymenVote praxisId={761} currentValue={5} points={60} totalVotes={16} mode="caster" />
    </div>
  )
}
