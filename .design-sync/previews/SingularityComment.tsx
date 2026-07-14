// SingularityComment preview cells — terminal printout (ADR-0018). Dark, green
// mono, corner brackets, a `>` prompt. Same in light + dark, like the task card.
import { SingularityComment } from 'worldzero-frontend'
import type { CommentOut } from '../../frontend/src/api/comments'

const wrap: React.CSSProperties = {
  padding: 24,
  display: 'flex',
  flexDirection: 'column',
  gap: 16,
  maxWidth: 460,
}

function sgComment(over: Partial<CommentOut>): CommentOut {
  return {
    id: 1,
    praxis_id: 501,
    task_id: null,
    body_text: '',
    is_edited: false,
    created_at: '2026-06-28T09:12:00Z',
    updated_at: '2026-06-28T09:12:00Z',
    author: {
      id: 44,
      username: 'node_44',
      display_name: 'node_44',
      avatar_url: null,
      faction_slug: 'singularity',
    },
    mentions: [],
    ...over,
  }
}

/** One printout — a technical read on the data, showing the `>` prompt + brackets. */
export function SingleReadout() {
  const comment = sgComment({
    body_text:
      'variance converging as expected after day four. recommend sampling pre-caffeine for a cleaner baseline next cycle.',
  })
  return (
    <div style={wrap}>
      <SingularityComment mode="row" comment={comment} />
    </div>
  )
}

/** Two printouts — an edited one-liner and a longer response with a @mention. */
export function StackedReadouts() {
  const first = sgComment({
    id: 1,
    body_text: 'mean 58, rolling avg holding. clean series.',
    is_edited: true,
  })
  const second = sgComment({
    id: 2,
    body_text:
      'attach the raw csv and i will run the autocorrelation, @ada_reed. day-two spike reads like a sensor artifact, not signal.',
    created_at: '2026-07-01T15:04:00Z',
    updated_at: '2026-07-01T15:04:00Z',
    mentions: [{ character_id: 7, username: 'ada_reed', display_name: 'Ada Reed' }],
  })
  return (
    <div style={wrap}>
      <SingularityComment mode="row" comment={first} />
      <SingularityComment mode="row" comment={second} />
    </div>
  )
}
