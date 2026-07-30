import { isValidElement, type ReactElement, type ReactNode } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { MemoryRouter } from 'react-router-dom'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import '../../../i18n'
import type { CurrentUser } from '../../../api/auth'

const authMock = vi.fn()
vi.mock('../../../auth/AuthContext', () => ({
  useAuth: () => authMock(),
}))

// The sidebar fetches on mount and is irrelevant to the reconciliation shape.
// `panelStyle` is mocked too because the fold-away handle borrows it (#1191).
vi.mock('../Sidebar', () => ({
  default: () => <aside data-test="sidebar" />,
  panelStyle: {},
}))

import ShellContent from '../ShellContent'

/**
 * The #1116 invariant, asserted structurally.
 *
 * React keeps a subtree mounted only while the chain of element TYPES leading to
 * it is unchanged. So the property that stops a resize from remounting (and
 * therefore refetching) every page is: the path from `ShellContent` down to the
 * page is identical in both form factors, differing only in className.
 *
 * `pathToPage` reads that path straight off the returned element tree, so a
 * future edit that wraps the page on one branch only — the exact regression that
 * reintroduces the bug — fails here rather than in production.
 *
 * NOT verified here (the harness is `renderToStaticMarkup`; there is no DOM, no
 * jsdom and effects never run, so an actual resize cannot be simulated): that
 * React does in fact preserve the subtree given a stable chain. That is React's
 * documented reconciliation contract, and the reasoning is recorded in
 * ShellContent's own docblock.
 */
const PAGE = <span data-test="page" />

function childrenOf(element: ReactElement): ReactNode[] {
  const { children } = element.props as { children?: ReactNode }
  return Array.isArray(children) ? children : [children]
}

/** Element-type names from `node` down to `target`, or null if not on this branch. */
function pathToPage(node: ReactNode, target: ReactNode): string[] | null {
  if (node === target) return []
  if (!isValidElement(node)) return null
  for (const child of childrenOf(node)) {
    const rest = pathToPage(child, target)
    if (rest === null) continue
    const { type } = node
    const name = typeof type === 'string' ? type : (type as { name?: string }).name ?? 'Component'
    return [name, ...rest]
  }
  return null
}

const signedIn = { user: { character: null } as unknown as CurrentUser }
const signedOut = { user: null }

const noop = () => {}

function tree(isMobile: boolean, collapsed = false): ReactElement {
  return ShellContent({
    isMobile,
    children: PAGE,
    sidebarCollapsed: collapsed,
    onToggleSidebar: noop,
  }) as ReactElement
}

beforeEach(() => {
  authMock.mockReturnValue(signedIn)
})

describe('ShellContent page slot', () => {
  it('puts the page at the same element path in both form factors', () => {
    expect(pathToPage(tree(true), PAGE)).toEqual(pathToPage(tree(false), PAGE))
  })

  it('mounts the page under div > div > main', () => {
    expect(pathToPage(tree(false), PAGE)).toEqual(['div', 'div', 'main'])
  })

  it('keeps the path stable when the sidebar comes and goes', () => {
    const withSidebar = pathToPage(tree(false), PAGE)
    authMock.mockReturnValue(signedOut)
    expect(pathToPage(tree(false), PAGE)).toEqual(withSidebar)
  })

  // #1191 added a second state axis. Folding the rail away must not move the
  // page either, or collapsing would remount every routed page beneath it.
  it('keeps the path stable when the rail is folded away', () => {
    expect(pathToPage(tree(false, true), PAGE)).toEqual(pathToPage(tree(false, false), PAGE))
  })

  it('mounts the page under div > div > main while collapsed too', () => {
    expect(pathToPage(tree(false, true), PAGE)).toEqual(['div', 'div', 'main'])
  })

  // The page is source-FIRST and placed into grid column 2 by class (#1191
  // decision 6), so keyboard and screen-reader users reach page content before
  // the rail on every route. A DOM reorder would silently undo that.
  it('renders the page before the rail in source order', () => {
    const [grid] = childrenOf(tree(false)) as ReactElement[]
    const [firstCell] = childrenOf(grid)
    expect(pathToPage(firstCell, PAGE)).toEqual(['main'])
  })
})

function render(isMobile: boolean, collapsed = false): string {
  return renderToStaticMarkup(
    <MemoryRouter initialEntries={['/']}>
      <ShellContent isMobile={isMobile} sidebarCollapsed={collapsed} onToggleSidebar={noop}>
        {PAGE}
      </ShellContent>
    </MemoryRouter>,
  )
}

describe('ShellContent chrome', () => {
  it('renders the sidebar on desktop when signed in', () => {
    expect(render(false)).toContain('data-test="sidebar"')
  })

  it('never renders the sidebar on a phone', () => {
    expect(render(true)).not.toContain('data-test="sidebar"')
  })

  it('omits the sidebar for a signed-out desktop visitor', () => {
    authMock.mockReturnValue(signedOut)
    expect(render(false)).not.toContain('data-test="sidebar"')
  })
})

/**
 * The fold-away handle (#1191).
 *
 * The harness cannot click it and cannot observe localStorage, so what is pinned
 * here is the markup contract a keyboard or screen-reader user meets: one
 * control in BOTH states, an accessible name that reports the state it moves to,
 * and a matching `aria-expanded`. The toggle interaction and the persistence
 * round-trip are visual QA only.
 */
describe('ShellContent sidebar handle', () => {
  it('drops the rail entirely when collapsed, keeping only the handle', () => {
    const html = render(false, true)
    expect(html).not.toContain('data-test="sidebar"')
    expect(html).toContain('aria-label="Expand sidebar"')
  })

  it('names itself for the state it moves to, with a matching aria-expanded', () => {
    expect(render(false, false)).toContain('aria-label="Collapse sidebar"')
    expect(render(false, false)).toContain('aria-expanded="true"')
    expect(render(false, true)).toContain('aria-expanded="false"')
  })

  it('points at the rail it controls while that rail exists', () => {
    expect(render(false, false)).toContain('aria-controls="wz-sidebar"')
  })

  // Collapsed means the rail is UNMOUNTED, so keeping `aria-controls` would
  // reference an id that is not on the page — an axe `aria-valid-attr-value`
  // failure, and nothing useful for a screen reader to follow. `aria-expanded`
  // carries the state on its own.
  it('drops aria-controls once there is no rail to point at', () => {
    expect(render(false, true)).not.toContain('aria-controls')
  })

  it('is a real button, so it is keyboard-reachable', () => {
    expect(render(false, false)).toMatch(/<button[^>]*type="button"/)
  })

  // Decision 4: the 768–1023px band and the phone get no rail at all, so a
  // handle there would toggle something invisible.
  it('never renders on a phone, in either state', () => {
    expect(render(true, false)).not.toContain('aria-expanded')
    expect(render(true, true)).not.toContain('aria-expanded')
  })

  it('never renders for a signed-out visitor', () => {
    authMock.mockReturnValue(signedOut)
    expect(render(false, false)).not.toContain('aria-expanded')
    expect(render(false, true)).not.toContain('aria-expanded')
  })

  // Its wrapper carries the same `lg:` gate the rail has always had.
  it('inherits the rail\'s lg-only gate', () => {
    expect(render(false, true)).toContain('hidden lg:block')
  })
})
