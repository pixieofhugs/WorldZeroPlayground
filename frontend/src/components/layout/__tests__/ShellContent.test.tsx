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
vi.mock('../Sidebar', () => ({
  default: () => <aside data-test="sidebar" />,
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

function tree(isMobile: boolean): ReactElement {
  return ShellContent({ isMobile, children: PAGE }) as ReactElement
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
})

function render(isMobile: boolean): string {
  return renderToStaticMarkup(
    <MemoryRouter initialEntries={['/']}>
      <ShellContent isMobile={isMobile}>{PAGE}</ShellContent>
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
