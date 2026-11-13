// DefaultSelectCard preview cells. DefaultSelectCard is the unaffiliated tile in
// the faction directory — the open sheet, spectrum edge and all — and the first
// tile built on the select-card layout blocks (#3130, #3139): band, motto,
// pitch, ornament, standing, headcount, call.
//
// WHY THIS FILE EXISTS: neither place that mounts the tiles passes a member
// count yet, so the HEADCOUNT slot never renders in the app. These cells pass
// one, which makes this the place to look at slot 6 until a real count is wired.
import { DefaultSelectCard } from 'worldzero-frontend'
import { noop } from './_fixtures'

const wrap: React.CSSProperties = {
  padding: 24,
  display: 'flex',
  flexWrap: 'wrap',
  gap: 28,
  // Stretch, not flex-start: the footer is pinned to the bottom of the tile, so
  // a row of equal-height tiles is what shows the calls lining up.
  alignItems: 'stretch',
}

/** The state axis with a headcount: locked, eligible, and member — the one
 *  state that draws the seal in the band. */
export function StateAxisWithHeadcount() {
  return (
    <div style={wrap}>
      <DefaultSelectCard state="locked" members={12} onVisit={noop} />
      <DefaultSelectCard state="eligible" members={12} onVisit={noop} />
      <DefaultSelectCard state="member" members={12} onVisit={noop} />
    </div>
  )
}

/** One fellow: the headcount's noun agrees with the count. */
export function HeadcountOfOne() {
  return (
    <div style={wrap}>
      <DefaultSelectCard state="member" members={1} onVisit={noop} />
    </div>
  )
}

/** Members omitted — what the app renders today. The headcount leaves with its
 *  separator; the standing line stands alone. */
export function NoMemberCount() {
  return (
    <div style={wrap}>
      <DefaultSelectCard state="eligible" onVisit={noop} />
      <DefaultSelectCard state="member" onVisit={noop} />
    </div>
  )
}
