// EverymenComment preview cells — dispatch from the floor (ADR-0018). Union-poster
// register: red masthead bar, Bebas display name over a condensed body, paper stock.
import { EverymenComment } from 'worldzero-frontend'
import type { CommentOut } from '../../frontend/src/api/comments'

const wrap: React.CSSProperties = {
  padding: 24,
  display: 'flex',
  flexDirection: 'column',
  gap: 16,
  maxWidth: 460,
}

function evComment(over: Partial<CommentOut>): CommentOut {
  return {
    id: 1,
    praxis_id: 501,
    task_id: null,
    body_text: '',
    is_edited: false,
    created_at: '2026-06-28T09:12:00Z',
    updated_at: '2026-06-28T09:12:00Z',
    author: {
      id: 12,
      username: 'sam_okafor',
      display_name: 'Sam Okafor',
      avatar_url: null,
      faction_slug: 'everymen',
    },
    mentions: [],
    ...over,
  }
}

/** One dispatch — plainspoken solidarity under the red masthead bar. */
export function SingleDispatch() {
  const comment = evComment({
    body_text: 'Twelve neighbors and one shed — that is how it gets done. Count me in for Saturday.',
  })
  return (
    <div style={wrap}>
      <EverymenComment mode="row" comment={comment} />
    </div>
  )
}

/** Two dispatches — an edited short note and a longer one carrying a @mention. */
export function StackedDispatches() {
  const first = evComment({
    id: 1,
    body_text: 'Good work. The lending log out of that old ledger is a nice touch.',
    is_edited: true,
  })
  const second = evComment({
    id: 2,
    body_text:
      'If everyone gets a key, @ada_reed, put me down to run the Saturday open — I can cover the first two shifts and bring the coffee.',
    created_at: '2026-07-01T15:04:00Z',
    updated_at: '2026-07-01T15:04:00Z',
    mentions: [{ character_id: 7, username: 'ada_reed', display_name: 'Ada Reed' }],
  })
  return (
    <div style={wrap}>
      <EverymenComment mode="row" comment={first} />
      <EverymenComment mode="row" comment={second} />
    </div>
  )
}
