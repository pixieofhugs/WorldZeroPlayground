/**
 * CommentThread's seed-vs-fetch decision (#1281).
 *
 * The comments request used to start only once the thread MOUNTED, which is
 * behind a render gate on both detail pages — so it could not leave until the
 * page's own data had landed, one full round trip late. The fix hoists the
 * fetch into the page hook's existing `Promise.all` and hands the rows down as
 * a seed; the thread keeps its own fetch for every bare mount.
 *
 * This harness renders to static markup and runs NO effects (SPEC-testing.md),
 * which is exactly why it can prove the seam: rows that appear in the first
 * render cannot have come from the component's own fetch, and a thread showing
 * only "Loading…" is one that is waiting on that fetch.
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
    avatar_url: null,
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
    // `[]` is a real answer — the page asked and the target has no comments.
    const html = render([])
    expect(html, 'no spinner for an answered thread').not.toContain('Loading…')
    expect(html).toContain('0 comments')
  })

  it('still fetches for itself when mounted bare', () => {
    // Every other mount site passes no seed and must keep working unchanged:
    // no rows in the static render, and the loading state its own effect clears.
    expect(render(), 'waiting on its own fetch').toContain('Loading…')
    expect(render(null), 'an explicitly absent seed is the same').toContain('Loading…')
  })
})
