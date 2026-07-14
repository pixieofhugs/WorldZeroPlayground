// FilterFactionTabs preview cells — the faction filter as diagonal pennant tabs
// (Style Guide §5.3). Each pennant is faction-colored; the active slug reads full
// opacity, the rest slightly dimmed. Cells show an active selection and the
// none-selected default.
import { FilterFactionTabs } from 'worldzero-frontend'
import type { FactionOut } from '../../frontend/src/api/factions'
import { noop } from './_fixtures'

const wrap: React.CSSProperties = { padding: '28px 24px', maxWidth: 720 }

const FACTIONS: FactionOut[] = [
  { slug: 'ua', name: 'Unbound Academy', description: null },
  { slug: 'wow', name: 'Wonders of the World', description: null },
  { slug: 'snide', name: 'SNIDE', description: null },
  { slug: 'ephemerists', name: 'The Ephemerists', description: null },
  { slug: 'singularity', name: 'Singularity', description: null },
  { slug: 'everymen', name: 'Everymen', description: null },
  { slug: 'albescent', name: 'Albescent', description: null },
]

/** One faction selected — Snide reads full-strength, the others recede. */
export function ActiveSelection() {
  return (
    <div style={wrap}>
      <FilterFactionTabs factions={FACTIONS} value="snide" onChange={noop} />
    </div>
  )
}

/** Nothing selected — the neutral rest state, every pennant at its base opacity. */
export function NoneSelected() {
  return (
    <div style={wrap}>
      <FilterFactionTabs factions={FACTIONS} value="" onChange={noop} />
    </div>
  )
}
