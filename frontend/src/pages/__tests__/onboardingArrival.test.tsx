// @vitest-environment jsdom
/** Character step and arrival inside the flow. Seam: `OnboardingFlow` with the API clients mocked. */
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import '../../i18n'
import { AuthContext } from '../../auth/AuthContext'
import type { CurrentUser } from '../../api/auth'
import { createCharacter } from '../../api/characters'
import { listTasks } from '../../api/tasks'
import { makeTask } from '../onboarding/fixtures'
import { firstLevelAway } from '../onboarding/Arrival'
import { hatForName } from '../onboarding/hatForName'
import OnboardingFlow from '../onboarding/OnboardingFlow'

vi.mock('../../api/terms', () => ({ acceptTerms: vi.fn().mockResolvedValue({}) }))
vi.mock('../../api/auth', () => ({ loginWith: () => {} }))
vi.mock('../../api/me', () => ({ getInvitedFactions: async () => [] }))
vi.mock('../../api/characters', () => ({ createCharacter: vi.fn(), uploadCharacterAvatar: vi.fn() }))
vi.mock('../../api/tasks', () => ({ listTasks: vi.fn() }))
vi.mock('../../api/gameConfig', () => ({
  getGameConfig: async () => ({
    era_name: 'e',
    era_id: 1,
    level_thresholds: [0, 10, 70],
    level_profiles: [{ rank_key: '', unlocks: [] }, { rank_key: 'trailhead', unlocks: [] }],
  }),
}))

const USER = { account_id: 1, character: null, is_admin: false } as unknown as CurrentUser

beforeEach(() => {
  vi.stubGlobal('sessionStorage', { getItem: () => null, setItem: () => {}, removeItem: () => {} })
  vi.stubGlobal('matchMedia', () => ({ matches: true, addEventListener: () => {}, removeEventListener: () => {} }))
  vi.stubGlobal('scrollTo', () => {})
  vi.mocked(createCharacter).mockReset().mockResolvedValue({ id: 5, display_name: 'King Biscuit' } as never)
  vi.mocked(listTasks).mockReset().mockResolvedValue([makeTask({ id: 42, title: 'First light', point_value: 10, start_here: true, primary_faction_slug: 'na' })])
})
afterEach(() => {
  cleanup()
  vi.unstubAllGlobals()
})

describe('character then arrival', () => {
  it('a player with no character creates one here and lands on a linked, unclaimed first task', async () => {
    const onAccepted = vi.fn()
    render(
      <MemoryRouter>
        <AuthContext.Provider value={{ user: USER, loading: false, refetch: async () => {}, applyUser: () => {}, signOut: async () => {} }}>
          <OnboardingFlow resumed={false} onAccepted={onAccepted} />
        </AuthContext.Provider>
      </MemoryRouter>,
    )
    fireEvent.click(screen.getByTestId('onboarding-start'))
    fireEvent.click(screen.getByTestId('onboarding-skip'))
    fireEvent.click(screen.getByTestId('onboarding-accept-terms'))

    const name = await screen.findByPlaceholderText(/name/i)
    expect(onAccepted).not.toHaveBeenCalled()
    fireEvent.change(name, { target: { value: 'King Biscuit' } })
    fireEvent.click(await screen.findByRole('button', { name: /create|begin|born/i }))

    expect(await screen.findByText('King Biscuit has entered World Zero.')).toBeTruthy()
    await waitFor(() => expect(screen.getByText(/Level 1 is one praxis away/)).toBeTruthy())
    expect(document.querySelector('a[href="/tasks/42"]')).toBeTruthy()
    // The only task call is the read that finds the card.
    expect(vi.mocked(listTasks)).toHaveBeenCalledTimes(1)
  })

  it('Back from arrival never shows the creation form again', async () => {
    render(
      <MemoryRouter>
        <AuthContext.Provider value={{ user: USER, loading: false, refetch: async () => {}, applyUser: () => {}, signOut: async () => {} }}>
          <OnboardingFlow resumed={false} onAccepted={vi.fn()} />
        </AuthContext.Provider>
      </MemoryRouter>,
    )
    fireEvent.click(screen.getByTestId('onboarding-start'))
    fireEvent.click(screen.getByTestId('onboarding-skip'))
    fireEvent.click(screen.getByTestId('onboarding-accept-terms'))
    fireEvent.change(await screen.findByPlaceholderText(/name/i), { target: { value: 'King Biscuit' } })
    fireEvent.click(await screen.findByRole('button', { name: /create|begin|born/i }))
    await screen.findByText('King Biscuit has entered World Zero.')

    fireEvent.click(screen.getByRole('button', { name: /back/i }))
    await waitFor(() => expect(screen.queryByText('King Biscuit has entered World Zero.')).toBeNull())
    expect(screen.queryByPlaceholderText(/name/i)).toBeNull()
    expect(vi.mocked(createCharacter)).toHaveBeenCalledTimes(1)
  })
})

describe('arrival copy', () => {
  it('derives the level and praxis count from the era, not literals', () => {
    const profiles = [{ rank_key: '', unlocks: [] }, { rank_key: 'a', unlocks: [] }]
    expect(firstLevelAway(profiles, [0, 10], 10)).toEqual({ level: 1, count: 1 })
    expect(firstLevelAway(profiles, [0, 25], 10)).toEqual({ level: 1, count: 3 })
    expect(firstLevelAway([], [0, 10], 10)).toBeNull()
  })
  it('wears the hat whose word is in the name', () => {
    expect(hatForName('King Biscuit')).toBe('crown')
    expect(hatForName('Wizard Wobblewand')).toBe('wizard')
    expect(hatForName('Agent Teacup')).toBe('teacup')
    expect(hatForName('Pixie')).toBeUndefined()
  })
})
