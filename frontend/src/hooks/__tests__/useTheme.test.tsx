/** #701 — the theme is ONE shared cell; decisions tested via pure seams. */
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

/** #1698 — dark default; the OS preference is not an input. */
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

/** The pre-React bootstrap must agree with this module, or hydration flips the theme. */
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
