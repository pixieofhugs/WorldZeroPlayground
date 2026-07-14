// PageTitle preview cells — the page masthead (Style Guide §5.2): a display-italic
// heading whose letters each carry a cycling faction-palette underline bar, with an
// optional small eyebrow above. Cells sweep short/long titles and the eyebrow.
import { PageTitle } from 'worldzero-frontend'

const wrap: React.CSSProperties = { padding: '32px 28px', maxWidth: 640 }

/** A plain page title — the per-letter underline palette on a short heading. */
export function Basic() {
  return (
    <div style={wrap}>
      <PageTitle title="Tasks" />
    </div>
  )
}

/** With an eyebrow — era name / section label riding above the title. */
export function WithEyebrow() {
  return (
    <div style={wrap}>
      <PageTitle eyebrow="Era One · 42 open" title="The Commons" />
    </div>
  )
}

/** A longer, multi-word title — shows spaces rendering as underline gaps. */
export function LongTitle() {
  return (
    <div style={wrap}>
      <PageTitle eyebrow="Leaderboard" title="Standings of the Realm" />
    </div>
  )
}
