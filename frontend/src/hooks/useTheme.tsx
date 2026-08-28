import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'

export type Theme = 'light' | 'dark'

export const THEME_STORAGE_KEY = 'wz-theme'

/** The opposite theme — the single source of the toggle's flip decision. */
export function nextTheme(theme: Theme): Theme {
  return theme === 'light' ? 'dark' : 'light'
}

/** Paint the `[data-theme]` cascade. Exported so behaviour tests can exercise
 *  the exact flip the toggle performs without a React hook runtime. */
export function applyTheme(theme: Theme): void {
  document.documentElement.setAttribute('data-theme', theme)
}

/** What a visitor who has never touched the toggle gets (#1698). */
export const DEFAULT_THEME: Theme = 'dark'

/**
 * Theme resolution, extracted pure so it is testable in the repo's DOM-less node
 * env: a stored choice wins, otherwise dark.
 *
 * The OS `prefers-color-scheme` used to decide the unstored case; #1698 removed
 * it, so light is reachable only through the toggle. That is why there is no
 * system-preference argument to pass — a light-mode OS is not an input.
 */
export function resolveInitialTheme(stored: string | null): Theme {
  if (stored === 'light' || stored === 'dark') return stored
  return DEFAULT_THEME
}

/** Read the browser's answer for the initial theme (localStorage → default). */
export function getInitialTheme(): Theme {
  // Defensive so the provider can also be mounted in a DOM-less render (SSR,
  // node tests). In a browser the read always succeeds, so behaviour is
  // identical to the pre-provider hook.
  try {
    return resolveInitialTheme(localStorage.getItem(THEME_STORAGE_KEY))
  } catch {
    return DEFAULT_THEME
  }
}

/** Persist the chosen theme. Same key and same write the old hook performed. */
export function persistTheme(theme: Theme): void {
  localStorage.setItem(THEME_STORAGE_KEY, theme)
}

interface ThemeState {
  theme: Theme
  toggle: () => void
}

const ThemeContext = createContext<ThemeState | null>(null)

/**
 * App-root theme provider (Style Guide §8). Holds the single theme cell, paints
 * the `[data-theme]` cascade on change, and persists the choice to
 * localStorage — the same three behaviours the per-component hook had, now
 * shared by every consumer.
 *
 * The bug this fixes (#701): `useTheme` used to hold a private `useState` per
 * call site, so a toggle in the NavBar never re-rendered the Settings switch.
 * One `useState` behind one context fixes that by construction.
 */
export function ThemeProvider({ children }: { children: ReactNode }) {
  // Lazy initializer: the browser reads happen at mount, exactly as the old
  // per-component `useState` did — not at import.
  const [theme, setTheme] = useState<Theme>(getInitialTheme)

  useEffect(() => {
    applyTheme(theme)
  }, [theme])

  const toggle = useCallback(() => {
    const next = nextTheme(theme)
    persistTheme(next)
    setTheme(next)
  }, [theme])

  const value = useMemo<ThemeState>(() => ({ theme, toggle }), [theme, toggle])

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
}

/**
 * Read the shared theme. Same `{ theme, toggle }` shape the old hook returned,
 * so consumers are unchanged — but every consumer now re-renders when any other
 * one toggles.
 */
export function useTheme(): ThemeState {
  const value = useContext(ThemeContext)
  if (!value) {
    throw new Error('useTheme must be used within a ThemeProvider')
  }
  return value
}
