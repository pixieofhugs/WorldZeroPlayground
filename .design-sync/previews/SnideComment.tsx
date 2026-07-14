// SnideComment preview cells — the ransom dispatch (ADR-0018). Photocopier-black
// card, cut-out author name, scotch tape, acid highlight; body in condensed caps.
import { SnideComment } from 'worldzero-frontend'
import type { CommentOut } from '../../frontend/src/api/comments'

const wrap: React.CSSProperties = {
  padding: 28,
  display: 'flex',
  flexDirection: 'column',
  gap: 22,
  maxWidth: 460,
}

function snideComment(over: Partial<CommentOut>): CommentOut {
  return {
    id: 1,
    praxis_id: 501,
    task_id: null,
    body_text: '',
    is_edited: false,
    created_at: '2026-06-28T09:12:00Z',
    updated_at: '2026-06-28T09:12:00Z',
    author: {
      id: 22,
      username: 'rax_vandal',
      display_name: 'Rax Vandal',
      avatar_url: null,
      faction_slug: 'snide',
    },
    mentions: [],
    ...over,
  }
}

/** One dispatch — cut-out name + short defiant body. */
export function SingleDispatch() {
  const comment = snideComment({
    body_text: 'the wall will outlive the landlord. good work.',
  })
  return (
    <div style={wrap}>
      <SnideComment mode="row" comment={comment} />
    </div>
  )
}

/** Two taped dispatches — an edited jab and a longer one with a @mention. */
export function StackedDispatches() {
  const first = snideComment({
    id: 1,
    body_text: 'still up as of this morning. that is the whole review.',
    is_edited: true,
  })
  const second = snideComment({
    id: 2,
    body_text: 'they sent the sweepers at dawn and missed it, @ada_reed. rent is theft and the poem stays.',
    created_at: '2026-07-01T15:04:00Z',
    updated_at: '2026-07-01T15:04:00Z',
    mentions: [{ character_id: 7, username: 'ada_reed', display_name: 'Ada Reed' }],
  })
  return (
    <div style={wrap}>
      <SnideComment mode="row" comment={first} />
      <SnideComment mode="row" comment={second} />
    </div>
  )
}
