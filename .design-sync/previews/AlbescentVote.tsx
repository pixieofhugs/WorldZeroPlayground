// AlbescentVote preview cells — BEAR WITNESS (#232): the 1-5 approval recast as an
// act of witnessing (Unseeing → Inscribed) in five grayscale cross-hair marks of
// rising ink, no hue, the chosen mark taking a white centre. Auth is mocked authed
// so the interactive marks render. Ignores `mode`; state comes from currentValue /
// points / totalVotes.
import { AlbescentVote } from 'worldzero-frontend'

const wrap: React.CSSProperties = { padding: 24, maxWidth: 520 }

/** Caster state — a mid-ramp mark witnessed, marks filled up to it, no tally. */
export function Caster() {
  return (
    <div style={wrap}>
      <AlbescentVote praxisId={771} currentValue={3} mode="caster" />
    </div>
  )
}

/** Summary state — a selection plus the accrued points / vote tally. */
export function Summary() {
  return (
    <div style={wrap}>
      <AlbescentVote praxisId={771} currentValue={4} points={37} totalVotes={10} mode="summary" />
    </div>
  )
}

/** Top-rung "Inscribed" mark selected, with a full tally. */
export function TopRung() {
  return (
    <div style={wrap}>
      <AlbescentVote praxisId={771} currentValue={5} points={54} totalVotes={14} mode="caster" />
    </div>
  )
}
