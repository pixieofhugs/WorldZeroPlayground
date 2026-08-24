/**
 * #2354 — how many doors the rail's character card holds, and which.
 *
 * THE SEAM is the card's action row: the rendered rail, not the switcher. The
 * `CHARACTERS` pill and the desktop home's roster section are gated on the same
 * `rosterOffersAChoice` predicate over the same roster, so the rail was a second
 * door to a room the home page already opens. It also had a defect of its own:
 * it was the ONLY desktop caller of `CharacterSwitcherSheet`, which is a phone
 * bottom sheet — `position: fixed; bottom: 0`, a 22px top-only radius and a
 * 38x4 drag handle, all unconditional — so on a desktop it drew a full-width
 * phone sheet with a drag handle across the bottom of the window.
 *
 * The pill goes; the `EDIT` pill beside it stays. Both halves are asserted: a
 * deletion test that only says "gone" passes just as well on a card that lost
 * its whole action row.
 *
 * WHY `EDIT` STAYS changed under this test in #2552, though the assertion did
 * not. It used to be "it leads somewhere the home page does not"; the home
 * page's roster cards each carry the same door now. What keeps this one is that
 * those cards sit behind `rosterOffersAChoice` — one life and a shut gate, the
 * commonest state there is, draws no roster — so the rail is the door that is
 * always there. Removing it is still a separate call, and still nobody's here.
 *
 * The roster is stubbed OPEN (`can_create_additional_character`), which is the
 * state the pill used to render in — otherwise the absence proves nothing.
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

// Effects never run under `renderToStaticMarkup`; these two would otherwise sit
// at their loading defaults and render a signed-out rail.
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
    // The key survives: all eight mobile field desks still label their trigger
    // with it, so this stays catalog-driven rather than a literal.
    expect(i18n.t('common:sidebar.characterCard.characters'), 'guard: key resolves').toBe('Characters')
    expect(render()).not.toContain(i18n.t('common:sidebar.characterCard.characters'))
  })

  it('mounts no bottom sheet on the desktop rail', () => {
    // `CharacterSwitcherSheet` renders its scrim and panel only while open, so
    // the pill's absence is what this really asserts — the sheet's own
    // phone-only geometry (the drag handle) must reach no desktop.
    const html = render()
    expect(html).not.toContain('22px 22px 0 0')
  })
})
