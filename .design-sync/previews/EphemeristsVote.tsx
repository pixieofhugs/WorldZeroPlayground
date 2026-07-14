// EphemeristsVote preview cells — THE CONCORDANCE: the 1-5 approval as a wax-seal
// ramp (apocryphal → the authoritative ink seal at V) with Cinzel roman numerals
// and italic tier labels. Auth is mocked authed so the interactive seals render.
// Ignores `mode`; state comes from currentValue / points / totalVotes.
import { EphemeristsVote } from 'worldzero-frontend'

const wrap: React.CSSProperties = { padding: 24, maxWidth: 520 }

/** Caster state — a mid-ramp seal selected, seals filled up to it, no tally. */
export function Caster() {
  return (
    <div style={wrap}>
      <EphemeristsVote praxisId={741} currentValue={3} mode="caster" />
    </div>
  )
}

/** Summary state — a selection plus the accrued points / vote tally. */
export function Summary() {
  return (
    <div style={wrap}>
      <EphemeristsVote praxisId={741} currentValue={4} points={41} totalVotes={11} mode="summary" />
    </div>
  )
}

/** Top-rung authoritative seal (V) selected, with a full tally. */
export function TopRung() {
  return (
    <div style={wrap}>
      <EphemeristsVote praxisId={741} currentValue={5} points={56} totalVotes={15} mode="caster" />
    </div>
  )
}
