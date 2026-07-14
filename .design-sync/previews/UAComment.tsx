// UAComment preview cells — the gilt-salon comment plate (ADR-0026). Gold museum
// frame, Marcellus house line, Playfair-italic byline + body. Author is UA so the
// avatar reads in-house; the chrome is fixed to UA regardless of author.
import { UAComment } from 'worldzero-frontend'
import type { CommentOut } from '../../frontend/src/api/comments'

const wrap: React.CSSProperties = {
  padding: 24,
  display: 'flex',
  flexDirection: 'column',
  gap: 16,
  maxWidth: 460,
}

function uaComment(over: Partial<CommentOut>): CommentOut {
  return {
    id: 1,
    praxis_id: 501,
    task_id: null,
    body_text: '',
    is_edited: false,
    created_at: '2026-06-28T09:12:00Z',
    updated_at: '2026-06-28T09:12:00Z',
    author: {
      id: 7,
      username: 'ada_reed',
      display_name: 'Ada Reed',
      avatar_url: null,
      faction_slug: 'ua',
    },
    mentions: [],
    ...over,
  }
}

/** A single erudite critique — long body exercises the Playfair-italic run. */
export function SingleCritique() {
  const comment = uaComment({
    body_text:
      'The smudged cornice does all the work here — a most disciplined restraint of the hand. One is put in mind of Whistler letting the nocturne go soft at its edges.',
  })
  return (
    <div style={wrap}>
      <UAComment mode="row" comment={comment} />
    </div>
  )
}

/** Two plates stacked — a short remark and an edited reply carrying a @mention. */
export function ThreadedWithMention() {
  const first = uaComment({
    id: 1,
    body_text: 'Exquisite. The east portico has never looked so alive.',
  })
  const second = uaComment({
    id: 2,
    body_text: 'Quite so, @pip_marigold — though I should have fixed the charcoal before the rain.',
    is_edited: true,
    created_at: '2026-07-01T15:04:00Z',
    updated_at: '2026-07-01T15:04:00Z',
    mentions: [{ character_id: 19, username: 'pip_marigold', display_name: 'Pip Marigold' }],
  })
  return (
    <div style={wrap}>
      <UAComment mode="row" comment={first} />
      <UAComment mode="row" comment={second} />
    </div>
  )
}
