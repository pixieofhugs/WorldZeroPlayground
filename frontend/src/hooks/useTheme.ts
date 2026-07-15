import { useCallback, useEffect, useState } from 'react'

export type Theme = 'light' | 'dark'

export const THEME_STORAGE_KEY = 'wz-theme'

function getInitialTheme(): Theme {
  const stored = localStorage.getItem(THEME_STORAGE_KEY)
  if (stored === 'light' || stored === 'dark') return stored
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
}

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
 * Theme hook (Style Guide §8).
 * Persists to localStorage key 'wz-theme', defaults to system preference.
 */
export function useTheme() {
  const [theme, setTheme] = useState<Theme>(getInitialTheme)

  useEffect(() => {
    applyTheme(theme)
  }, [theme])

  const toggle = useCallback(() => {
    setTheme((previous) => {
      const next = nextTheme(previous)
      localStorage.setItem(THEME_STORAGE_KEY, next)
      return next
    })
  }, [])

  return { theme, toggle } as const
}
