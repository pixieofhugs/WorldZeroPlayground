// AlbescentComment preview cells — vellum correspondence (ADR-0018). The quietest
// archetype: warm-white letterhead, near-black ink, Cormorant Garamond, a hairline
// rule + embossed monogram. A full faction, so its own component (not the →ua alias).
import { AlbescentComment } from 'worldzero-frontend'
import type { CommentOut } from '../../frontend/src/api/comments'

const wrap: React.CSSProperties = {
  padding: 24,
  display: 'flex',
  flexDirection: 'column',
  gap: 18,
  maxWidth: 460,
}

function albComment(over: Partial<CommentOut>): CommentOut {
  return {
    id: 1,
    praxis_id: 501,
    task_id: null,
    body_text: '',
    is_edited: false,
    created_at: '2026-06-28T09:12:00Z',
    updated_at: '2026-06-28T09:12:00Z',
    author: {
      id: 88,
      username: 'the_quiet_hand',
      display_name: 'The Quiet Hand',
      avatar_url: null,
      faction_slug: 'albescent',
    },
    mentions: [],
    ...over,
  }
}

/** One letter — a spare, gentle reply that shows off the Cormorant body run. */
export function SingleLetter() {
  const comment = albComment({
    body_text:
      'You wrote down only that it happened, and nothing of what was said. That was the right amount to keep.',
  })
  return (
    <div style={wrap}>
      <AlbescentComment mode="row" comment={comment} />
    </div>
  )
}

/** Two letters — a short one and an edited reply with a @mention, both monogrammed. */
export function StackedLetters() {
  const first = albComment({
    id: 1,
    body_text: 'The light going was enough. You did not need to fill it.',
  })
  const second = albComment({
    id: 2,
    body_text: 'When you are ready, @ada_reed, sit with the next one the same way. There is no hurry in this work.',
    is_edited: true,
    created_at: '2026-07-01T15:04:00Z',
    updated_at: '2026-07-01T15:04:00Z',
    mentions: [{ character_id: 7, username: 'ada_reed', display_name: 'Ada Reed' }],
  })
  return (
    <div style={wrap}>
      <AlbescentComment mode="row" comment={first} />
      <AlbescentComment mode="row" comment={second} />
    </div>
  )
}
