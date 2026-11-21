// @vitest-environment jsdom
/** Seam: the provider click. The header's sign-in is plain; only the login step marks an onboarding resume. */
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, describe, it, expect, vi } from 'vitest'

import '../../i18n'
import { ONBOARDING_HANDOFF_KEY } from '../../utils/onboardingResume'

const loginWith = vi.fn()
vi.mock('../../api/auth', () => ({ loginWith: (p: string) => loginWith(p) }))

import AuthCard from '../onboarding/AuthCard'
import SignInView from '../onboarding/SignInView'

afterEach(() => {
  cleanup()
  sessionStorage.clear()
  loginWith.mockClear()
})

describe('the sign-in view', () => {
  it('signs in plainly: no onboarding resume is marked', () => {
    render(<SignInView onRestart={() => {}} />, { wrapper: MemoryRouter })
    fireEvent.click(screen.getByTestId('sign-in-discord'))

    expect(loginWith).toHaveBeenCalledWith('discord')
    expect(sessionStorage.getItem(ONBOARDING_HANDOFF_KEY)).toBeNull()
  })

  it('offers both providers and a way back to the start', () => {
    const onRestart = vi.fn()
    render(<SignInView onRestart={onRestart} />, { wrapper: MemoryRouter })
    expect(screen.getByTestId('sign-in-google')).toBeTruthy()
    fireEvent.click(screen.getByTestId('onboarding-restart'))

    expect(onRestart).toHaveBeenCalled()
  })
})

describe('the login card', () => {
  it('marks the resume before it leaves', () => {
    render(
      <MemoryRouter>
        <AuthCard />
      </MemoryRouter>,
    )
    fireEvent.click(screen.getByTestId('sign-in-google'))

    expect(sessionStorage.getItem(ONBOARDING_HANDOFF_KEY)).toBe('true')
  })
})
