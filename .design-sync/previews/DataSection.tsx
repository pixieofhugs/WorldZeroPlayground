// DataSection preview cell — Your data (#2158): the synchronous zip you can open
// in ten years. One row, one control, and the two states it can reach.
//
// The export itself calls `exportMyData()` and hands the blob to a download, so
// in the harness (no network) the button is the whole surface — which is exactly
// what the section is. The failed branch is local state, so it cannot be posed
// from a prop; this renders the section's resting state, the one a reader meets.
//
// ONE CELL: `working`/`failed` are internal useState, with no prop to pin them.
import { DataSection } from 'worldzero-frontend'

export function Data() {
  return (
    <div style={{ padding: 24, maxWidth: 760, background: 'var(--color-bg-page)' }}>
      <DataSection sectionId="sec-data" />
    </div>
  )
}
