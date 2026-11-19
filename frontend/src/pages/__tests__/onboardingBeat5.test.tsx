// @vitest-environment jsdom
import { act, cleanup, fireEvent, render } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, describe, expect, it, vi } from 'vitest'
import '../../i18n'

const mocks = vi.hoisted(() => ({ castVote: vi.fn(async () => ({}) as unknown) }))

vi.mock('../../auth/AuthContext', () => ({
  useAuth: () => ({ user: null, loading: false, refetch: async () => {} }),
}))
vi.mock('../../api/votes', () => ({ castVote: mocks.castVote }))
vi.mock('../../hooks/useTheme', () => ({ useTheme: () => ({ theme: 'dark', toggle: () => {} }) }))

import Beat5 from '../onboarding/beats/Beat5'
import OnboardingFlow from '../onboarding/OnboardingFlow'
import { HoldNextContext } from '../onboarding/beats/holdNext'

function mount() {
  const hold = vi.fn()
  const view = render(
    <MemoryRouter>
      <HoldNextContext.Provider value={hold}>
        <Beat5 confidence={0.6} />
      </HoldNextContext.Provider>
    </MemoryRouter>,
  )
  return { hold, view }
}

afterEach(() => {
  cleanup()
  vi.useRealTimers()
  mocks.castVote.mockClear()
})

describe('onboarding beat 5', () => {
  it('gives an anonymous viewer the live control, and a cast sends nothing', async () => {
    const { view } = mount()
    expect(view.container.textContent).not.toMatch(/log in to vote/i)
    const stars = view.container.querySelectorAll('button[aria-pressed]')
    expect(stars).toHaveLength(5)
    await act(async () => {
      fireEvent.click(stars[2])
    })
    expect(view.container.querySelectorAll('button[aria-pressed="true"]').length).toBeGreaterThan(0)
    expect(mocks.castVote).not.toHaveBeenCalled()
  })

  it('holds Next until the player votes, then thanks them', async () => {
    const { hold, view } = mount()
    expect(hold).toHaveBeenLastCalledWith('Vote to continue')
    expect(view.container.textContent).toContain('Your turn: vote on the card')
    await act(async () => {
      fireEvent.click(view.container.querySelectorAll('button[aria-pressed]')[3])
    })
    expect(hold).toHaveBeenLastCalledWith(null)
    expect(view.container.textContent).toContain('You voted 4 of 5')
  })

  it('draws every judge behind the card, hidden until it has landed', () => {
    const { view } = mount()
    const judges = [...view.container.querySelectorAll<HTMLElement>('.judge')]
    expect(judges).toHaveLength(4)
    const card = view.container.querySelector('.toss')!
    for (const judge of judges) expect(judge.compareDocumentPosition(card) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
    for (const judge of judges) expect(Number.parseFloat(judge.style.getPropertyValue('--dl'))).toBeGreaterThanOrEqual(0.9)
  })

  it('adds each judge to the tally as they land', () => {
    vi.useFakeTimers()
    const { view } = mount()
    expect(view.container.textContent).toContain('30')
    act(() => {
      vi.advanceTimersByTime(10_000)
    })
    expect(view.container.textContent).toContain('47')
  })
})

describe('onboarding flow stage a11y', () => {
  it('keeps the vote reachable in beat 5, castable by keyboard, and every other stage hidden', async () => {
    window.matchMedia = ((q: string) => ({ matches: true, media: q, addEventListener() {}, removeEventListener() {} })) as never
    const { container, getByTestId } = render(
      <MemoryRouter>
        <OnboardingFlow resumed={false} onAccepted={() => {}} />
      </MemoryRouter>,
    )
    const stage = () => container.querySelector('.ob-stage')!
    fireEvent.click(getByTestId('onboarding-start'))
    for (let beat = 1; beat <= 4; beat++) {
      expect(stage().getAttribute('aria-hidden')).toBe('true')
      expect(container.querySelector('.swing')?.hasAttribute('inert') ?? true).toBe(true)
      fireEvent.click(container.querySelector('.ob-next')!)
    }
    expect(stage().closest('[aria-hidden="true"]')).toBeNull()
    const star = stage().querySelector<HTMLElement>('button[aria-pressed]')!
    expect(star.closest('[aria-hidden="true"]')).toBeNull()
    expect(container.querySelector('.ob-hold')).not.toBeNull()
    star.focus()
    fireEvent.keyDown(star, { key: 'Enter' })
    fireEvent.click(star)
    expect(container.querySelector('.ob-hold')).toBeNull()
    expect(container.querySelector('.ob-next')).not.toBeNull()
    fireEvent.click(container.querySelector('.ob-next')!)
    expect(stage().getAttribute('aria-hidden')).toBe('true')
  })
})
