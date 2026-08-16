// FilterLevelNodes preview cells — a wrapping row of circles, each meaning
// "level ≥ N". Redrawn in #1824 to the propose form's geometry: 40px nodes with
// a 2px border in every state, tinted by the SELECTED faction (the spectrum
// stands in for unaffiliated). The component carries no label of its own, so
// each cell renders the one its caller would.
import { FilterLevelNodes } from 'worldzero-frontend'
import { noop } from './_fixtures'

const wrap: React.CSSProperties = { padding: '28px 24px', maxWidth: 520 }

const LEVELS = [1, 2, 3, 4, 5, 6, 7, 8]

/** Level 4 active, on a faction: the tint wash and its 2px ring. */
export function ActiveLevel() {
  return (
    <div style={wrap}>
      <span className="label-heading" style={{ display: 'block', marginBottom: 'var(--space-sm)' }}>
        Minimum Level
      </span>
      <FilterLevelNodes levels={LEVELS} value={4} onChange={noop} factionSlug="coven" />
    </div>
  )
}

/** No floor set — every node in its hollow rest state, unaffiliated. */
export function NoneSelected() {
  return (
    <div style={wrap}>
      <span className="label-heading" style={{ display: 'block', marginBottom: 'var(--space-sm)' }}>
        Minimum Level
      </span>
      <FilterLevelNodes levels={LEVELS} value="" onChange={noop} />
    </div>
  )
}
