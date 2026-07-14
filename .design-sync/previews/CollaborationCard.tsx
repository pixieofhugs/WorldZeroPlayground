// CollaborationCard preview cells — the compact roster card for a collab or duel
// praxis (a PraxisCardOut). Faction-tinted background with a left accent rail, a
// mode chip (collaboration / duel), the task link, a title (or member-count
// fallback), and a footer with the score. Cells sweep collab, duel, and the
// no-title fallback.
import { CollaborationCard } from 'worldzero-frontend'
import type { PraxisCardOut } from '../../frontend/src/api/praxis'
import { mockCollaboration } from './_fixtures'

const wrap: React.CSSProperties = { padding: 24, display: 'flex', gap: 20, flexWrap: 'wrap' }

/** A named collaboration — the green "collaboration" chip and Everymen tint. */
export function Collaboration() {
  return (
    <div style={wrap}>
      <div style={{ width: 300 }}>
        <CollaborationCard collab={mockCollaboration} />
      </div>
    </div>
  )
}

/** A duel — the danger-tinted "duel" chip and the "view duel" footer link. */
export function Duel() {
  const duel: PraxisCardOut = {
    ...mockCollaboration,
    type: 'duel',
    task_title: 'Wheatpaste an original poem on a condemned wall',
    title: 'Rax Vandal vs. Pip Marigold',
    task_faction_slug: 'snide',
    member_count: 2,
    score: 27,
  }
  return (
    <div style={wrap}>
      <div style={{ width: 300 }}>
        <CollaborationCard collab={duel} />
      </div>
    </div>
  )
}

/** No custom title — the card falls back to the "{label} of N" member-count line. */
export function TitleFallback() {
  const untitled: PraxisCardOut = {
    ...mockCollaboration,
    title: null,
    task_faction_slug: 'ua',
    member_count: 3,
    score: 0,
  }
  return (
    <div style={wrap}>
      <div style={{ width: 300 }}>
        <CollaborationCard collab={untitled} />
      </div>
    </div>
  )
}
