/**
 * #2354: the nav's character name leads to `/characters/{id}`, like the rail's.
 * The no-character branch shares the same ternary, so it is pinned too.
 */
import { renderToStaticMarkup } from 'react-dom/server'
import { MemoryRouter } from 'react-router-dom'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import '../../i18n'
import i18n from '../../i18n'
import type { CurrentUser } from '../../api/auth'

const authMock = vi.fn()
vi.mock('../../auth/AuthContext', () => ({
  useAuth: () => authMock(),
}))

// `useTheme` throws outside its provider (#701); panels are fetched (#1344).
vi.mock('../../hooks/useTheme', () => ({
  useTheme: () => ({ theme: 'light', toggle: () => {} }),
}))
vi.mock('../../hooks/useSidebarPanels', () => ({
  useSidebarPanels: () => ({
    pending_requests_count: 0,
    global_activity: [],
    active_praxes: [],
    refetch: vi.fn(),
    loading: false,
  }),
}))
vi.mock('../../api/auth', () => ({ loginWith: () => {} }))

import NavBar from '../NavBar'

function render(): string {
  return renderToStaticMarkup(
    <MemoryRouter initialEntries={['/tasks']}>
      <NavBar />
    </MemoryRouter>,
  )
}

function signedInAs(character: unknown) {
  return { user: { character } as unknown as CurrentUser, signOut: () => {} }
}

const CARRIED = { id: 42, display_name: 'Mollusk' }

beforeEach(() => {
  authMock.mockReturnValue(signedInAs(CARRIED))
})

describe("the nav's character name leads to the character (#2354)", () => {
  it('points the name at the viewer’s own profile, not at home', () => {
    const html = render()
    // Tolerant: react-router adds `data-discover` after the href.
    expect(html).toMatch(/href="\/characters\/42"[^>]*>Mollusk</)
  })

  it('drops the tooltip that promised a switcher', () => {
    // A literal: the key is deleted, and `t()` of a missing key passes vacuously.
    expect(render()).not.toContain('Your FieldDesk')
  })

  it('still offers an account playing nobody its first character', () => {
    authMock.mockReturnValue(signedInAs(null))
    const html = render()
    expect(html).toContain('href="/characters/create"')
    expect(html).toContain(i18n.t('common:nav.createCharacter'))
  })
})
