/** Singularity comment voice — the session transcript (#1202). */
import { renderToStaticMarkup } from 'react-dom/server'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, describe, it, expect, vi } from 'vitest'
import '../../../i18n'
import type { CommentOut } from '../../../api/comments'
import type { CharacterOut } from '../../../api/auth'

const authState = vi.hoisted(() => ({ user: null as unknown }))
vi.mock('../../../auth/AuthContext', () => ({ useAuth: () => authState }))

import SingularityComment from '../voices/SingularityComment'

afterEach(() => {
  authState.user = null
})

const COMMENT: CommentOut = {
  id: 7,
  praxis_id: 1,
  task_id: null,
  body_text: 'signal acquired on the estuary relay',
  is_edited: false,
  created_at: '2026-01-01T00:00:00Z',
  updated_at: '2026-01-01T00:00:00Z',
  author: {
    id: 42,
    username: 'ada',
    display_name: 'Adabel',
    avatar_url: '',
    faction_slug: 'singularity',
  },
  mentions: [],
}

const CHARACTER: CharacterOut = {
  id: 42,
  username: 'ada',
  display_name: 'Adabel',
  avatar_url: '',
  faction_slug: 'singularity',
  bio: '',
  tagline: '',
  location: '',
  level: 3,
  score: 0,
  all_time_score: 0,
  status: 'active',
  created_at: '2026-01-01T00:00:00Z',
  badges: [],
  invitations: [],
}

function row(comment: CommentOut = COMMENT): string {
  return renderToStaticMarkup(
    <MemoryRouter>
      <SingularityComment mode="row" comment={comment} />
    </MemoryRouter>,
  )
}

function composer(submitting: boolean): string {
  return renderToStaticMarkup(
    <MemoryRouter>
      <SingularityComment
        mode="composer"
        character={CHARACTER}
        value=""
        onChange={() => {}}
        onSubmit={() => {}}
        submitting={submitting}
      />
    </MemoryRouter>,
  )
}

describe('SingularityComment — a comment is never archivable', () => {
  it('offers no dismiss control, in either mode', () => {
    // Only update cards are archivable (epic #1192); that lives in `FeedItemSlot`.
    for (const html of [row(), composer(false)]) {
      expect(html).not.toContain('data-feed-archive')
      expect(html).not.toContain('✕')
      expect(html).not.toContain('↺')
    }
  })
})

describe('SingularityComment — the shared behaviours are wired, not rebuilt', () => {
  it('gates the owner row on the shared hover/focus reveal', () => {
    authState.user = { character: { id: COMMENT.author.id } }
    const html = row()
    expect(html).toContain('transition:opacity')
    expect(html).toContain('aria-label="edit"')
    expect(html).toContain('aria-label="delete"')
  })

  it('shows no foot at all to a viewer who owns nothing and cannot flag', () => {
    expect(row()).not.toContain('transition:opacity')
    expect(row()).not.toContain('border-top:1px dashed')
  })

  it('speaks the mention hint in the voice, not the neutral default grey', () => {
    const html = composer(false)
    expect(html).toContain('@')
    expect(html).toContain('var(--faction-singularity-term-dim)')
  })

  it('marks the composer busy while a post is inflight', () => {
    expect(composer(true)).toContain('aria-busy="true"')
    expect(composer(false)).not.toContain('aria-busy="true"')
  })

  it('draws the blink through the shared reduced-motion-guarded class', () => {
    // #1003: an inline `animation:` would bypass `.sg-cursor`'s reduced-motion guard.
    const html = composer(false)
    expect(html).toContain('sg-cursor')
    expect(html).not.toContain('animation:')
  })
})

describe('SingularityComment — the states the sheet draws', () => {
  it('marks an edited comment', () => {
    expect(row()).not.toContain('[edited]')
    expect(row({ ...COMMENT, is_edited: true })).toContain('[edited]')
  })

  it('links a resolved @mention and leaves an unresolved handle as text', () => {
    const html = row({
      ...COMMENT,
      body_text: 'ping @bex and @ghost',
      mentions: [{ username: 'bex', display_name: 'Bex', character_id: 99 }],
    })
    expect(html).toContain('/characters/99')
    expect(html).toContain('@ghost')
  })

  it('draws the comment its own process handle', () => {
    expect(row()).toMatch(/aria-hidden="true"[^>]*>0x007</)
  })
})

describe('SingularityComment — always dark, no hardcoded colour', () => {
  it('carries no hex literal in either mode', () => {
    for (const html of [row(), composer(false)]) {
      expect(html).not.toMatch(/#[0-9a-fA-F]{3,8}\b/)
    }
  })
})
