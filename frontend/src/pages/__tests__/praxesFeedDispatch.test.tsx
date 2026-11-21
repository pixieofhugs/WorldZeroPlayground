/** The praxis feed has no phone twin: both widths mount the shared `PageTitle`. */
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

describe('praxis feed is one page at every width', () => {
  it.each(['mobile', 'desktop'] as const)('draws the shared PageTitle on %s', (formFactor) => {
    mocks.formFactor = formFactor
    expect(render()).toContain('border-bottom:4px solid var(--faction-default-stop-1)')
  })
})
