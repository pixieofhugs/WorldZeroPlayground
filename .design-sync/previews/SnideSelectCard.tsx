// SnideSelectCard preview cells. SnideSelectCard is one faction's own tile in the
// character-creation picker — the ransom dispatch — cut-and-pasted letterforms on a taped-down slip.
// The payload is faction-agnostic ({ state, members, onVisit }); every word and
// every colour on the tile is component-owned, derived from the slug it stands
// for. Cells sweep the one real axis the caller controls: the join state.
import { SnideSelectCard } from 'worldzero-frontend'
import { noop } from './_fixtures'

const wrap: React.CSSProperties = {
  padding: 24,
  display: 'flex',
  flexWrap: 'wrap',
  gap: 28,
  alignItems: 'flex-start',
}

/** The state axis: locked (level gate not met), eligible (may join now), and
 *  member (already in). The status line and the CTA treatment differ per state. */
export function StateAxis() {
  return (
    <div style={wrap}>
      <SnideSelectCard state="locked" members={88} onVisit={noop} />
      <SnideSelectCard state="eligible" members={88} onVisit={noop} />
      <SnideSelectCard state="member" members={88} onVisit={noop} />
    </div>
  )
}

/** Members omitted — the roster count drops out of the tile entirely rather
 *  than rendering a zero, which is the state a cold directory read shows. */
export function NoMemberCount() {
  return (
    <div style={wrap}>
      <SnideSelectCard state="eligible" onVisit={noop} />
    </div>
  )
}
