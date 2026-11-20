// @vitest-environment jsdom
import { Suspense } from 'react'
import { cleanup, render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, describe, expect, it, vi } from 'vitest'
import '../../../i18n'
import MobileHeader from '../MobileHeader'

let user: { is_admin: boolean; character: null }
vi.mock('../../../auth/AuthContext', () => ({ useAuth: () => ({ user }) }))
vi.mock('../../../auth/AdminModeContext', () => ({ useAdminMode: () => ({ adminMode: false, toggleAdminMode: vi.fn() }) }))
vi.mock('../../../hooks/useSidebarPanels', () => ({ useSidebarPanels: () => ({ pending_requests_count: 0 }) }))
vi.mock('../../../pages/admin/useAdminCounts', () => ({ useAdminCounts: () => ({}) }))

const mount = () =>
  render(
    <MemoryRouter>
      <Suspense fallback={null}>
        <MobileHeader />
      </Suspense>
    </MemoryRouter>,
  )
afterEach(cleanup)

describe('MobileHeader MOD control', () => {
  it('shows an admin MOD', async () => {
    user = { is_admin: true, character: null }
    mount()
    expect(await screen.findByRole('button', { name: /mod/i })).toBeTruthy()
  })
  it('shows a player nothing', async () => {
    user = { is_admin: false, character: null }
    mount()
    await new Promise((r) => setTimeout(r, 30))
    expect(screen.queryByRole('button', { name: /mod/i })).toBeNull()
  })
})
