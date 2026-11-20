// @vitest-environment jsdom
/** A returner (signed in, has a character) can skip; the contract only when its row is on file. Seam: `OnboardingFlow` with a mocked session. */
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import '../../i18n'
import { AuthContext } from '../../auth/AuthContext'
import type { CurrentUser } from '../../api/auth'
import OnboardingFlow from '../onboarding/OnboardingFlow'

vi.mock('../../api/terms', () => ({ acceptTerms: vi.fn() }))
vi.mock('../../api/auth', () => ({ loginWith: () => {} }))
vi.mock('../onboarding/beats', () => ({ BEATS: Array.from({ length: 7 }, () => () => null) }))

const returner = (accepted: boolean) => ({ account_id: 1, character: { id: 1 }, has_accepted_terms: accepted, is_admin: false }) as unknown as CurrentUser
const newcomer = { account_id: 2, character: null, has_accepted_terms: false, is_admin: false } as unknown as CurrentUser

function mount(user: CurrentUser | null, resumed = false) {
  const onAccepted = vi.fn()
  render(
    <MemoryRouter>
      <AuthContext.Provider value={{ user, loading: false, refetch: async () => {}, applyUser: () => {}, signOut: async () => {} }}>
        <OnboardingFlow resumed={resumed} onAccepted={onAccepted} />
      </AuthContext.Provider>
    </MemoryRouter>,
  )
  return onAccepted
}
const skip = () => screen.queryByTestId('onboarding-skip')

beforeEach(() => {
  window.scrollTo = vi.fn()
  localStorage.clear()
})
afterEach(cleanup)

describe('Skip for a returning player', () => {
  it('shows on the title and every beat, and not on the title for a new player', () => {
    mount(returner(true))
    expect(skip()).not.toBeNull()
    fireEvent.click(screen.getByTestId('onboarding-start'))
    expect(skip()).not.toBeNull()
    cleanup()
    mount(newcomer)
    expect(skip()).toBeNull()
  })

  it('leaves the flow from a beat when the contract is on file', () => {
    const onAccepted = mount(returner(true))
    fireEvent.click(screen.getByTestId('onboarding-start'))
    fireEvent.click(skip()!)
    expect(onAccepted).toHaveBeenCalled()
  })

  it('still shows the contract, with Skip, when no row is on file', async () => {
    const onAccepted = mount(returner(false))
    fireEvent.click(screen.getByTestId('onboarding-start'))
    fireEvent.click(skip()!)
    await screen.findByTestId('onboarding-accept-terms')
    expect(onAccepted).not.toHaveBeenCalled()
    expect(skip()).not.toBeNull()
    fireEvent.click(skip()!)
    expect(onAccepted).toHaveBeenCalled()
  })

  it('passes the contract at once after sign-in when the row is on file', async () => {
    const onAccepted = mount(returner(true), true)
    await waitFor(() => expect(onAccepted).toHaveBeenCalled())
    expect(screen.queryByTestId('onboarding-accept-terms')).toBeNull()
  })
})
