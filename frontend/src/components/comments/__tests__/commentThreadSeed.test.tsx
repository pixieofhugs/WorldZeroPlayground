/**
 * CommentThread's seed-vs-fetch decision (#1281). Static markup runs no effects,
 * so first-render rows can only have come from the seed.
 */
import { renderToStaticMarkup } from 'react-dom/server'
import { MemoryRouter } from 'react-router-dom'
import { describe, it, expect } from 'vitest'
import '../../../i18n'
import type { CommentOut } from '../../../api/comments'
import CommentThread from '../CommentThread'

const COMMENT: CommentOut = {
  id: 7,
  praxis_id: 1,
  task_id: null,
  body_text: 'seedlings along the estuary',
  is_edited: false,
  created_at: '2026-01-01T00:00:00Z',
  updated_at: '2026-01-01T00:00:00Z',
  author: {
    id: 42,
    username: 'ada',
    display_name: 'Adabel',
    avatar_url: '',
    faction_slug: 'na',
  },
  mentions: [],
}

function render(seed?: CommentOut[] | null): string {
  return renderToStaticMarkup(
    <MemoryRouter>
      <CommentThread target="praxes" targetId={1} seed={seed} />
    </MemoryRouter>,
  )
}

describe('CommentThread — seeded by the page, or fetching for itself', () => {
  it('paints seeded rows in the first render, with no fetch to wait on', () => {
    const html = render([COMMENT])
    expect(html, 'the seeded row').toContain('seedlings along the estuary')
    expect(html, 'nothing left to wait for').not.toContain('Loading…')
    expect(html, 'the count comes off the seeded rows').toContain('1 comment')
  })

  it('treats an empty seed as an answered thread, not an unloaded one', () => {
    const html = render([])
    expect(html, 'no spinner for an answered thread').not.toContain('Loading…')
    expect(html).toContain('0 comments')
  })

  it('still fetches for itself when mounted bare', () => {
    expect(render(), 'waiting on its own fetch').toContain('Loading…')
    expect(render(null), 'an explicitly absent seed is the same').toContain('Loading…')
  })
})
