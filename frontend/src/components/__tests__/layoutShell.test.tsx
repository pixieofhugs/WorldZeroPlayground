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

// Chrome and global watchers: need contexts the static renderer lacks.
vi.mock('../backdrop/BackdropContext', () => ({
  BackdropProvider: ({ children }: { children: ReactNode }) => children,
}))
vi.mock('../backdrop/FactionBackdrop', () => ({ default: () => null }))
vi.mock('../LevelUpWatcher', () => ({ default: () => null }))
vi.mock('../InvitationWatcher', () => ({ default: () => null }))
vi.mock('../NavBar', () => ({ default: () => <nav data-test="navbar" /> }))
vi.mock('../layout/MobileHeader', () => ({ default: () => <header data-test="mobile-header" /> }))
vi.mock('../layout/MobileTabBar', () => ({ default: () => <nav data-test="tabbar" /> }))
// The fold-away handle borrows `panelStyle` (#1191).
vi.mock('../layout/Sidebar', () => ({
  default: () => <aside data-test="sidebar" />,
  panelStyle: {},
}))

// ShellContent is the seam under test, so not mocked.
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
 * #1116: chromes are siblings of the page, never its parent, or a resize
 * remounts the page and re-runs its fetch.
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
    expect(html).not.toContain('data-test="sidebar"')
  })

  it('renders all five footer links, in order, above the tab bar on a phone (#3304)', () => {
    const html = render('mobile')
    const hrefs = [...html.matchAll(/href="(\/[a-z]+)"/g)].map((m) => m[1])
    expect(hrefs.filter((h) => h !== '/tasks')).toEqual(
      expect.arrayContaining(['/about', '/contact', '/disclaimer', '/attributions', '/donate']),
    )
    expect(html).toContain('padding-bottom:calc(var(--space-md) + var(--tab-bar-clearance))')
    expect(html.indexOf('<footer')).toBeGreaterThan(html.indexOf(PAGE_MARKER))
  })

  it('keeps the NavBar, sidebar and footer on desktop', () => {
    const html = render('desktop')
    expect(html).toContain('data-test="navbar"')
    expect(html).toContain('<footer')
    expect(html).not.toContain('--tab-bar-clearance')
    expect(html).toContain('data-test="sidebar"')
    expect(html).not.toContain('data-test="tabbar"')
    expect(html).not.toContain('data-test="mobile-header"')
  })
})
