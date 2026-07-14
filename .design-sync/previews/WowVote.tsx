// WowVote preview cells — the Warriors of Whimsy vote UI: the 1-5 rating as an
// escalating pastel-pink heart ramp in soft rounded tiles. Auth is mocked authed
// so the interactive hearts render. WowVote ignores `mode`; state comes from
// currentValue / points / totalVotes.
import { WowVote } from 'worldzero-frontend'

const wrap: React.CSSProperties = { padding: 24, maxWidth: 520 }

/** Caster state — a mid-ramp selection, hearts filled up to it, no tally. */
export function Caster() {
  return (
    <div style={wrap}>
      <WowVote praxisId={721} currentValue={3} mode="caster" />
    </div>
  )
}

/** Summary state — a selection plus the accrued points / vote tally. */
export function Summary() {
  return (
    <div style={wrap}>
      <WowVote praxisId={721} currentValue={4} points={44} totalVotes={12} mode="summary" />
    </div>
  )
}

/** Top-rung selection — all five hearts lit, with a full tally. */
export function TopRung() {
  return (
    <div style={wrap}>
      <WowVote praxisId={721} currentValue={5} points={61} totalVotes={15} mode="caster" />
    </div>
  )
}
