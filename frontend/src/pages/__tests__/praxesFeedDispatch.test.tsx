/**
 * Praxis-feed form-factor dispatch (#499): phone → mobile stream
 * (`data-feed="mobile"`), desktop → the card list. SSR leaves the feed loading,
 * which is enough to see which surface was picked.
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
    // `PageTitle`'s underline: only the desktop page draws it.
    expect(html).toContain('border-bottom:4px solid var(--faction-default-stop-1)')
  })
})
