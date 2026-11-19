// @vitest-environment jsdom
/** The contract gate through the real `Layout` + `Onboarding` (#3468): the OAuth return and the unaccepted bounce. */
import { useState, type ReactNode } from 'react'
import { cleanup, render, screen } from '@testing-library/react'
import { MemoryRouter, Navigate, Route, Routes, useLocation } from 'react-router-dom'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import '../../i18n'
import { AuthContext } from '../../auth/AuthContext'
import type { CurrentUser } from '../../api/auth'
import { acceptTerms } from '../../api/terms'
import { onboardingHandoffPending } from '../../utils/onboardingResume'
import Onboarding from '../../pages/Onboarding'
import Layout from '../Layout'

vi.mock('../../api/terms', () => ({ acceptTerms: vi.fn() }))
vi.mock('../../api/auth', () => ({ loginWith: () => {} }))
vi.mock('../../hooks/useFormFactor', () => ({ useFormFactor: () => 'desktop' }))
vi.mock('../backdrop/BackdropContext', () => ({ BackdropProvider: ({ children }: { children: ReactNode }) => children }))
vi.mock('../backdrop/FactionBackdrop', () => ({ default: () => null }))
vi.mock('../LevelUpWatcher', () => ({ default: () => null }))
vi.mock('../InvitationWatcher', () => ({ default: () => null }))
vi.mock('../NavBar', () => ({ default: () => null }))
vi.mock('../layout/MobileHeader', () => ({ default: () => null }))
vi.mock('../layout/MobileTabBar', () => ({ default: () => null }))
vi.mock('../layout/Sidebar', () => ({ default: () => null, panelStyle: {} }))
vi.mock('../layout/SiteFooter', () => ({ default: () => null }))
vi.mock('../../utils/onboardingHandoff', () => ({ resolveHandoffDestination: async () => '/', resolveHandoffTask: async () => undefined }))

const noAcceptance = { account_id: 1, character: null, has_accepted_terms: false, is_admin: false } as unknown as CurrentUser

function Where() {
  return <span data-testid="where">{useLocation().pathname}</span>
}

/** `refetch` adopts the acceptance, as `/auth/me` would after the row is written. */
function App({ user, at }: { user: CurrentUser; at: string }) {
  const [me, setMe] = useState(user)
  const refetch = async () => setMe((u) => ({ ...u, has_accepted_terms: true }))
  return (
    <MemoryRouter initialEntries={[at]}>
      <AuthContext.Provider value={{ user: me, loading: false, refetch, applyUser: () => {}, signOut: async () => {} }}>
        <Layout>
          <Where />
          <Routes>
            {/* RootLanding's resume, without App's chunk graph. */}
            <Route path="/" element={onboardingHandoffPending() ? <Navigate to="/start" replace /> : null} />
            <Route path="/start" element={<Onboarding />} />
            <Route path="*" element={null} />
          </Routes>
        </Layout>
      </AuthContext.Provider>
    </MemoryRouter>
  )
}

let store: Map<string, string>
beforeEach(() => {
  store = new Map()
  vi.stubGlobal('sessionStorage', {
    getItem: (k: string) => store.get(k) ?? null,
    setItem: (k: string, v: string) => store.set(k, v),
    removeItem: (k: string) => store.delete(k),
  })
  vi.stubGlobal('matchMedia', () => ({ matches: true, addEventListener: () => {}, removeEventListener: () => {} }))
  vi.stubGlobal('scrollTo', () => {})
  window.scrollTo = () => {}
  vi.mocked(acceptTerms).mockReset().mockResolvedValue({} as never)
})
afterEach(() => {
  cleanup()
  vi.unstubAllGlobals()
})

describe('Layout with the contract', () => {
  it('OAuth return: posts the held click once on /start, clears it, then creates the character inside the flow', async () => {
    store.set('wz_onboarding_handoff', 'true')
    store.set('wz_terms_accepted', 'true')
    render(<App user={noAcceptance} at="/" />)

    expect(await screen.findByPlaceholderText(/character name/i)).toBeTruthy()
    expect(screen.getByTestId('where').textContent).toBe('/start')
    expect(acceptTerms).toHaveBeenCalledTimes(1)
    expect(store.has('wz_terms_accepted')).toBe(false)
  })

  it('a signed-in account with no acceptance is sent to the contract from anywhere else', async () => {
    render(<App user={noAcceptance} at="/tasks" />)

    expect(await screen.findByTestId('onboarding-accept-terms')).toBeTruthy()
    expect(screen.getByTestId('where').textContent).toBe('/start')
    expect(acceptTerms).not.toHaveBeenCalled()
  })

  it('header sign-in return (no mark): a new account lands on the contract, not / or creation', async () => {
    render(<App user={noAcceptance} at="/" />)

    expect(await screen.findByTestId('onboarding-accept-terms')).toBeTruthy()
    expect(screen.getByTestId('where').textContent).toBe('/start')
  })

  it('header sign-in return: a returning player with a character stays on /', () => {
    const player = { ...noAcceptance, character: { id: 1 }, has_accepted_terms: true } as unknown as CurrentUser
    render(<App user={player} at="/" />)

    expect(screen.getByTestId('where').textContent).toBe('/')
  })

  it('direct /characters/create without acceptance goes to the contract', async () => {
    render(<App user={noAcceptance} at="/characters/create" />)

    expect(await screen.findByTestId('onboarding-accept-terms')).toBeTruthy()
  })

  it('a signed-in cold /start stays and runs the full flow from the title', () => {
    render(<App user={noAcceptance} at="/start" />)

    expect(screen.getByTestId('onboarding-start')).toBeTruthy()
    expect(screen.getByTestId('where').textContent).toBe('/start')
  })

  it('an accepted character-less account still reaches /characters/create', () => {
    render(<App user={{ ...noAcceptance, has_accepted_terms: true }} at="/characters/create" />)

    expect(screen.getByTestId('where').textContent).toBe('/characters/create')
  })
})
