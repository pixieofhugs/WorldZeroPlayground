// @vitest-environment jsdom
/**
 * The airport code on a Nearby roster row (#3247, #3299).
 *
 * SEAM: DesktopPlayers / MobilePlayers mounted, the Nearby rail clicked. The
 * rail is component state, so only a mounted render can reach it.
 */
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, describe, expect, it, vi } from 'vitest'
import '../../../i18n'
import type { CharacterOut } from '../../../api/auth'

vi.mock('../../../hooks/useFactions', () => ({ useFactions: () => [] }))
vi.mock('../../../hooks/useTheme', () => ({ useTheme: () => ({ theme: 'dark', toggle: () => {} }) }))

import DesktopPlayers from '../DesktopPlayers'
import MobilePlayers from '../MobilePlayers'
import { NO_RELATIONSHIPS, rankPlayers, type PlayersViewProps } from '../playersData'

function player(id: number, display_name: string, location: string, score: number): CharacterOut {
  return {
    id, username: display_name.toLowerCase(), display_name, bio: '', tagline: '', avatar_url: '',
    location, level: 3, score, all_time_score: score, faction_slug: 'everymen', status: 'active',
    created_at: '2026-01-01T00:00:00Z', badges: [], invitations: [],
  }
}

// Four players so the roster (rank 4 onward) holds the one with the code.
const FIELD = [
  player(1, 'Ada', 'AAA', 400),
  player(2, 'Bea', 'BBB', 300),
  player(3, 'Cy', 'CCC', 200),
  player(4, 'Dov', 'PDX', 100),
]
const props: PlayersViewProps = {
  ranked: rankPlayers(FIELD, 'era'),
  scoreMode: 'era',
  onScoreMode: () => {},
  eyebrow: 'Test',
  myCharId: 1, // signed in: the rail (and so Nearby) is only offered then
  related: { ...NO_RELATIONSHIPS, nearby: new Set(['PDX']) },
  latest: {},
}

// jsdom has no matchMedia (useFormFactor, FilterBar).
vi.stubGlobal('matchMedia', () => ({
  matches: false,
  addEventListener: () => {},
  removeEventListener: () => {},
}))

afterEach(cleanup)

describe.each([
  ['desktop', DesktopPlayers],
  ['mobile', MobilePlayers],
])('%s roster row', (_name, Surface) => {
  it('prints the player code under Nearby and not under Everyone', () => {
    render(<MemoryRouter><Surface {...props} /></MemoryRouter>)
    expect(screen.queryByText('PDX')).toBeNull()
    fireEvent.click(screen.getByText('Nearby'))
    expect(screen.getByText('PDX')).toBeTruthy()
    fireEvent.click(screen.getByText('Everyone'))
    expect(screen.queryByText('PDX')).toBeNull()
  })
})
