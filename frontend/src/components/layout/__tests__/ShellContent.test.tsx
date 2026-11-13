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

// `panelStyle` is borrowed by the handle (#1191).
vi.mock('../Sidebar', () => ({
  default: () => <aside data-test="sidebar" />,
  panelStyle: {},
}))

import ShellContent from '../ShellContent'

/**
 * The #1116 invariant, structurally: the element-type path from `ShellContent`
 * to the page is identical in both form factors. That React then preserves the
 * subtree is its reconciliation contract, not tested here.
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

  it('keeps the path stable when the rail is folded away', () => {
    expect(pathToPage(tree(false, true), PAGE)).toEqual(pathToPage(tree(false, false), PAGE))
  })

  it('mounts the page under div > div > main while collapsed too', () => {
    expect(pathToPage(tree(false, true), PAGE)).toEqual(['div', 'div', 'main'])
  })

  // Keyboard/SR users reach content before the rail (#1191 decision 6).
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

/** The fold-away handle (#1191): markup contract only; toggling and persistence
 *  are visual QA. */
describe('ShellContent sidebar handle', () => {
  // #1343: present in the collapsed markup means no unmount on fold.
  it('keeps the rail mounted when collapsed, hidden rather than removed', () => {
    const html = render(false, true)
    expect(html).toContain('data-test="sidebar"')
    expect(html).toContain('aria-label="Expand sidebar"')
  })

  it('hides the collapsed rail with the hidden attribute, so nothing is drawn', () => {
    expect(render(false, true)).toMatch(/<div hidden[^>]*><aside data-test="sidebar"/)
    expect(render(false, false)).toMatch(/<div><aside data-test="sidebar"/)
  })

  it('names itself for the state it moves to, with a matching aria-expanded', () => {
    expect(render(false, false)).toContain('aria-label="Collapse sidebar"')
    expect(render(false, false)).toContain('aria-expanded="true"')
    expect(render(false, true)).toContain('aria-expanded="false"')
  })

  it('points at the rail it controls in both states', () => {
    expect(render(false, false)).toContain('aria-controls="wz-sidebar"')
    expect(render(false, true)).toContain('aria-controls="wz-sidebar"')
  })

  it('is a real button, so it is keyboard-reachable', () => {
    expect(render(false, false)).toMatch(/<button[^>]*type="button"/)
  })

  it('never renders on a phone, in either state', () => {
    expect(render(true, false)).not.toContain('aria-expanded')
    expect(render(true, true)).not.toContain('aria-expanded')
  })

  it('never renders for a signed-out visitor', () => {
    authMock.mockReturnValue(signedOut)
    expect(render(false, false)).not.toContain('aria-expanded')
    expect(render(false, true)).not.toContain('aria-expanded')
  })

  it('inherits the rail\'s lg-only gate', () => {
    expect(render(false, true)).toContain('hidden lg:block')
  })
})
