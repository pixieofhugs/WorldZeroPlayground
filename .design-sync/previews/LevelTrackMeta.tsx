// LevelTrackMeta preview cells — the baseline row under the level track (#2767):
// what is owed on the left, what has ever been earned on the right.
//
// THE TWO CELLS ARE THE COMPONENT'S TWO REAL BRANCHES, and they are the reason
// the row wraps on the baseline instead of centring. Its own doc names both:
//
//   MidCurve  — `"114 TO LEVEL 9"`, the branch every character below the top
//               renders. Both captions fit, so it is ONE line with all-time
//               flush right on its auto margin.
//   TopOfCurve — `nextLevel: null` gives `"Nowhere to go from here but the top"`,
//               ~262px of uppercase caption in a rail about 272px wide. Nothing
//               fits, all-time drops to a line of its own and stays right.
//
// Both cells are held at the rail's real 272px so the wrap is the true one; at
// card width neither branch would ever wrap and the pair would read identically.
//
// `style` is the mounting kit's caption voice, and the doc is explicit that you
// pass the site's existing constant rather than re-deriving it — this is
// `identityMetaStyle` from `components/layout/Sidebar.tsx`, ported verbatim.
import { LevelTrackMeta } from 'worldzero-frontend'
import type { LevelTrack } from '../../frontend/src/utils/levelTrack'

const identityMetaStyle: React.CSSProperties = {
  fontFamily: 'var(--font-body)',
  fontSize: 'var(--text-base)',
  letterSpacing: '0.12em',
  textTransform: 'uppercase',
  color: 'var(--rail-quiet, var(--color-text-secondary))',
}

/** The rail's real width — the constraint that makes the wrap branch real. */
function Rail({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ width: 272, padding: 16, background: 'var(--color-bg-page)' }}>
      {children}
    </div>
  )
}

/** Climbing level 9: 286 of the band's 400 points banked, 114 still owed. */
const midCurve: LevelTrack = {
  nextLevel: 9,
  pointsToNext: 114,
  currentThreshold: 2400,
  nextThreshold: 2800,
  pointsIntoLevel: 286,
  levelSpan: 400,
  fillPercent: 71.5,
}

/** The top of the era's curve: nothing owed, bar full. */
const topOfCurve: LevelTrack = {
  nextLevel: null,
  pointsToNext: 0,
  currentThreshold: 3600,
  nextThreshold: 0,
  pointsIntoLevel: 286,
  levelSpan: 400,
  fillPercent: 100,
}

export function MidCurve() {
  return (
    <Rail>
      <LevelTrackMeta track={midCurve} allTimeScore={3886} style={identityMetaStyle} />
    </Rail>
  )
}

export function TopOfCurve() {
  return (
    <Rail>
      <LevelTrackMeta track={topOfCurve} allTimeScore={3886} style={identityMetaStyle} />
    </Rail>
  )
}
