// @vitest-environment jsdom
/**
 * Every protected route warms the chunk it renders (#1483). Renders `App` at
 * each guarded path with the pages mocked to a string, then checks the guard's
 * `warm` loader resolves to the very module whose component painted.
 */
import { render, screen } from '@testing-library/react'
import { MemoryRouter, Outlet } from 'react-router-dom'
import { describe, it, expect, vi } from 'vitest'

import App from '../../App'

type Warm = () => Promise<{ default: () => string }>
const seen = vi.hoisted(() => ({ warm: undefined as unknown }))

vi.mock('../ProtectedRoute', () => ({
  default: ({ warm, children }: { warm?: unknown; children: React.ReactNode }) => {
    seen.warm = warm
    return children
  },
}))
vi.mock('../AuthContext', () => ({
  useAuth: () => ({ user: null, loading: false }),
  hadSessionLastVisit: () => false,
}))
vi.mock('../AdminModeContext', () => ({ useAdminMode: () => ({ adminMode: false }) }))
vi.mock('../../components/Layout', () => ({ default: ({ children }: { children: React.ReactNode }) => children }))
vi.mock('../../pages/EditPraxis', () => ({ default: () => 'EditPraxis' }))
vi.mock('../../pages/EditCharacter', () => ({ default: () => 'EditCharacter' }))
vi.mock('../../pages/Updates', () => ({ default: () => 'Updates' }))
vi.mock('../../pages/Settings', () => ({ default: () => 'Settings' }))
vi.mock('../../pages/Admin', () => ({ default: () => <Outlet /> }))
vi.mock('../../pages/admin/consolePages', () => ({ ReportsPage: () => 'ReportsPage' }))
vi.mock('../../pages/admin/FactionCopySheet', () => ({ default: () => 'FactionCopySheet' }))
vi.mock('../../pages/admin/LevelUpCopySheet', () => ({ default: () => 'LevelUpCopySheet' }))
vi.mock('../../pages/admin/TauntCopySheet', () => ({ default: () => 'TauntCopySheet' }))
vi.mock('../../pages/CreateCharacter', () => ({ default: () => 'CreateCharacter' }))
vi.mock('../../pages/ProposeTask', () => ({ default: () => 'ProposeTask' }))

const GUARDED: [path: string, page: string][] = [
  ['/praxis/1/edit', 'EditPraxis'],
  ['/characters/1/edit', 'EditCharacter'],
  ['/updates', 'Updates'],
  ['/settings', 'Settings'],
  ['/admin/reports', 'ReportsPage'],
  ['/admin/copy/ua', 'FactionCopySheet'],
  ['/admin/level-ups', 'LevelUpCopySheet'],
  ['/admin/taunts', 'TauntCopySheet'],
  ['/characters/create', 'CreateCharacter'],
  ['/propose-task', 'ProposeTask'],
]

describe('every protected route warms the chunk it renders', () => {
  it.each(GUARDED)('%s warms its own loader', async (path, page) => {
    seen.warm = undefined
    render(
      <MemoryRouter initialEntries={[path]}>
        <App />
      </MemoryRouter>,
    )
    await screen.findByText(page)
    expect(seen.warm, `${path} has no warm loader`).toBeTypeOf('function')
    // One guard covers /admin/*: it warms the console layout, not each page under it.
    const warmed = (await (seen.warm as Warm)()).default
    if (path.startsWith('/admin')) expect(warmed).toBe((await import('../../pages/Admin')).default)
    else expect(warmed()).toBe(page)
  })
})
