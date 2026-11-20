// @vitest-environment jsdom
/** The MOD menu and the mod-mode strip (#3666). */
import { Suspense } from 'react'
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import '../../../i18n'
import { AdminModeProvider, ADMIN_MODE_STORAGE_KEY } from '../../../auth/AdminModeContext'
import { useAdminMode } from '../../../auth/AdminModeContext'
import NavBar from '../../NavBar'
import ModStrip from '../ModStrip'

let user: { is_admin: boolean; character: null } | null = null
vi.mock('../../../auth/AuthContext', () => ({ useAuth: () => ({ user }) }))
vi.mock('../../../hooks/useSidebarPanels', () => ({ useSidebarPanels: () => ({ pending_requests_count: 0 }) }))
vi.mock('../../../api/copy', () => ({ putCopyOverride: vi.fn(), deleteCopyOverride: vi.fn() }))
const adminApi = vi.hoisted(() => ({
  getFlaggedPraxes: vi.fn(),
  getFlaggedComments: vi.fn(),
  getMessages: vi.fn(),
  getPendingTasks: vi.fn(),
  getOverview: vi.fn(),
}))
vi.mock('../../../api/admin', () => adminApi)

const store = new Map<string, string>()
function Mode() {
  return <output data-testid="mode">{String(useAdminMode().adminMode)}</output>
}
const mount = () =>
  render(
    <MemoryRouter>
      <AdminModeProvider>
        <Suspense fallback={null}>
          <NavBar />
        </Suspense>
        <Mode />
      </AdminModeProvider>
    </MemoryRouter>,
  )

beforeEach(() => {
  store.clear()
  vi.stubGlobal('localStorage', {
    getItem: (k: string) => store.get(k) ?? null,
    setItem: (k: string, v: string) => void store.set(k, v),
  })
  vi.stubGlobal('matchMedia', () => ({ matches: false, addEventListener() {}, removeEventListener() {} }))
  adminApi.getFlaggedPraxes.mockResolvedValue([{}, {}])
  adminApi.getFlaggedComments.mockResolvedValue([{}])
  adminApi.getMessages.mockResolvedValue([{}])
  adminApi.getPendingTasks.mockResolvedValue([{}, {}, {}])
  adminApi.getOverview.mockResolvedValue({ praxis: 0, active_tasks: 0, accounts: 0 })
})
afterEach(() => {
  cleanup()
  vi.unstubAllGlobals()
  vi.clearAllMocks()
})

describe('the MOD menu', () => {
  it('shows a player nothing and never fetches the counts', async () => {
    user = { is_admin: false, character: null }
    mount()
    await new Promise((r) => setTimeout(r, 30))
    expect(screen.queryByRole('button', { name: /mod/i })).toBeNull()
    expect(screen.queryByText('Admin')).toBeNull()
    expect(adminApi.getFlaggedPraxes).not.toHaveBeenCalled()
  })

  it('badges reports + messages + proposals, with no ADMIN link beside the nav', async () => {
    user = { is_admin: true, character: null }
    mount()
    const button = await screen.findByRole('button', { name: 'Mod, 7 waiting' })
    expect(button.getAttribute('aria-haspopup')).toBe('menu')
    expect(button.getAttribute('aria-expanded')).toBe('false')
    expect(screen.queryByRole('link', { name: 'Admin' })).toBeNull()
  })

  it('toggles mod mode from the switch and opens /admin from the link', async () => {
    user = { is_admin: true, character: null }
    mount()
    fireEvent.click(await screen.findByRole('button', { name: /^Mod/ }))
    const sw = screen.getByRole('menuitemcheckbox', { name: /Edit on the page/ })
    expect(sw.getAttribute('aria-checked')).toBe('false')
    fireEvent.click(sw)
    expect(screen.getByTestId('mode').textContent).toBe('true')
    expect(store.get(ADMIN_MODE_STORAGE_KEY)).toBe('true')
    expect(screen.getByRole('menuitem', { name: /Open admin/ }).getAttribute('href')).toBe('/admin')
  })

  it('closes on Escape and gives focus back to the button', async () => {
    user = { is_admin: true, character: null }
    mount()
    const button = await screen.findByRole('button', { name: /^Mod/ })
    fireEvent.click(button)
    await waitFor(() => expect(document.activeElement?.getAttribute('role')).toBe('menuitemcheckbox'))
    fireEvent.keyDown(document.activeElement!, { key: 'Escape' })
    expect(screen.queryByRole('menu')).toBeNull()
    expect(document.activeElement).toBe(button)
  })

  it('closes on an outside click', async () => {
    user = { is_admin: true, character: null }
    mount()
    fireEvent.click(await screen.findByRole('button', { name: /^Mod/ }))
    fireEvent.pointerDown(document.body)
    expect(screen.queryByRole('menu')).toBeNull()
  })
})

describe('the mod-mode strip', () => {
  it('Turn off is the same as the switch, and the copy editor lives in the strip', () => {
    store.set(ADMIN_MODE_STORAGE_KEY, 'true')
    render(
      <AdminModeProvider>
        <ModStrip />
        <Mode />
      </AdminModeProvider>,
    )
    const strip = document.querySelector('.mod-strip')!
    expect(strip.textContent).toContain("Mod mode: you're editing the page")
    expect(strip.contains(screen.getByText('edit copy'))).toBe(true)
    expect(document.documentElement.hasAttribute('data-mod-strip')).toBe(true)
    fireEvent.click(screen.getByRole('button', { name: 'Turn off' }))
    expect(screen.getByTestId('mode').textContent).toBe('false')
  })
})
