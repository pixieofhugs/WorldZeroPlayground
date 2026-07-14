// FilterLevelNodes preview cells — the level filter as connected nodes (Style
// Guide §5.3): a row of circles wired by short bars, each meaning "level ≥ N".
// The active node fills dark and scales up. Cells show a mid selection and the
// none-selected rest state.
import { FilterLevelNodes } from 'worldzero-frontend'
import { noop } from './_fixtures'

const wrap: React.CSSProperties = { padding: '28px 24px', maxWidth: 520 }

const LEVELS = [1, 2, 3, 4, 5, 6, 7, 8]

/** Level 4 active — the filled, scaled node against its dimmer neighbours. */
export function ActiveLevel() {
  return (
    <div style={wrap}>
      <FilterLevelNodes levels={LEVELS} value={4} onChange={noop} />
    </div>
  )
}

/** No floor set — every node in its hollow rest state. */
export function NoneSelected() {
  return (
    <div style={wrap}>
      <FilterLevelNodes levels={LEVELS} value="" onChange={noop} />
    </div>
  )
}
