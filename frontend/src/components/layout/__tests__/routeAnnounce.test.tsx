// @vitest-environment jsdom
import { render, act } from '@testing-library/react'
import { MemoryRouter, useNavigate } from 'react-router-dom'
import { describe, it, expect, vi } from 'vitest'
import '../../../i18n'

vi.mock('../../../auth/AuthContext', () => ({
  useAuth: () => ({ user: null, loading: false, signOut: () => {} }),
}))
vi.mock('../../../hooks/useFormFactor', () => ({ useFormFactor: () => 'desktop' }))
vi.mock('../../backdrop/FactionBackdrop', () => ({ default: () => null }))
vi.mock('../../LevelUpWatcher', () => ({ default: () => null }))
vi.mock('../../InvitationWatcher', () => ({ default: () => null }))
vi.mock('../../TheArray', () => ({ default: () => null }))
vi.mock('../../NavBar', () => ({ default: () => null }))
vi.mock('../MobileHeader', () => ({ default: () => null }))
vi.mock('../MobileTabBar', () => ({ default: () => null }))
vi.mock('../SiteFooter', () => ({ default: () => null }))

import Layout from '../../Layout'

let go: (to: string) => void = () => {}
function Probe() {
  go = useNavigate()
  return null
}
const mount = () =>
  render(
    <MemoryRouter initialEntries={['/tasks']}>
      <Layout>
        <Probe />
      </Layout>
    </MemoryRouter>,
  )

describe('route changes are announced', () => {
  it('titles the first load without stealing focus', () => {
    mount()
    expect(document.title).toBe('Tasks · World Zero')
    expect(document.activeElement).toBe(document.body)
  })

  it('retitles and focuses <main> on a pathname change only', () => {
    mount()
    act(() => go('/tasks?q=x'))
    expect(document.activeElement).toBe(document.body)
    act(() => go('/leaderboard'))
    expect(document.title).toBe('Leaderboard · World Zero')
    expect(document.activeElement).toBe(document.getElementById('content'))
  })
})
