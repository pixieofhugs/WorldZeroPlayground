/** The praxis feed has no phone twin: both widths mount the shared `PageTitle`. */
import { renderToStaticMarkup } from 'react-dom/server'
import { MemoryRouter } from 'react-router-dom'
import { describe, it, expect, vi } from 'vitest'
import '../../i18n'

const mocks = vi.hoisted(() => ({ formFactor: 'desktop' as 'mobile' | 'desktop', failed: false }))

vi.mock('../../hooks/useFormFactor', () => ({
  useFormFactor: () => mocks.formFactor,
}))
vi.mock('../../api/praxis', () => ({
  listPraxes: async () => [],
}))

vi.mock('../praxes/usePraxes', async (orig) => {
  const real = await orig<typeof import('../praxes/usePraxes')>()
  return { ...real, usePraxes: () => ({ ...real.usePraxes(), ...(mocks.failed && { error: new Error('boom'), loading: false }) }) }
})

import i18n from '../../i18n'
import Praxes from '../Praxes'

function render(): string {
  return renderToStaticMarkup(
    <MemoryRouter>
      <Praxes />
    </MemoryRouter>,
  )
}

describe('praxis feed is one page at every width', () => {
  it.each(['mobile', 'desktop'] as const)('draws the shared PageTitle on %s', (formFactor) => {
    mocks.formFactor = formFactor
    expect(render()).toContain('border-bottom:4px solid var(--faction-default-stop-1)')
  })

  it.each(['mobile', 'desktop'] as const)('load error says try refreshing on %s', (formFactor) => {
    mocks.formFactor = formFactor
    mocks.failed = true
    const out = render().replace('&#x27;', "'")
    mocks.failed = false
    expect(out).toContain(i18n.t('praxis:listPage.loadError'))
    expect(out).toContain(i18n.t('common:states.tryRefreshing'))
  })
})
