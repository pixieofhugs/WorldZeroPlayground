// LevelTrackMeta — the baseline row under the level track (#2767).
// ONE ROW, NINE MOUNTS: it is TREE, not skin, and the kit's voice arrives
// entirely through `style`. The two cells are the component's own documented
// branches — the mid-curve one-liner every character below the top renders,
// and the top-of-curve pair that has no gap at which it fits, so it wraps.
import type { CSSProperties } from 'react'
import { LevelTrackMeta } from 'worldzero-frontend'
import type { LevelTrack } from '../../frontend/src/utils/levelTrack'

/** Ported verbatim from DefaultFieldDesk's own `trackMetaStyle`. */
const caption: CSSProperties = {
  fontFamily: 'var(--font-body)',
  fontSize: 'var(--text-base)',
  letterSpacing: '0.12em',
  textTransform: 'uppercase',
  color: 'var(--color-text-secondary)',
}

/** The rail the row actually mounts in is ~272px wide — the width is the point. */
const RAIL = 272

const midCurve: LevelTrack = {
  nextLevel: 9,
  pointsToNext: 114,
  currentThreshold: 2_600,
  nextThreshold: 3_200,
  pointsIntoLevel: 486,
  levelSpan: 600,
  fillPercent: 81,
}

const topOfCurve: LevelTrack = {
  nextLevel: null,
  pointsToNext: 0,
  currentThreshold: 3_200,
  nextThreshold: 0,
  pointsIntoLevel: 0,
  levelSpan: 0,
  fillPercent: 100,
}

/** Both captions fit: one line, all-time flush right on its auto margin. */
export function MidCurve() {
  return (
    <div style={{ width: RAIL }}>
      <LevelTrackMeta track={midCurve} allTimeScore={3_886} style={caption} />
    </div>
  )
}

/** The sentence branch — the pair cannot fit, so all-time drops to its own line. */
export function TopOfCurve() {
  return (
    <div style={{ width: RAIL }}>
      <LevelTrackMeta track={topOfCurve} allTimeScore={3_886} style={caption} />
    </div>
  )
}
