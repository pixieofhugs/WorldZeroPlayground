import type { ReactNode } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { MemoryRouter } from 'react-router-dom'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import type { CurrentUser } from '../../api/auth'

const formFactorMock = vi.fn()
vi.mock('../../hooks/useFormFactor', () => ({
  useFormFactor: () => formFactorMock(),
}))

const authMock = vi.fn()
vi.mock('../../auth/AuthContext', () => ({
  useAuth: () => authMock(),
}))

// Everything below is chrome or a global watcher: each one fetches or reads a
// context the static renderer cannot supply, and none of it carries page state.
vi.mock('../backdrop/BackdropContext', () => ({
  BackdropProvider: ({ children }: { children: ReactNode }) => children,
}))
vi.mock('../backdrop/FactionBackdrop', () => ({ default: () => null }))
vi.mock('../LevelUpWatcher', () => ({ default: () => null }))
vi.mock('../InvitationWatcher', () => ({ default: () => null }))
vi.mock('../NavBar', () => ({ default: () => <nav data-test="navbar" /> }))
vi.mock('../layout/MobileHeader', () => ({ default: () => <header data-test="mobile-header" /> }))
vi.mock('../layout/MobileTabBar', () => ({ default: () => <nav data-test="tabbar" /> }))
vi.mock('../layout/SiteFooter', () => ({ default: () => <footer data-test="footer" /> }))
// `panelStyle` is a named export the fold-away handle borrows (#1191), so a
// mock that supplies only `default` leaves the handle spreading `undefined`.
vi.mock('../layout/Sidebar', () => ({
  default: () => <aside data-test="sidebar" />,
  panelStyle: {},
}))

// ShellContent is deliberately NOT mocked — it is the seam under test.
import Layout from '../Layout'

const PAGE_MARKER = 'page-content-marker'

function render(formFactor: 'mobile' | 'desktop'): string {
  formFactorMock.mockReturnValue(formFactor)
  return renderToStaticMarkup(
    <MemoryRouter initialEntries={['/tasks']}>
      <Layout>{PAGE_MARKER}</Layout>
    </MemoryRouter>,
  )
}

/** Open tags still unclosed at the point `marker` appears, outermost first. */
function openTagsAround(html: string, marker: string): string[] {
  const upTo = html.slice(0, html.indexOf(marker))
  const stack: string[] = []
  for (const [, closing, name] of upTo.matchAll(/<(\/?)([a-z][a-z0-9]*)\b[^>]*?(\/?)>/g)) {
    if (closing) stack.pop()
    else stack.push(name)
  }
  return stack
}

beforeEach(() => {
  authMock.mockReturnValue({
    user: { character: { id: 1 } } as unknown as CurrentUser,
    loading: false,
    refetch: vi.fn(),
  })
})

/**
 * #1116: the two chromes are siblings of the page region, never its parent.
 * Anything that puts the page back under a form-factor-dependent component
 * remounts every page on a resize, which re-runs its fetching effect.
 */
describe('Layout shell', () => {
  it('nests the page identically in both form factors', () => {
    const mobile = openTagsAround(render('mobile'), PAGE_MARKER)
    const desktop = openTagsAround(render('desktop'), PAGE_MARKER)
    expect(mobile).toEqual(desktop)
    expect(mobile.at(-1)).toBe('main')
  })

  it('swaps only the chrome on a phone', () => {
    const html = render('mobile')
    expect(html).toContain('data-test="mobile-header"')
    expect(html).toContain('data-test="tabbar"')
    expect(html).not.toContain('data-test="navbar"')
    expect(html).not.toContain('data-test="footer"')
    expect(html).not.toContain('data-test="sidebar"')
  })

  it('keeps the NavBar, sidebar and footer on desktop', () => {
    const html = render('desktop')
    expect(html).toContain('data-test="navbar"')
    expect(html).toContain('data-test="footer"')
    expect(html).toContain('data-test="sidebar"')
    expect(html).not.toContain('data-test="tabbar"')
    expect(html).not.toContain('data-test="mobile-header"')
  })
})
