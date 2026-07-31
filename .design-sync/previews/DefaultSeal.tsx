// DefaultSeal preview cells — the sticker an applied metatask leaves on a praxis.
// Read-only by default; the removable cell shows the one foreign control it ever
// carries, the peel-off close control at the upper right.
import { DefaultSeal } from 'worldzero-frontend'
import { metataskFor, noop } from './_fixtures'

const wrap: React.CSSProperties = { padding: 28, display: 'flex', flexWrap: 'wrap', gap: 24 }

/** Applied and sealed — the ordinary, read-only sticker. */
export function Applied() {
  return (
    <div style={wrap}>
      <DefaultSeal metatask={metataskFor('na')} />
    </div>
  )
}

/** A heavier bonus and a longer condition line, to show the label wrapping. */
export function LongCondition() {
  return (
    <div style={wrap}>
      <DefaultSeal
        metatask={metataskFor('na', {
          title: 'Complete it outdoors, before sunrise, with someone you have never met',
          point_value: 40,
        })}
      />
    </div>
  )
}

/** The author's own view, where the seal can still be peeled off. */
export function Removable() {
  return (
    <div style={wrap}>
      <DefaultSeal metatask={metataskFor('na')} removable onRemove={noop} />
    </div>
  )
}
