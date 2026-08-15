/**
 * #701 — the theme is ONE shared cell, not one per consumer.
 *
 * The repo has no jsdom/renderHook (vitest runs in `node`), so this follows the
 * same posture as `usePagedResource.test.ts` / `useSearchQueryParam.test.ts`:
 * the decisions live in extracted pure seams, and those seams are what get
 * tested. Fan-out itself is not tested — one `useState` behind one context
 * propagates to every consumer by construction, so asserting it would be
 * testing React, not this codebase.
 */
import { existsSync, readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'

import { renderToStaticMarkup } from 'react-dom/server'
import { describe, it, expect } from 'vitest'
import {
  resolveInitialTheme,
  nextTheme,
  ThemeProvider,
  useTheme,
  THEME_STORAGE_KEY,
} from '../useTheme'

const INDEX_HTML = readFileSync(
  fileURLToPath(new URL('../../../index.html', import.meta.url)),
  'utf8',
)

describe('nextTheme — the toggle flip', () => {
  it('returns the opposite theme', () => {
    expect(nextTheme('light')).toBe('dark')
    expect(nextTheme('dark')).toBe('light')
  })
})

/**
 * #1698 — dark is the default, light is opt-in. The OS preference is no longer
 * an input at all, which is why these cases take one argument: "no stored value
 * + a light-mode OS" is expressible only as "no stored value", because there is
 * nowhere left for the OS to enter. The other half of that claim — that the
 * pre-paint bootstrap doesn't read the OS either — is the mirror suite below.
 */
describe('resolveInitialTheme — dark unless the visitor chose light', () => {
  it('honours a stored choice', () => {
    expect(resolveInitialTheme('light')).toBe('light')
    expect(resolveInitialTheme('dark')).toBe('dark')
  })

  it('defaults to dark when nothing is stored, whatever the OS prefers', () => {
    expect(resolveInitialTheme(null)).toBe('dark')
  })

  it('ignores a junk stored value and defaults to dark', () => {
    expect(resolveInitialTheme('chartreuse')).toBe('dark')
  })
})

/**
 * The inline bootstrap in `index.html` runs before React exists, so nothing in
 * the bundle can observe it — but it decides the same question this module
 * does, and a disagreement is a visible theme flip on hydration. It is a string
 * to us, so a string is what we assert on.
 */
describe('index.html pre-paint bootstrap — mirrors this module', () => {
  it('reads the same storage key', () => {
    expect(INDEX_HTML).toContain(`'${THEME_STORAGE_KEY}'`)
  })

  it('does not consult the OS colour scheme', () => {
    expect(INDEX_HTML).not.toContain('prefers-color-scheme')
  })

  it('defaults to dark', () => {
    expect(INDEX_HTML).toMatch(/theme\s*=\s*'dark'/)
    expect(INDEX_HTML, 'no light fallback left in the bootstrap').not.toMatch(
      /theme\s*=\s*'light'/,
    )
  })

  it('names the sibling it mirrors by a filename that exists', () => {
    const named = /src\/hooks\/useTheme\.tsx?/.exec(INDEX_HTML)?.[0]
    expect(named, 'bootstrap points at its sibling').toBeTruthy()
    expect(existsSync(new URL(`../../../${named}`, import.meta.url))).toBe(true)
  })
})

/** Two distinct consumers, exactly as NavBar and Settings each call `useTheme`. */
function NavBarProbe() {
  const { theme } = useTheme()
  return <span data-testid="navbar-theme">{theme}</span>
}

function SettingsProbe() {
  const { theme } = useTheme()
  return <span data-testid="settings-theme">{theme}</span>
}

describe('ThemeProvider — both consumers read the same value', () => {
  it('serves one theme to every consumer in the tree', () => {
    const html = renderToStaticMarkup(
      <ThemeProvider>
        <NavBarProbe />
        <SettingsProbe />
      </ThemeProvider>,
    )
    const themes = [...html.matchAll(/<span data-testid="[^"]+-theme">([^<]+)<\/span>/g)].map(
      (match) => match[1],
    )
    expect(themes, 'both consumers rendered').toHaveLength(2)
    expect(themes[0], 'NavBar and Settings agree').toBe(themes[1])
  })

  it('refuses to hand out a theme outside the provider (no private copies)', () => {
    expect(() => renderToStaticMarkup(<NavBarProbe />)).toThrow(/ThemeProvider/)
  })
})
