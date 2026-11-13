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

export function nextTheme(theme: Theme): Theme {
  return theme === 'light' ? 'dark' : 'light'
}

export function applyTheme(theme: Theme): void {
  document.documentElement.setAttribute('data-theme', theme)
}

/** #1698: dark by default. */
export const DEFAULT_THEME: Theme = 'dark'

/** Stored choice wins, else dark. The OS colour scheme is deliberately not an input (#1698). */
export function resolveInitialTheme(stored: string | null): Theme {
  if (stored === 'light' || stored === 'dark') return stored
  return DEFAULT_THEME
}

export function getInitialTheme(): Theme {
  // try/catch: DOM-less renders (SSR, node tests).
  try {
    return resolveInitialTheme(localStorage.getItem(THEME_STORAGE_KEY))
  } catch {
    return DEFAULT_THEME
  }
}

export function persistTheme(theme: Theme): void {
  localStorage.setItem(THEME_STORAGE_KEY, theme)
}

interface ThemeState {
  theme: Theme
  toggle: () => void
}

const ThemeContext = createContext<ThemeState | null>(null)

/**
 * App-root theme provider (Style Guide §8): ONE theme cell shared by every
 * consumer (#701), painted onto `[data-theme]` and persisted.
 */
export function ThemeProvider({ children }: { children: ReactNode }) {
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

export function useTheme(): ThemeState {
  const value = useContext(ThemeContext)
  if (!value) {
    throw new Error('useTheme must be used within a ThemeProvider')
  }
  return value
}
