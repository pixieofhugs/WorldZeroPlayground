/**
 * #3100 — the wordmark's rainbow rule is ONE background layer. A
 * `--color-bg-page` mask assumes a flat ground; the hero spotlight and the
 * frosted nav are not, so it showed as a slab.
 */
import { renderToStaticMarkup } from 'react-dom/server'
import { MemoryRouter } from 'react-router-dom'
import { describe, it, expect, vi } from 'vitest'
import '../../i18n'
import common from '../../locales/en/common.json'
import home from '../../locales/en/home.json'

vi.mock('../../auth/AuthContext', () => ({
  useAuth: () => ({ user: null, refetch: () => {} }),
}))
vi.mock('../../hooks/useGameConfig', () => ({ useGameConfig: () => null }))
vi.mock('../../api/praxis', () => ({ listPraxes: () => Promise.resolve([]) }))
vi.mock('../../api/tasks', () => ({ listTasks: () => Promise.resolve([]) }))
vi.mock('../../api/auth', () => ({ devLogin: () => {}, loginWith: () => {} }))
vi.mock('../../hooks/useTheme', () => ({
  useTheme: () => ({ theme: 'light', toggle: () => {} }),
}))
vi.mock('../../hooks/useSidebarPanels', () => ({
  useSidebarPanels: () => ({
    pending_requests_count: 0,
    global_activity: [],
    active_praxes: [],
    refetch: vi.fn(),
    loading: false,
  }),
}))

import NavBar from '../../components/NavBar'
import Home from '../Home'

function
 wordmarkStyle(ui: React.ReactElement, text: string): string {
  const html = renderToStaticMarkup(<MemoryRouter initialEntries={['/']}>{ui}</MemoryRouter>)
  const style = new RegExp(`<span[^>]*style="([^"]*)"[^>]*>${text}</span>`).exec(html)?.[1]
  expect(style, `a styled span holding "${text}"`).toBeDefined()
  return style!
}

describe.each([
  { name: 'hero', ui: <Home />, text: home.hero.wordmark, rule: '6px' },
  { name: 'nav', ui: <NavBar />, text: common.brand, rule: '2px' },
])('the $name wordmark draws its rule without masking its ground (#3100)', ({ ui, text, rule }) => {
  it('has no page-ground layer behind the glyphs', () => {
    expect(wordmarkStyle(ui, text)).not.toContain('--color-bg-page')
  })

  it('still draws the four-stop rule, full width, along the bottom', () => {
    const style = wordmarkStyle(ui, text)
    expect(style).toContain('background-image:var(--faction-default-total-rainbow)')
    expect(style).toContain(`background-size:100% ${rule}`)
    expect(style).toContain('background-position:bottom')
    expect(style).toContain('background-repeat:no-repeat')
  })
})
