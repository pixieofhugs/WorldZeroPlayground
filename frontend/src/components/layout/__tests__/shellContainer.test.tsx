/**
 * #1562 — the desktop shell's container contract, and the one thing that makes
 * it worth pinning: the nav and the page under it read the SAME cap.
 *
 * The seam is the rendered className of two containers in two different files.
 * They were `max-w-5xl` (1024px) and `max-w-[min(92vw,1600px)]`, i.e. up to
 * ~576px apart on a wide monitor, on every route — and nothing anywhere failed.
 * A shared `--shell-max-width` fixes that only for as long as both keep reading
 * it, so the invariant asserted here is "both name the token", not "both say
 * 1392px": the value's home is `index.css` and this harness cannot resolve it
 * (`renderToStaticMarkup`, no DOM, no cascade).
 *
 * The grid numbers ride along because they are the other half of the same
 * design shell and are equally invisible to every other test.
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

// The rail fetches on mount and its innards are not the subject; the handle
// borrows `panelStyle`, so that export has to survive the mock.
vi.mock('../Sidebar', () => ({
  default: () => <aside data-test="sidebar" />,
  panelStyle: {},
}))

// `useTheme` throws outside its provider by design (#701) and the panels come
// over the network (#1344); the static renderer supplies neither.
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

  // The whole point of the change. Either container drifting onto a number of
  // its own reopens the ~576px disagreement this issue was filed about.
  it('caps the nav at the same token, so chrome and content cannot drift', () => {
    expect(renderNav()).toContain(SHELL_CAP)
  })

  it('gives the page region the design shell padding', () => {
    const html = renderShell()
    expect(html).toContain('pt-8')
    expect(html).toContain('px-10')
    expect(html).toContain('pb-[72px]')
  })

  // Explicitly out of scope (#1562): the phone keeps its full-bleed region, and
  // a cap leaking onto it would be a silent mobile regression.
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

  // Collapsed shrinks column 1 to the handle; the gutter is the shell's, not
  // the expanded state's, so it survives the fold.
  it('keeps the same gutter while the rail is folded away', () => {
    const html = renderShell(true)
    expect(html).toContain('gap-9')
    expect(html).toContain('lg:grid-cols-[auto_minmax(0,1fr)]')
  })
})

/**
 * #1562 Ruling 2 measured the expanded rail against `100vh - 100px` at 1366×768
 * (668px) and found it does not fit, so the rail stays in flow. These pin the
 * two things that had to survive that outcome — see `SidebarColumn`'s docblock
 * for the arithmetic.
 */
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
