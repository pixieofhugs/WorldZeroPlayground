// EphemeristsComment preview cells — marginalia (ADR-0018). Vellum leaf, engraved
// Cinzel byline, double left margin-rule, rubric drop-cap on the body.
import { EphemeristsComment } from 'worldzero-frontend'
import type { CommentOut } from '../../frontend/src/api/comments'

const wrap: React.CSSProperties = {
  padding: 24,
  display: 'flex',
  flexDirection: 'column',
  gap: 16,
  maxWidth: 480,
}

function ephComment(over: Partial<CommentOut>): CommentOut {
  return {
    id: 1,
    praxis_id: 501,
    task_id: null,
    body_text: '',
    is_edited: false,
    created_at: '2026-06-28T09:12:00Z',
    updated_at: '2026-06-28T09:12:00Z',
    author: {
      id: 31,
      username: 'iris_vale',
      display_name: 'Dr. Iris Vale',
      avatar_url: null,
      faction_slug: 'ephemerists',
    },
    mentions: [],
    ...over,
  }
}

/** One leaf — a scholarly annotation, long enough to show the drop-cap + wrap. */
export function SingleAnnotation() {
  const comment = ephComment({
    body_text:
      'Noted and catalogued. Bench forty-four’s Marguerite appears also in the 1971 parish register; the record holds, and now holds a little longer for your having looked.',
  })
  return (
    <div style={wrap}>
      <EphemeristsComment mode="row" comment={comment} />
    </div>
  )
}

/** Two leaves — a terse verification and an edited follow-up with a @mention. */
export function StackedLeaves() {
  const first = ephComment({
    id: 1,
    body_text: 'Sixty-one benches confirmed against the survey. A clean count.',
  })
  const second = ephComment({
    id: 2,
    body_text:
      'The coordinates for bench twelve are transposed, @ada_reed — else the ledger is impeccable. Filed under river-walk, corrected.',
    is_edited: true,
    created_at: '2026-07-01T15:04:00Z',
    updated_at: '2026-07-01T15:04:00Z',
    mentions: [{ character_id: 7, username: 'ada_reed', display_name: 'Ada Reed' }],
  })
  return (
    <div style={wrap}>
      <EphemeristsComment mode="row" comment={first} />
      <EphemeristsComment mode="row" comment={second} />
    </div>
  )
}
