// @vitest-environment jsdom
/** `/` through the real `Layout` + `RootLanding` (#3541): a character-less account gets the full flow, never a redirect. */
import { Suspense, type ReactNode } from 'react'
import { cleanup, render, screen } from '@testing-library/react'
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import '../../i18n'
import { AuthContext } from '../../auth/AuthContext'
import type { CurrentUser } from '../../api/auth'
import { acceptTerms } from '../../api/terms'
import { RootLanding } from '../../App'
import Layout from '../Layout'

vi.mock('../../api/terms', () => ({ acceptTerms: vi.fn() }))
vi.mock('../../api/auth', () => ({ loginWith: () => {} }))
vi.mock('../../hooks/useFormFactor', () => ({ useFormFactor: () => 'desktop' }))
vi.mock('../backdrop/BackdropContext', () => ({ BackdropProvider: ({ children }: { children: ReactNode }) => children }))
vi.mock('../backdrop/FactionBackdrop', () => ({ default: () => null }))
vi.mock('../LevelUpWatcher', () => ({ default: () => null }))
vi.mock('../InvitationWatcher', () => ({ default: () => null }))
vi.mock('../NavBar', () => ({ default: () => null }))
vi.mock('../layout/MobileTabBar', () => ({ default: () => null }))
vi.mock('../layout/Sidebar', () => ({ default: () => null, panelStyle: {} }))
vi.mock('../layout/SiteFooter', () => ({ default: () => null }))
vi.mock('../../pages/FieldDesk', () => ({ default: () => <div data-testid="field-desk" /> }))
vi.mock('../../utils/onboardingHandoff', () => ({ resolveHandoffDestination: async () => '/', resolveHandoffTask: async () => undefined }))

const user0 = { account_id: 1, character: null, has_accepted_terms: false, is_admin: false } as unknown as CurrentUser

function Where() {
  return <span data-testid="where">{useLocation().pathname}</span>
}

function App({ user }: { user: CurrentUser }) {
  return (
    <MemoryRouter initialEntries={['/']}>
      <AuthContext.Provider value={{ user, loading: false, refetch: async () => {}, applyUser: () => {}, signOut: async () => {} }}>
        <Layout>
          <Where />
          <Suspense fallback={null}>
            <Routes>
              <Route path="/" element={<RootLanding />} />
              <Route path="*" element={null} />
            </Routes>
          </Suspense>
        </Layout>
      </AuthContext.Provider>
    </MemoryRouter>
  )
}

beforeEach(() => {
  const store = new Map<string, string>()
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

describe('Layout at / (#3541)', () => {
  it.each([true, false])('character-less account (accepted: %s) stays on / at the flow title', async (accepted) => {
    render(<App user={{ ...user0, has_accepted_terms: accepted }} />)

    expect(await screen.findByTestId('onboarding-start')).toBeTruthy()
    expect(screen.getByTestId('where').textContent).toBe('/')
  })

  it('a player with a character gets the Field Desk', async () => {
    render(<App user={{ ...user0, character: { id: 1 }, has_accepted_terms: true } as unknown as CurrentUser} />)

    expect(await screen.findByTestId('field-desk')).toBeTruthy()
    expect(screen.getByTestId('where').textContent).toBe('/')
  })
})
