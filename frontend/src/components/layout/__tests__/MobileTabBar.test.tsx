import { renderToStaticMarkup } from 'react-dom/server'
import { MemoryRouter } from 'react-router-dom'
import { describe, it, expect, vi } from 'vitest'
// Initialize the i18n catalog so nav copy keys resolve to English text.
import '../../../i18n'
import MobileTabBar, { activeTab } from '../MobileTabBar'

vi.mock('../../../auth/AuthContext', () => ({ useAuth: () => ({ user: null }) }))
vi.mock('../../../hooks/useSidebarPanels', () => ({ useSidebarPanels: () => ({ pending_requests_count: 0 }) }))

function render(path: string): string {
  return renderToStaticMarkup(
    <MemoryRouter initialEntries={[path]}>
      <MobileTabBar />
    </MemoryRouter>,
  )
}

describe('MobileTabBar', () => {
  it('renders Home, Tasks, Praxis, Community, You in order with labels', () => {
    const html = render('/')
    const at = ['Home', 'Tasks', 'Praxis', 'Community', 'You'].map((l) => html.indexOf(`>${l}<`))
    expect(at.every((i) => i > 0)).toBe(true)
    expect([...at].sort((a, b) => a - b)).toEqual(at)
    for (const href of ['href="/"', 'href="/tasks"', 'href="/praxis"', 'href="/leaderboard"']) {
      expect(html).toContain(href)
    }
  })

  it('declares its height from --tab-bar-height plus the bottom inset', () => {
    // The geometry rule lives in tabBar.css; the bar must keep using it.
    const css = readCss()
    expect(css).toContain('height: calc(var(--tab-bar-height) + env(safe-area-inset-bottom))')
  })

  it('gives every glyph its own gradient id', () => {
    const ids = [...render('/').matchAll(/<linearGradient id="([^"]+)"/g)].map((m) => m[1])
    expect(ids).toHaveLength(4)
    expect(new Set(ids).size).toBe(4)
  })

  it('lights one tab: solid glyph at full strength, hairline over it', () => {
    const html = render('/tasks')
    expect(html.match(/aria-current="page"/g)).toHaveLength(1)
    expect(html.match(/opacity:0\.72/g)).toHaveLength(3)
    expect(html).toContain('left:calc(30% - 14px)')
  })

  it('marks Community active on either of its routes', () => {
    expect(activeTab('/leaderboard', false)).toBe(3)
    expect(activeTab('/factions', false)).toBe(3)
    expect(activeTab('/factions/snide', false)).toBe(3)
    expect(activeTab('/tasks/4', true)).toBe(4)
    expect(activeTab('/settings', false)).toBe(-1)
  })
})

import { readFileSync } from 'node:fs'
function readCss(): string {
  return readFileSync(new URL('../tabBar.css', import.meta.url), 'utf8')
}
