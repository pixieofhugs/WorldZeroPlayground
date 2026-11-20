import { renderToStaticMarkup } from 'react-dom/server'
import { MemoryRouter } from 'react-router-dom'
import { describe, it, expect, vi } from 'vitest'
import '../../i18n'

const auth = vi.hoisted(() => ({ user: null as object | null }))
vi.mock('../../auth/AuthContext', () => ({ useAuth: () => ({ user: auth.user }) }))

const Declined = (await import('../onboarding/Declined')).default
const html = () =>
  renderToStaticMarkup(
    <MemoryRouter>
      <Declined />
    </MemoryRouter>,
  )

describe('Declined look-around', () => {
  it('is offered to a guest', () => {
    auth.user = null
    expect(html()).toContain('onboarding-look-around')
  })

  it('is hidden from a signed-in account, whom Layout would bounce back to the contract', () => {
    auth.user = { account_id: 1 }
    expect(html()).not.toContain('onboarding-look-around')
  })
})
