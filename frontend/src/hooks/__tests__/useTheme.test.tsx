/**
 * #701 — the theme is ONE shared cell, not one per consumer.
 *
 * The repo has no jsdom/renderHook (vitest runs in `node`), so this follows the
 * same posture as `usePagedResource.test.ts` / `useSearchQueryParam.test.ts`:
 * the decisions live in extracted seams, and those seams are what get tested.
 *
 *   1. `createThemeStore` fans a change out to EVERY subscriber — this is the
 *      bug the issue exists to fix, expressed as a runnable assertion. Two
 *      consumers subscribed to one store both observe a toggle from either.
 *   2. `resolveInitialTheme` keeps the old precedence: stored choice → system.
 *   3. The provider really does hand both consumers the same value (SSR render).
 */
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, it, expect } from 'vitest'
import {
  createThemeStore,
  resolveInitialTheme,
  nextTheme,
  ThemeProvider,
  useTheme,
  type Theme,
} from '../useTheme'

describe('createThemeStore — one cell, every consumer reactive', () => {
  it('notifies BOTH subscribers when either one toggles', () => {
    // Two independent consumers, e.g. the NavBar switch and the Settings switch.
    const store = createThemeStore('light')
    const navBarSeen: Theme[] = []
    const settingsSeen: Theme[] = []
    store.subscribe(() => navBarSeen.push(store.getTheme()))
    store.subscribe(() => settingsSeen.push(store.getTheme()))

    // The NavBar toggles.
    store.setTheme(nextTheme(store.getTheme()))
    expect(navBarSeen, 'toggler re-renders').toEqual(['dark'])
    expect(settingsSeen, 'the OTHER consumer re-renders too — the #701 bug').toEqual(['dark'])

    // Now Settings toggles: the NavBar must follow, without a remount.
    store.setTheme(nextTheme(store.getTheme()))
    expect(settingsSeen).toEqual(['dark', 'light'])
    expect(navBarSeen).toEqual(['dark', 'light'])

    // Both always read the identical current value — never two private copies.
    expect(navBarSeen).toEqual(settingsSeen)
    expect(store.getTheme()).toBe('light')
  })

  it('does not churn subscribers when the theme is set to what it already is', () => {
    const store = createThemeStore('dark')
    let notifications = 0
    store.subscribe(() => {
      notifications += 1
    })
    store.setTheme('dark')
    expect(notifications).toBe(0)
  })

  it('stops notifying an unmounted consumer', () => {
    const store = createThemeStore('light')
    let notifications = 0
    const unsubscribe = store.subscribe(() => {
      notifications += 1
    })
    unsubscribe()
    store.setTheme('dark')
    expect(notifications).toBe(0)
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
