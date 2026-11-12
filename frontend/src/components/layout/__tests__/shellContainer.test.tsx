/**
 * #1562: the nav and the page region both name `--shell-max-width` (the value
 * lives in `index.css`), plus the design shell's grid numbers.
 * (No utility class names in comments: Tailwind scans this file.)
 */
import { renderToStaticMarkup } from 'react-dom/server'
import { MemoryRouter } from 'react-router-dom'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import '../../../i18n'
import type { CurrentUser } from '../../../api/auth'

const authMock = vi.fn()
vi.mock('../../../auth/AuthContext', () => ({
  useAuth: () => authMock(),
}))

// The handle borrows `panelStyle`.
vi.mock('../Sidebar', () => ({
  default: () => <aside data-test="sidebar" />,
  panelStyle: {},
}))

// `useTheme` throws outside its provider (#701).
vi.mock('../../../hooks/useTheme', () => ({
  useTheme: () => ({ theme: 'light', toggle: () => {} }),
}))
vi.mock('../../../hooks/useSidebarPanels', () => ({
  useSidebarPanels: () => ({
    pending_requests_count: 0,
    global_activity: [],
    active_praxes: [],
  }),
}))
vi.mock('../../../api/auth', () => ({ loginWith: () => {} }))

import ShellContent from '../ShellContent'
import NavBar from '../../NavBar'

const SHELL_CAP = 'max-w-[var(--shell-max-width)]'

const signedIn = {
  user: { character: null } as unknown as CurrentUser,
  signOut: () => {},
}

const noop = () => {}

function renderShell(collapsed = false): string {
  return renderToStaticMarkup(
    <MemoryRouter initialEntries={['/tasks']}>
      <ShellContent isMobile={false} sidebarCollapsed={collapsed} onToggleSidebar={noop}>
        <span data-test="page" />
      </ShellContent>
    </MemoryRouter>,
  )
}

function renderMobileShell(): string {
  return renderToStaticMarkup(
    <MemoryRouter initialEntries={['/tasks']}>
      <ShellContent isMobile sidebarCollapsed={false} onToggleSidebar={noop}>
        <span data-test="page" />
      </ShellContent>
    </MemoryRouter>,
  )
}

function renderNav(): string {
  return renderToStaticMarkup(
    <MemoryRouter initialEntries={['/tasks']}>
      <NavBar />
    </MemoryRouter>,
  )
}

beforeEach(() => {
  authMock.mockReturnValue(signedIn)
})

describe('desktop shell container', () => {
  it('caps the page region at the shared shell width', () => {
    expect(renderShell()).toContain(SHELL_CAP)
  })

  it('caps the nav at the same token, so chrome and content cannot drift', () => {
    expect(renderNav()).toContain(SHELL_CAP)
  })

  it('gives the page region the design shell padding', () => {
    const html = renderShell()
    expect(html).toContain('pt-8')
    expect(html).toContain('px-10')
    expect(html).toContain('pb-[72px]')
  })

  it('leaves the phone region uncapped and full-bleed', () => {
    expect(renderMobileShell()).not.toContain(SHELL_CAP)
  })
})

describe('desktop shell grid', () => {
  it('seats the rail in a fixed 320px column beside a floored content column', () => {
    expect(renderShell()).toContain('lg:grid-cols-[320px_minmax(0,1fr)]')
  })

  it('opens the design gutter between rail and page', () => {
    expect(renderShell()).toContain('gap-9')
  })

  it('keeps the same gutter while the rail is folded away', () => {
    const html = renderShell(true)
    expect(html).toContain('gap-9')
    expect(html).toContain('lg:grid-cols-[auto_minmax(0,1fr)]')
  })
})

/** The expanded rail is too tall to pin (#1562; see `SidebarColumn`). */
describe('rail stickiness after the #1562 measurement', () => {
  it('never pins the expanded rail', () => {
    expect(renderShell(false)).not.toContain('lg:sticky')
  })

  it('still pins the collapsed handle, the only way back from a folded rail', () => {
    expect(renderShell(true)).toContain('lg:sticky lg:top-14')
  })

  it('keeps self-stretch on the column, so the sticky handle has room to travel', () => {
    expect(renderShell(true)).toContain('lg:self-stretch')
  })
})
