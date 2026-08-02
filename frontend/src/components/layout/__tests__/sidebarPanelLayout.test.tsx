/**
 * #1555 — what the rail RENDERS for a given shape.
 *
 * The harness has no DOM, no events and no `localStorage`, so the hook's own
 * decisions are pinned pure next door (`hooks/__tests__/useSidebarPanelLayout`).
 * What is left for this file is the half a resolver test cannot see: the markup
 * each state produces. The hook is mocked so a state can be CHOSEN — under
 * `renderToStaticMarkup` the real one would read no storage and always answer
 * with the default rail, so every case below would be the same case.
 */
import { renderToStaticMarkup } from 'react-dom/server'
import { MemoryRouter } from 'react-router-dom'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import '../../../i18n'
import i18n from '../../../i18n'
import type { CurrentUser } from '../../../api/auth'
import type { SidebarPanelId } from '../../../hooks/useSidebarPanelLayout'

const panelsMock = vi.fn()
vi.mock('../../../hooks/useSidebarPanels', () => ({
  useSidebarPanels: () => panelsMock(),
}))

vi.mock('../../../auth/AuthContext', () => ({
  useAuth: () => ({ user: { account_id: 11, character: null } as unknown as CurrentUser }),
}))
vi.mock('../../../hooks/useGameConfig', () => ({
  useGameConfig: () => null,
}))

const layoutMock = vi.fn()
vi.mock('../../../hooks/useSidebarPanelLayout', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../../hooks/useSidebarPanelLayout')>()
  return { ...actual, useSidebarPanelLayout: () => layoutMock() }
})

import Sidebar from '../Sidebar'

const IN_PROGRESS = i18n.t('common:sidebar.activeTasks.heading')
const RECENT_ACTIVITY = i18n.t('common:sidebar.recentActivity.heading')

function render(
  order: SidebarPanelId[] = ['active-tasks', 'recent-activity'],
  collapsed: SidebarPanelId[] = [],
): string {
  layoutMock.mockReturnValue({
    order,
    isCollapsed: (id: SidebarPanelId) => collapsed.includes(id),
    toggleCollapsed: vi.fn(),
    movePanelOnto: vi.fn(),
    movePanelByStep: vi.fn(),
  })
  return renderToStaticMarkup(
    <MemoryRouter initialEntries={['/']}>
      <Sidebar />
    </MemoryRouter>,
  )
}

beforeEach(() => {
  panelsMock.mockReturnValue({
    pending_requests_count: 0,
    global_activity: [],
    active_praxes: [],
    refetch: vi.fn(),
    loading: false,
  })
})

describe('the order the panels are drawn in', () => {
  it('follows the stored order, not source position', () => {
    const defaultOrder = render()
    expect(defaultOrder.indexOf(IN_PROGRESS)).toBeLessThan(defaultOrder.indexOf(RECENT_ACTIVITY))

    const swapped = render(['recent-activity', 'active-tasks'])
    expect(swapped.indexOf(RECENT_ACTIVITY)).toBeLessThan(swapped.indexOf(IN_PROGRESS))
  })
})

describe('the collapse control', () => {
  it('is a real button that says whether its panel is open', () => {
    const html = render()
    expect(html).toContain(
      `aria-expanded="true" aria-controls="wz-sidebar-panel-active-tasks" aria-label="${i18n.t('common:sidebar.panel.collapse', { panel: IN_PROGRESS })}"`,
    )
  })

  it('flips aria-expanded and the label when the panel is folded', () => {
    const html = render(['active-tasks', 'recent-activity'], ['active-tasks'])
    expect(html).toContain('aria-expanded="false"')
    expect(html).toContain(i18n.t('common:sidebar.panel.expand', { panel: IN_PROGRESS }))
    // The other panel is untouched — collapsing is per panel.
    expect(html).toContain(i18n.t('common:sidebar.panel.collapse', { panel: RECENT_ACTIVITY }))
  })

  /**
   * THE #1343 CONSTRAINT, one level down. Unmounting the rail made reopening it
   * refetch and blink; collapsing a PANEL must not reintroduce that. The proof
   * is that the folded panel's body is still in the markup, behind `hidden`.
   */
  it('hides the body rather than unmounting it', () => {
    const html = render(['active-tasks', 'recent-activity'], ['active-tasks'])
    expect(html).toContain('id="wz-sidebar-panel-active-tasks" hidden')
    // Still rendered: the empty-state copy the panel's body owns.
    expect(html).toContain(i18n.t('common:sidebar.activeTasks.empty'))
  })

  it('leaves the body unhidden when the panel is open', () => {
    const html = render()
    expect(html).toContain('id="wz-sidebar-panel-active-tasks"')
    expect(html).not.toContain('id="wz-sidebar-panel-active-tasks" hidden')
  })
})

describe('the reorder grip', () => {
  it('gives every panel below the card a keyboard-reachable handle', () => {
    const html = render()
    expect(html).toContain(
      i18n.t('common:sidebar.panel.reorder', { panel: IN_PROGRESS, position: 1, total: 2 }),
    )
    expect(html).toContain(
      i18n.t('common:sidebar.panel.reorder', { panel: RECENT_ACTIVITY, position: 2, total: 2 }),
    )
    // Reordering that only works with a mouse is not done: the grip announces
    // the keys that move it.
    expect(html).toContain('aria-keyshortcuts="ArrowUp ArrowDown"')
  })

  it('speaks the seat a panel currently sits in', () => {
    const html = render(['recent-activity', 'active-tasks'])
    expect(html).toContain(
      i18n.t('common:sidebar.panel.reorder', { panel: RECENT_ACTIVITY, position: 1, total: 2 }),
    )
  })
})

describe('the character card', () => {
  it('is pinned above the order, with neither gesture', () => {
    panelsMock.mockReturnValue({
      pending_requests_count: 0,
      global_activity: [],
      active_praxes: [],
      refetch: vi.fn(),
      loading: false,
    })
    const html = render()
    // It is the first thing in the rail and it is not one of the seats: only
    // the two ordered panels carry a grip, so there are exactly two.
    const grips = html.match(/aria-keyshortcuts="ArrowUp ArrowDown"/g) ?? []
    expect(grips).toHaveLength(2)
    // The signed-out placeholder card renders before the first panel.
    expect(html.indexOf(i18n.t('common:sidebar.characterCard.noCharacter'))).toBeLessThan(
      html.indexOf(IN_PROGRESS),
    )
  })
})
