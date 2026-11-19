// @vitest-environment jsdom
/** The contract before sign-in: one consent row per account, none on decline. Seam: `OnboardingFlow` with `acceptTerms` mocked. */
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import '../../i18n'
import { AuthContext } from '../../auth/AuthContext'
import type { CurrentUser } from '../../api/auth'
import { acceptTerms } from '../../api/terms'
import OnboardingFlow from '../onboarding/OnboardingFlow'

vi.mock('../../api/terms', () => ({ acceptTerms: vi.fn() }))
vi.mock('../../api/auth', () => ({ loginWith: () => {} }))

const USER = { account_id: 1, character: { id: 1 }, is_admin: false } as unknown as CurrentUser

function mount(user: CurrentUser | null, resumed: boolean, onAccepted = vi.fn()) {
  render(
    <MemoryRouter>
      <AuthContext.Provider value={{ user, loading: false, refetch: async () => {}, applyUser: () => {}, signOut: async () => {} }}>
        <OnboardingFlow resumed={resumed} onAccepted={onAccepted} />
      </AuthContext.Provider>
    </MemoryRouter>,
  )
  return onAccepted
}

const toContract = () => {
  fireEvent.click(screen.getByTestId('onboarding-start'))
  fireEvent.click(screen.getByTestId('onboarding-skip'))
}

let store: Map<string, string>
beforeEach(() => {
  store = new Map()
  vi.stubGlobal('sessionStorage', {
    getItem: (k: string) => store.get(k) ?? null,
    setItem: (k: string, v: string) => store.set(k, v),
    removeItem: (k: string) => store.delete(k),
  })
  // Reduced motion: no timers between steps.
  vi.stubGlobal('matchMedia', () => ({ matches: true, addEventListener: () => {}, removeEventListener: () => {} }))
  vi.stubGlobal('scrollTo', () => {})
  vi.mocked(acceptTerms).mockReset().mockResolvedValue({} as never)
})
afterEach(() => {
  cleanup()
  vi.unstubAllGlobals()
})

describe('guest round trip', () => {
  it('holds the click at the contract, shows sign-in, and writes one row after the redirect', async () => {
    mount(null, false)
    toContract()
    fireEvent.click(screen.getByTestId('onboarding-accept-terms'))

    await waitFor(() => expect(screen.queryByTestId('onboarding-accept-terms')).toBeNull())
    expect(acceptTerms).not.toHaveBeenCalled()
    expect(store.get('wz_terms_accepted')).toBe('true')

    cleanup()
    const onAccepted = mount(USER, true)
    await waitFor(() => expect(onAccepted).toHaveBeenCalledTimes(1))
    expect(acceptTerms).toHaveBeenCalledTimes(1)
    expect(store.has('wz_terms_accepted')).toBe(false)
  })

  it('shows the contract again after sign-in when storage refused the click', () => {
    mount(USER, true)
    expect(screen.getByTestId('onboarding-accept-terms')).toBeTruthy()
    expect(acceptTerms).not.toHaveBeenCalled()
  })

  it('shows the contract again when the held row fails to write', async () => {
    store.set('wz_terms_accepted', 'true')
    vi.mocked(acceptTerms).mockRejectedValue(new Error('down'))
    const onAccepted = mount(USER, true)

    await screen.findByTestId('onboarding-accept-terms')
    expect(onAccepted).not.toHaveBeenCalled()
  })
})

describe('signed-in path', () => {
  it('a cold open runs the contract and writes exactly one row, with no sign-in card', async () => {
    store.set('wz_terms_accepted', 'true') // stale: must not skip the contract
    const onAccepted = mount(USER, false)
    toContract()
    expect(acceptTerms).not.toHaveBeenCalled()

    fireEvent.click(screen.getByTestId('onboarding-accept-terms'))

    await waitFor(() => expect(onAccepted).toHaveBeenCalledTimes(1))
    expect(acceptTerms).toHaveBeenCalledTimes(1)
  })
})

describe('declining', () => {
  it('writes nothing, lands on Declined, and Reconsider returns to the contract', async () => {
    mount(null, false)
    toContract()
    store.set('wz_terms_accepted', 'true')

    fireEvent.click(screen.getByTestId('onboarding-look-around'))
    expect(await screen.findByText("Unsigned. That's allowed.")).toBeTruthy()
    expect(acceptTerms).not.toHaveBeenCalled()
    expect(store.has('wz_terms_accepted')).toBe(false)

    fireEvent.click(screen.getByTestId('onboarding-reconsider'))
    expect(await screen.findByTestId('onboarding-accept-terms')).toBeTruthy()
  })
})
