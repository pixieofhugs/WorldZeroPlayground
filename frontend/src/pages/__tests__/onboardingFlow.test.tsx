// @vitest-environment jsdom
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import i18n, { loadOnboardingCopy } from '../../i18n'
import onboarding from '../../locales/en/onboarding.json'
import OnboardingFlow from '../onboarding/OnboardingFlow'

vi.mock('../../auth/AuthContext', () => ({ useAuth: () => ({ user: null, loading: false, refetch: vi.fn() }) }))
vi.mock('../onboarding/beats', () => ({ BEATS: Array.from({ length: 7 }, () => () => null) }))

const SEEN = 'wz-onboarding-title-seen'
const mount = () => render(<MemoryRouter><OnboardingFlow resumed={false} onAccepted={() => {}} /></MemoryRouter>)
const headline = () => document.querySelector('.ob-h1')!.textContent
const lineText = () => document.querySelector('.ob-line-text')!.textContent
const typed = () => act(() => vi.advanceTimersByTimeAsync(2800 + 84 * onboarding.flow.welcome.length + 100))

beforeEach(async () => {
  await loadOnboardingCopy()
  await i18n.changeLanguage('en')
  localStorage.clear()
  window.scrollTo = vi.fn()
  window.matchMedia = ((q: string) => ({ matches: false, media: q, addEventListener() {}, removeEventListener() {} })) as unknown as typeof window.matchMedia
  vi.useFakeTimers()
})

afterEach(() => {
  cleanup()
  vi.useRealTimers()
  vi.restoreAllMocks()
})

describe('title for a returning visitor (#3563)', () => {
  it('plays the full choreography on a first visit, and remembers it once typed', async () => {
    mount()
    expect(document.querySelector('.ob-quick')).toBeNull()
    expect(headline()).toBe('')
    await typed()
    expect(headline()).toBe(onboarding.flow.welcome)
    expect(localStorage.getItem(SEEN)).toBe('1')
  })

  it('shows the whole title at once, through .ob-quick, on a later load', () => {
    localStorage.setItem(SEEN, '1')
    mount()
    expect(document.querySelector('.ob-quick')).not.toBeNull()
    expect(headline()).toBe(onboarding.flow.welcome)
  })

  it('remembers a START tap before the title has finished', () => {
    mount()
    fireEvent.click(screen.getByTestId('onboarding-start'))
    expect(localStorage.getItem(SEEN)).toBe('1')
  })

  it('gives the full version, without throwing, when storage throws', async () => {
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new Error('blocked')
    })
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('blocked')
    })
    mount()
    expect(document.querySelector('.ob-quick')).toBeNull()
    await typed()
    expect(headline()).toBe(onboarding.flow.welcome)
    fireEvent.click(screen.getByTestId('onboarding-start'))
    expect(screen.getByText('1 / 7')).toBeTruthy()
  })
})

