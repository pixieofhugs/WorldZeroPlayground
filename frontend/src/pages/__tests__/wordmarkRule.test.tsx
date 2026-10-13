/**
 * #3100 — the wordmark's rainbow rule is ONE background layer, not a mask.
 *
 * THE SEAM is the inline style on the span that holds the wordmark, read out
 * of static markup. Both wordmarks used to draw the rule as the second of two
 * layers, under an opaque `--color-bg-page` fill that hid the rainbow above
 * the rule. That fill assumes a flat page-coloured ground, and neither ground
 * is one: the hero paints a spotlight behind its wordmark, and the nav bar is
 * `--color-nav-bg`, a translucent frost. So the mask showed as a slab.
 *
 * The rule itself is unchanged and pinned alongside: the spectrum's four-stop
 * cut (#1220, ADR-0066), full width, 6px on the hero and 2px in the nav.
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

/** The inline style of the `<span>` whose whole content is `text`. */
function wordmarkStyle(ui: React.ReactElement, text: string): string {
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
