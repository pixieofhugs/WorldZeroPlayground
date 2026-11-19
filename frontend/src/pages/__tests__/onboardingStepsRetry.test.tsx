// @vitest-environment jsdom
/** A step chunk that fails to load leaves a retry line, not a blank screen. Seam: `OnboardingFlow` with one lazy step module failing once. */
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, describe, expect, it, vi } from 'vitest'

import '../../i18n'
import { AuthContext } from '../../auth/AuthContext'
import OnboardingFlow from '../onboarding/OnboardingFlow'

const chunk = vi.hoisted(() => ({ failing: true }))
vi.mock('../onboarding/TermsCard', async (orig) => {
  if (chunk.failing) {
    chunk.failing = false
    throw new Error('chunk 404')
  }
  return orig()
})
vi.mock('../../api/auth', () => ({ loginWith: () => {} }))

afterEach(cleanup)

describe('a step chunk that fails to load', () => {
  it('shows a retry line, and a tap loads the step', async () => {
    vi.stubGlobal('matchMedia', () => ({ matches: true, addEventListener: () => {}, removeEventListener: () => {} }))
    vi.stubGlobal('scrollTo', () => {})
    render(
      <MemoryRouter>
        <AuthContext.Provider value={{ user: null, loading: false, refetch: async () => {}, applyUser: () => {}, signOut: async () => {} }}>
          <OnboardingFlow resumed={true} onAccepted={vi.fn()} />
        </AuthContext.Provider>
      </MemoryRouter>,
    )
    fireEvent.click(await screen.findByTestId('onboarding-steps-retry'))
    expect(await screen.findByTestId('onboarding-accept-terms')).toBeTruthy()
  })
})
