// WowComment preview cells — the `{handle}.exe` window (ADR-0018). Reuses the Wow
// task-card window chrome (title-bar dots, dotted body), handwritten Caveat body.
import { WowComment } from 'worldzero-frontend'
import type { CommentOut } from '../../frontend/src/api/comments'

const wrap: React.CSSProperties = {
  padding: 24,
  display: 'flex',
  flexDirection: 'column',
  gap: 16,
  maxWidth: 460,
}

function wowComment(over: Partial<CommentOut>): CommentOut {
  return {
    id: 1,
    praxis_id: 501,
    task_id: null,
    body_text: '',
    is_edited: false,
    created_at: '2026-06-28T09:12:00Z',
    updated_at: '2026-06-28T09:12:00Z',
    author: {
      id: 19,
      username: 'pip_marigold',
      display_name: 'Pip Marigold',
      avatar_url: null,
      faction_slug: 'wow',
    },
    mentions: [],
    ...over,
  }
}

/** One window — joyful short shout, exercises the title bar + Caveat body. */
export function SingleShout() {
  const comment = wowComment({
    body_text: 'this is SO good it made the dog bark with joy!! more chalk suns immediately please',
  })
  return (
    <div style={wrap}>
      <WowComment mode="row" comment={comment} />
    </div>
  )
}

/** Two windows — an edited note plus a longer one, testing stacked chrome. */
export function StackedWindows() {
  const first = wowComment({
    id: 1,
    body_text: 'the sea monster on the corner is my favorite thing all week!',
    is_edited: true,
  })
  const second = wowComment({
    id: 2,
    body_text:
      'we started with six kids and one very patient dog and somehow finished with a whole rainbow — chalk everywhere, hearts fuller, ten out of ten would festival again',
    created_at: '2026-07-01T15:04:00Z',
    updated_at: '2026-07-01T15:04:00Z',
  })
  return (
    <div style={wrap}>
      <WowComment mode="row" comment={first} />
      <WowComment mode="row" comment={second} />
    </div>
  )
}
