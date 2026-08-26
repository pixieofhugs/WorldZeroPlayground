// AlbescentComment preview cell (#2531) — A PASS-THROUGH REGISTRATION. It
// renders DefaultComment and changes nothing: no class, no colour, no copy, no
// motion. There is nothing to strip, and na is byte-identical — the invariant
// all four of #2531's registrations keep.
//
// WHY A REGISTRATION THAT DRAWS NOTHING NEW EARNS ITS FILE. The manifest is the
// one place that answers "does Albescent dress this?", and until this existed it
// answered by saying nothing — which reads two ways (nothing to re-cut, or
// nobody got to it) with nothing in the tree saying which. A comment leaf is
// also precisely the surface where a tell would be worst: it renders in a
// column beside other players', so any mark here announces membership to a
// reader who was following a thread, not looking at a person (ADR-0027,
// ADR-0048).
//
// ONE CELL: a second would be the na plate again.
import { AlbescentComment } from 'worldzero-frontend'
import type { CommentOut } from '../../frontend/src/api/comments'

const comment: CommentOut = {
  id: 1,
  praxis_id: 501,
  task_id: null,
  body_text:
    'Walked the long way round the reservoir for this one. The light was gone by the time I got the last frame, which turned out to be the frame.',
  is_edited: false,
  created_at: '2026-08-19T09:12:00Z',
  updated_at: '2026-08-19T09:12:00Z',
  author: {
    id: 31,
    username: 'quiet_hand',
    display_name: 'Quiet Hand',
    avatar_url: '',
    faction_slug: 'albescent',
  },
  mentions: [],
}

export function IndistinguishableFromNa() {
  return (
    <div style={{ padding: 24, maxWidth: 460, background: 'var(--color-bg-page)' }}>
      <AlbescentComment mode="row" comment={comment} />
    </div>
  )
}
