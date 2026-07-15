/**
 * Updates form-factor dispatch (#532) — renders <Updates /> with useFormFactor
 * mocked and pins:
 *   - phone → the single-column mobile activity stream (data-feed="mobile"),
 *   - desktop → the existing filter-tab feed (its "Updates" title, no marker).
 * SSR (renderToStaticMarkup) never runs effects, so the feed sits in its loading
 * state — enough to prove which surface the dispatch selected. getActivityFeed is
 * mocked so no axios call is attempted.
 */
import { renderToStaticMarkup } from 'react-dom/server'
import { MemoryRouter } from 'react-router-dom'
import { describe, it, expect, vi } from 'vitest'
import '../../../i18n'

const mocks = vi.hoisted(() => ({ formFactor: 'desktop' as 'mobile' | 'desktop' }))

vi.mock('../../../hooks/useFormFactor', () => ({
  useFormFactor: () => mocks.formFactor,
}))
vi.mock('../../../api/activityFeed', () => ({
  getActivityFeed: async () => ({
    items: [],
    counts: { all: 0, friends: 0, foes: 0, your_stuff: 0, global_count: 0, requests: 0 },
    next_cursor: null,
  }),
}))

// Imported after the mocks are registered.
import Updates from '../../Updates'

function render(): string {
  return renderToStaticMarkup(
    <MemoryRouter>
      <Updates />
    </MemoryRouter>,
  )
}

describe('Updates form-factor dispatch', () => {
  it('renders the mobile activity stream on mobile', () => {
    mocks.formFactor = 'mobile'
    expect(render()).toContain('data-feed="mobile"')
  })

  it('renders the desktop filter-tab feed on desktop (untouched)', () => {
    mocks.formFactor = 'desktop'
    const html = render()
    expect(html).not.toContain('data-feed="mobile"')
    expect(html.replace(/<[^>]*>/g, '')).toContain('Updates')
  })
})
