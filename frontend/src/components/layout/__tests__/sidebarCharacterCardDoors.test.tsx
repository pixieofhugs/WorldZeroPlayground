/**
 * #2354: the rail's character card has no CHARACTERS pill (the desktop home
 * roster is that door, and the pill opened a phone bottom sheet on desktop) but
 * keeps EDIT. Both halves asserted, so losing the whole row fails. The roster is
 * stubbed OPEN, or the absence would prove nothing.
 */
import { renderToStaticMarkup } from 'react-dom/server'
import { MemoryRouter } from 'react-router-dom'
import { describe, it, expect, vi } from 'vitest'
import '../../../i18n'
import i18n from '../../../i18n'
import type { CurrentUser } from '../../../api/auth'

vi.mock('../../../hooks/useSidebarPanels', () => ({
  useSidebarPanels: () => ({
    pending_requests_count: 0,
    global_activity: [],
    active_praxes: [],
    refetch: vi.fn(),
    loading: false,
  }),
}))

vi.mock('../../../auth/AuthContext', () => ({
  useAuth: () => ({
    user: {
      account_id: 9,
      can_create_additional_character: true,
      era_name: 'Era One',
      character: {
        id: 42,
        display_name: 'Mollusk',
        avatar_url: '',
        faction_slug: 'na',
        level: 3,
        score: 120,
        all_time_score: 400,
      },
    } as unknown as CurrentUser,
  }),
}))
vi.mock('../../../hooks/useGameConfig', () => ({
  useGameConfig: () => null,
}))

import Sidebar from '../Sidebar'

function render(): string {
  return renderToStaticMarkup(
    <MemoryRouter initialEntries={['/']}>
      <Sidebar />
    </MemoryRouter>,
  )
}

describe("the rail's character card holds one door, not two (#2354)", () => {
  it('keeps the EDIT pill — the one door a gated-away roster cannot take away', () => {
    expect(i18n.t('common:sidebar.characterCard.edit'), 'guard: key resolves').toBe('Edit')
    const html = render()
    expect(html).toContain('href="/characters/42/edit"')
    expect(html).toContain(i18n.t('common:sidebar.characterCard.edit'))
  })

  it('draws no CHARACTERS pill — the desktop home roster is the one door', () => {
    // Key is live (mobile field desks), so catalog-driven.
    expect(i18n.t('common:sidebar.characterCard.characters'), 'guard: key resolves').toBe('Characters')
    expect(render()).not.toContain(i18n.t('common:sidebar.characterCard.characters'))
  })

  it('mounts no bottom sheet on the desktop rail', () => {
    // The sheet's phone-only top radius must reach no desktop.
    const html = render()
    expect(html).not.toContain('22px 22px 0 0')
  })
})
