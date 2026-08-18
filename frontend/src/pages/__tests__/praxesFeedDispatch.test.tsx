/**
 * Praxis-feed form-factor dispatch (#499) — renders <Praxes /> with useFormFactor
 * mocked and pins:
 *   - phone → the single-column mobile proof stream (data-feed="mobile"),
 *   - desktop → the existing wrapped card list (its `PageTitle`, no mobile marker).
 * SSR (renderToStaticMarkup) never runs effects, so the feed sits in its loading
 * state — enough to prove which surface the dispatch selected. listPraxes is
 * mocked so no request is attempted.
 */
import { renderToStaticMarkup } from 'react-dom/server'
import { MemoryRouter } from 'react-router-dom'
import { describe, it, expect, vi } from 'vitest'
import '../../i18n'

const mocks = vi.hoisted(() => ({ formFactor: 'desktop' as 'mobile' | 'desktop' }))

vi.mock('../../hooks/useFormFactor', () => ({
  useFormFactor: () => mocks.formFactor,
}))
vi.mock('../../api/praxis', () => ({
  listPraxes: async () => [],
}))

// Imported after the mocks are registered.
import Praxes from '../Praxes'

function render(): string {
  return renderToStaticMarkup(
    <MemoryRouter>
      <Praxes />
    </MemoryRouter>,
  )
}

describe('praxis-feed form-factor dispatch', () => {
  it('renders the mobile proof stream on mobile', () => {
    mocks.formFactor = 'mobile'
    expect(render()).toContain('data-feed="mobile"')
  })

  it('renders the desktop card list on desktop (untouched)', () => {
    mocks.formFactor = 'desktop'
    const html = render()
    expect(html).not.toContain('data-feed="mobile"')
    // `PageTitle`'s per-letter underline, which only the desktop page draws —
    // the mobile stream rolls its own <h1>. It used to be the intro copy, and
    // that line is deleted (#2262); the count is no discriminator either, since
    // the shared filter bar now prints it on both surfaces.
    expect(html).toContain('border-bottom:4px solid var(--faction-default-stop-1)')
  })
})
