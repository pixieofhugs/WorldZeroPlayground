// EphemerisNet preview cells. The warped ephemeris net (#2144/#2206) — the
// Ephemerists' ONE ground. The page stopped being aged paper and became a
// chart: a single stroked 1000×600 net, drawn with preserveAspectRatio="none"
// so it warps to whatever it is mounted on.
//
// It is a GROUND, NOT A VEIL: `position: absolute; inset: 0; z-index: -1`,
// inert, sitting between the host's own fill and everything printed on it.
// That contract makes the MOUNT part of the composition — the host must be a
// stacking context with its own fill (isolation: isolate, or any positioned
// element with a z-index) or the net escapes below the fill and paints nothing.
// Every cell here therefore supplies a real plate to mount it on; a bare cell
// would render blank and would be lying about the component.
//
// `opacity` is required on purpose — the owner's three weights are a ruling,
// not a default: 0.17 on the page ground, 0.10 on a card or plate ground, and
// 0.17 on the task brief. A mount that has not decided which surface it is has
// not finished.
import { EphemerisNet } from 'worldzero-frontend'

/** A mounted plate: fill, stacking context, and printed content over the net —
 *  the shape every real host takes. */
const Plate = ({
  weight,
  label,
  children,
}: {
  weight: number
  label: string
  children?: React.ReactNode
}) => (
  <div
    style={{
      position: 'relative',
      isolation: 'isolate',
      width: 320,
      height: 200,
      padding: 20,
      background: 'var(--faction-ephemerists-card-bg)',
      color: 'var(--faction-ephemerists-card-text)',
      border: '1px solid var(--faction-ephemerists-card-border)',
      fontFamily: 'var(--faction-ephemerists-card-font)',
    }}
  >
    <EphemerisNet opacity={weight} />
    <div style={{ fontSize: 'var(--text-content)', letterSpacing: '0.08em' }}>{label}</div>
    {children}
  </div>
)

/** The three ruled weights side by side — the whole decision the prop encodes. */
export function RuledWeights() {
  return (
    <div style={{ padding: 24, display: 'flex', flexWrap: 'wrap', gap: 24 }}>
      <Plate weight={0.17} label="PAGE GROUND — 0.17" />
      <Plate weight={0.1} label="CARD / PLATE — 0.10" />
      <Plate weight={0.17} label="TASK BRIEF — 0.17" />
    </div>
  )
}

/** The net under real printed content, which is the only way to judge whether
 *  it reads as a ground rather than competing with the ink set on it. */
export function UnderContent() {
  return (
    <div style={{ padding: 24, display: 'flex', gap: 24 }}>
      <Plate weight={0.1} label="OBSERVATION LOG">
        <p style={{ marginTop: 12, fontSize: 'var(--text-content)', lineHeight: 1.6 }}>
          Rose before the sun and walked the ridge line. Recorded the transit at
          06:14 — four minutes ahead of the table.
        </p>
      </Plate>
    </div>
  )
}

/** The warp: the same net stretched across two very different aspect ratios.
 *  preserveAspectRatio="none" is the point — it does not letterbox. */
export function Warp() {
  return (
    <div style={{ padding: 24, display: 'flex', flexWrap: 'wrap', gap: 24, alignItems: 'flex-start' }}>
      <div
        style={{
          position: 'relative',
          isolation: 'isolate',
          width: 480,
          height: 120,
          background: 'var(--faction-ephemerists-card-bg)',
          border: '1px solid var(--faction-ephemerists-card-border)',
        }}
      >
        <EphemerisNet opacity={0.17} />
      </div>
      <div
        style={{
          position: 'relative',
          isolation: 'isolate',
          width: 140,
          height: 260,
          background: 'var(--faction-ephemerists-card-bg)',
          border: '1px solid var(--faction-ephemerists-card-border)',
        }}
      >
        <EphemerisNet opacity={0.17} />
      </div>
    </div>
  )
}
