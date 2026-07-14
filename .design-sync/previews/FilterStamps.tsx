// FilterStamps preview cells — the status filter as rubber stamps (Style Guide
// §5.3): hard-edged rectangles with an inner dashed border, bold uppercase. The
// active option inverts to a solid stamp. Cells show a selected status and a
// wider option set.
import { FilterStamps } from 'worldzero-frontend'
import { noop } from './_fixtures'

const wrap: React.CSSProperties = { padding: '28px 24px', maxWidth: 620 }

/** A status selected — "Active" stamped solid, the rest hollow. */
export function ActiveStatus() {
  return (
    <div style={wrap}>
      <FilterStamps
        options={['All', 'Active', 'Submitted', 'Retired']}
        value="Active"
        onChange={noop}
      />
    </div>
  )
}

/** The first option selected — the default "All" view. */
export function AllSelected() {
  return (
    <div style={wrap}>
      <FilterStamps
        options={['All', 'Open', 'Voting', 'Closed']}
        value="All"
        onChange={noop}
      />
    </div>
  )
}
