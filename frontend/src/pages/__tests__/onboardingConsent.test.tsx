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

describe('which sign-in leaves a resume mark', () => {
  it('the header Sign in is plain; the step after the contract marks the hand-off', () => {
    mount(null, false)
    fireEvent.click(screen.getByTestId('onboarding-header-sign-in'))
    fireEvent.click(screen.getByTestId('sign-in-google'))
    expect(store.has('wz_onboarding_handoff')).toBe(false)

    cleanup()
    mount(null, false)
    toContract()
    fireEvent.click(screen.getByTestId('onboarding-accept-terms'))
    return waitFor(() => expect(screen.getByTestId('sign-in-google')).toBeTruthy()).then(() => {
      fireEvent.click(screen.getByTestId('sign-in-google'))
      expect(store.get('wz_onboarding_handoff')).toBe('true')
    })
  })
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

describe('the welcome flow for a screen reader', () => {
  const onBeat = (n: number) => screen.getByText(`${n} / 7`)

  it('focuses each beat line, and one Next moves to the next beat', () => {
    mount(null, false)
    fireEvent.click(screen.getByTestId('onboarding-start'))
    const first = (document.activeElement as HTMLElement).getAttribute('aria-label')
    expect(first).toMatch(/\S{3}/)
    expect(document.querySelector('[aria-live]')).toBeNull()
    expect(document.querySelector('main')).toBeNull()
    onBeat(1)
    fireEvent.click(document.querySelector('.ob-next')!)
    onBeat(2)
    expect((document.activeElement as HTMLElement).getAttribute('aria-label')).not.toBe(first)
  })

  it('never drops focus to the body: contract takes its heading, Back returns to the beat line', () => {
    mount(null, false)
    fireEvent.click(screen.getByTestId('onboarding-start'))
    for (let i = 0; i < 7; i++) {
      if (document.querySelector('.ob-hold')) fireEvent.click(document.querySelector('.ob-stage button[aria-pressed]')!)
      fireEvent.click(document.querySelector('.ob-next')!)
    }
    expect((document.activeElement as HTMLElement).tagName).toBe('H1')
    fireEvent.click(screen.getByText('Back'))
    expect((document.activeElement as HTMLElement).className).toContain('ob-adv')
    onBeat(7)
  })

  it('keeps one Next label and one press while the line is still typing', () => {
    vi.stubGlobal('matchMedia', () => ({ matches: false, addEventListener: () => {}, removeEventListener: () => {} }))
    mount(null, false)
    fireEvent.click(screen.getByTestId('onboarding-start'))
    expect(document.querySelector('.ob-next')!.textContent).toBe('Next')
    fireEvent.click(document.querySelector('.ob-next')!)
    onBeat(2)
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
