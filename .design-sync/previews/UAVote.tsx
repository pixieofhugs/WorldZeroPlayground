// UAVote preview cells — the UA "gilt salon" appraisal ramp (rough-sketch →
// masterwork), the state-heavy vote canary.
//
// HARNESS NOTE: UAVote gates on useAuth().user via the shared useVote hook, and
// the design-sync provider wraps only MemoryRouter + i18next (no AuthProvider),
// so useAuth resolves to its anonymous default. In this harness UAVote therefore
// renders its logged-out VoteLoginGate rather than the interactive rungs — the
// same behavior the repo's archetype tests document. The props below express the
// caster and summary states the component would show once authenticated.
import { UAVote } from 'worldzero-frontend'

const wrap: React.CSSProperties = { padding: 24, maxWidth: 520 }

/** Caster state — a mid-ramp selection ("accomplished"), no tally yet. */
export function Caster() {
  return (
    <div style={wrap}>
      <UAVote praxisId={501} currentValue={3} mode="caster" />
    </div>
  )
}

/** Summary state — a selection plus the appraised points / vote tally. */
export function Summary() {
  return (
    <div style={wrap}>
      <UAVote praxisId={501} currentValue={4} points={42} totalVotes={9} mode="summary" />
    </div>
  )
}

/** Top-rung "masterwork" selection — the gilt ACQUIRED plate lit. */
export function TopRung() {
  return (
    <div style={wrap}>
      <UAVote praxisId={501} currentValue={5} points={58} totalVotes={14} mode="caster" />
    </div>
  )
}
