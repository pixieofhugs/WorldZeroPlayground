/**
 * #2354 — where the nav's character NAME leads.
 *
 * THE SEAM is the nav's user area: the one always-visible answer to "which
 * character am I playing right now". It was a `NavLink to="/"` — a duplicate of
 * the wordmark two elements to its left, which also goes home — wearing a name
 * and titled with a promise ("switch lives or begin a new one") that the rail's
 * pill used to keep and the home page now keeps instead.
 *
 * A name leads to the person: `/characters/{id}`, the same destination the
 * rail's own name link already has. The tooltip goes with the promise.
 *
 * The signed-in-with-no-character branch is asserted beside it because it shares
 * the ternary this change edits: an account playing nobody must still be offered
 * "create character", pointing where it always did.
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

// `useTheme` throws outside its provider by design (#701), and the panels come
// over the network (#1344); the static renderer supplies neither.
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
    // Matched with a tolerant regex rather than one welded literal: react-router
    // 7 emits `data-discover="true"` on every <Link>, which lands between the
    // href and the `>`. The pairing is still asserted — this anchor's href AND
    // its text — but no longer depends on href being the last attribute.
    expect(html).toMatch(/href="\/characters\/42"[^>]*>Mollusk</)
  })

  it('drops the tooltip that promised a switcher', () => {
    // A LITERAL, not `i18n.t`: the key it came from is deleted, and a negative
    // assertion against a missing key compares the key string the page never
    // contained — passing without looking at anything.
    expect(render()).not.toContain('Your FieldDesk')
  })

  it('still offers an account playing nobody its first character', () => {
    authMock.mockReturnValue(signedInAs(null))
    const html = render()
    expect(html).toContain('href="/characters/create"')
    expect(html).toContain(i18n.t('common:nav.createCharacter'))
  })
})
