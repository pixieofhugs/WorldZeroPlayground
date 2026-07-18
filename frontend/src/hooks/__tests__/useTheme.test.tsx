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
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, it, expect } from 'vitest'
import { resolveInitialTheme, nextTheme, ThemeProvider, useTheme } from '../useTheme'

describe('nextTheme — the toggle flip', () => {
  it('returns the opposite theme', () => {
    expect(nextTheme('light')).toBe('dark')
    expect(nextTheme('dark')).toBe('light')
  })
})

describe('resolveInitialTheme — unchanged resolution order', () => {
  it('honours a stored choice over the system preference', () => {
    expect(resolveInitialTheme('light', true)).toBe('light')
    expect(resolveInitialTheme('dark', false)).toBe('dark')
  })

  it('falls back to the system preference when nothing is stored', () => {
    expect(resolveInitialTheme(null, true)).toBe('dark')
    expect(resolveInitialTheme(null, false)).toBe('light')
  })

  it('ignores a junk stored value and asks the system', () => {
    expect(resolveInitialTheme('chartreuse', true)).toBe('dark')
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
