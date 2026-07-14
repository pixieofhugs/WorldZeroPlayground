// VoteUI preview cells — the faction vote dispatcher. Keyed by factionSlug it
// swaps in the per-faction rating skin; an unknown / null slug falls back to the
// neutral VoteStamps ramp. Auth is mocked authed, so the interactive 1-5 rungs
// render (not the login gate). Shows the neutral fallback, a dispatched faction
// skin, plus caster / summary / top-rung states.
import { VoteUI } from 'worldzero-frontend'

const wrap: React.CSSProperties = { padding: 24, maxWidth: 520 }

/** No slug → the neutral VoteStamps ramp, mid selection, no tally yet. */
export function NeutralFallback() {
  return (
    <div style={wrap}>
      <VoteUI praxisId={701} factionSlug={null} currentValue={3} mode="caster" />
    </div>
  )
}

/** Dispatched to a faction skin (Wow hearts) — caster state, no tally. */
export function FactionDispatch() {
  return (
    <div style={wrap}>
      <VoteUI praxisId={702} factionSlug="wow" currentValue={2} mode="caster" />
    </div>
  )
}

/** Summary state — a dispatched skin (Ephemerists seals) with points + tally. */
export function Summary() {
  return (
    <div style={wrap}>
      <VoteUI praxisId={703} factionSlug="ephemerists" currentValue={4} points={38} totalVotes={11} mode="summary" />
    </div>
  )
}

/** Top-rung selection with the appraised tally on a faction skin (Snide). */
export function TopRung() {
  return (
    <div style={wrap}>
      <VoteUI praxisId={704} factionSlug="snide" currentValue={5} points={57} totalVotes={16} mode="caster" />
    </div>
  )
}
