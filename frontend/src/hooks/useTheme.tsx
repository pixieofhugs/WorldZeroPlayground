import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  useSyncExternalStore,
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

/**
 * Theme resolution, extracted pure so it is testable in the repo's DOM-less node
 * env: a stored choice wins, otherwise fall back to the system preference.
 * Unchanged semantics — only the browser reads moved out to `getInitialTheme`.
 */
export function resolveInitialTheme(stored: string | null, prefersDark: boolean): Theme {
  if (stored === 'light' || stored === 'dark') return stored
  return prefersDark ? 'dark' : 'light'
}

/** Read the browser's answer for the initial theme (localStorage → system pref). */
export function getInitialTheme(): Theme {
  // Defensive so the provider can also be mounted in a DOM-less render (SSR,
  // node tests). In a browser both reads always succeed, so behaviour is
  // identical to the pre-provider hook.
  try {
    return resolveInitialTheme(
      localStorage.getItem(THEME_STORAGE_KEY),
      window.matchMedia('(prefers-color-scheme: dark)').matches,
    )
  } catch {
    return 'light'
  }
}

/** Persist the chosen theme. Same key and same write the old hook performed. */
export function persistTheme(theme: Theme): void {
  localStorage.setItem(THEME_STORAGE_KEY, theme)
}

/**
 * The one theme cell, as a tiny subscribable store (#701).
 *
 * The bug this replaces: `useTheme` used to hold a private `useState` per call
 * site, so a toggle in the NavBar never re-rendered the Settings switch (or any
 * other consumer) — they re-synced only on remount. A store plus
 * `useSyncExternalStore` makes "every consumer observes one value" a literal,
 * node-testable property rather than an implicit one.
 */
export interface ThemeStore {
  getTheme(): Theme
  setTheme(theme: Theme): void
  subscribe(listener: () => void): () => void
}

export function createThemeStore(initial: Theme): ThemeStore {
  let current: Theme = initial
  const listeners = new Set<() => void>()

  return {
    getTheme: () => current,
    setTheme(theme: Theme) {
      if (theme === current) return
      current = theme
      // Every subscriber, not just the one that toggled.
      listeners.forEach((listener) => listener())
    },
    subscribe(listener: () => void) {
      listeners.add(listener)
      return () => {
        listeners.delete(listener)
      }
    },
  }
}

export interface ThemeState {
  theme: Theme
  toggle: () => void
}

const ThemeContext = createContext<ThemeState | null>(null)

/**
 * App-root theme provider (Style Guide §8). Holds the single theme cell, paints
 * the `[data-theme]` cascade on change, and persists the choice to
 * localStorage — the same three behaviours the per-component hook had, now
 * shared by every consumer.
 */
export function ThemeProvider({ children }: { children: ReactNode }) {
  // Lazy: the browser reads happen at mount, exactly as the old `useState`
  // initializer did.
  const [store] = useState(() => createThemeStore(getInitialTheme()))
  const theme = useSyncExternalStore(store.subscribe, store.getTheme, store.getTheme)

  useEffect(() => {
    applyTheme(theme)
  }, [theme])

  const toggle = useCallback(() => {
    const next = nextTheme(store.getTheme())
    persistTheme(next)
    store.setTheme(next)
  }, [store])

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
