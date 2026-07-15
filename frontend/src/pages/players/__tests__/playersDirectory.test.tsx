/**
 * Mobile players directory (#517) — form-factor dispatch + the directory→profile
 * navigation contract. Mirrors the Tasks mobile-browse test: renders <Leaderboard/>
 * with useFormFactor mocked (phone → the Default directory skin, desktop → the
 * existing podium/table board), then renders the Default directory skin directly
 * over controlled rows to pin the scannable list + the /characters/:id links a tap
 * follows to the public profile.
 */
import { renderToStaticMarkup } from 'react-dom/server'
import { MemoryRouter } from 'react-router-dom'
import type { ReactElement } from 'react'
import { describe, it, expect, vi } from 'vitest'
import '../../../i18n'
import type { CharacterOut, CurrentUser } from '../../../api/auth'

const mocks = vi.hoisted(() => ({
  formFactor: 'desktop' as 'mobile' | 'desktop',
}))

vi.mock('../../../hooks/useFormFactor', () => ({
  useFormFactor: () => mocks.formFactor,
}))
vi.mock('../../../auth/AuthContext', () => ({
  useAuth: () => ({ user: null as CurrentUser | null }),
}))
vi.mock('../../../api/leaderboard', () => ({
  getLeaderboard: async () => [],
}))

import Leaderboard from '../../Leaderboard'
import DefaultPlayers from '../mobileArchetypes/DefaultPlayers'

function render(element: ReactElement): { html: string; text: string } {
  const html = renderToStaticMarkup(<MemoryRouter>{element}</MemoryRouter>)
  return { html, text: html.replace(/<[^>]*>/g, '') }
}

function player(overrides: Partial<CharacterOut>): CharacterOut {
  return {
    id: 1,
    username: 'wren',
    display_name: 'Wren',
    bio: null,
    avatar_url: null,
    location: null,
    level: 3,
    score: 320,
    all_time_score: 900,
    faction_slug: 'everymen',
    status: 'active',
    created_at: '2026-01-01T00:00:00Z',
    ...overrides,
  }
}

const PLAYERS: CharacterOut[] = [
  player({ id: 11, display_name: 'Perpetua', faction_slug: 'everymen', score: 2140 }),
  player({ id: 22, display_name: 'Reza', faction_slug: 'ephemerists', score: 1880 }),
  player({ id: 33, display_name: 'Molly', faction_slug: null, score: 340 }),
]

describe('players directory form-factor dispatch', () => {
  it('renders the Default directory skin on mobile', () => {
    mocks.formFactor = 'mobile'
    const { html } = render(<Leaderboard />)
    expect(html).toContain('data-testid="mobile-players-directory"')
  })

  it('renders the desktop podium board on desktop (untouched)', () => {
    mocks.formFactor = 'desktop'
    const { html, text } = render(<Leaderboard />)
    expect(html).not.toContain('data-testid="mobile-players-directory"')
    // PageTitle eyebrow is desktop-only chrome.
    expect(text).toContain('Era I')
  })
})

describe('Default players directory content + navigation', () => {
  it('renders a scannable rank/name/points row per player', () => {
    const { text } = render(
      <DefaultPlayers characters={PLAYERS} loading={false} error={null} myCharId={22} />,
    )
    expect(text).toContain('Perpetua')
    expect(text).toContain('Reza')
    expect(text).toContain('2140')
  })

  it('links every row to its public profile (directory → profile)', () => {
    const { html } = render(
      <DefaultPlayers characters={PLAYERS} loading={false} error={null} myCharId={null} />,
    )
    expect(html).toContain('href="/characters/11"')
    expect(html).toContain('href="/characters/22"')
    expect(html).toContain('href="/characters/33"')
  })

  it('offers a sort chip row + a faction filter chip per present faction', () => {
    const { text } = render(
      <DefaultPlayers characters={PLAYERS} loading={false} error={null} myCharId={null} />,
    )
    const lower = text.toLowerCase()
    expect(lower, 'sort chips').toContain('sort:')
    expect(lower, 'faction chips').toContain('faction:')
    expect(text, 'unaffiliated present').toContain('Unaffiliated')
  })

  it('renders the empty state when no players match', () => {
    const { text } = render(
      <DefaultPlayers characters={[]} loading={false} error={null} myCharId={null} />,
    )
    expect(text).toContain('No players match this filter.')
  })
})
