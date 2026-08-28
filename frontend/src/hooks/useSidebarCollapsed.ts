import { useCallback, useState } from 'react'

/**
 * Whether the desktop rail is folded away (#1191). A viewport preference like
 * the theme — per browser, NOT keyed by character id — so it lives in
 * localStorage under its own key and follows the storage idiom `useTheme.tsx`
 * already established: a pure resolver, a lazy `useState` initializer that wraps
 * the browser read in try/catch (the repo's tests render with no DOM), and a
 * write on toggle.
 */
export const SIDEBAR_COLLAPSED_STORAGE_KEY = 'wz-sidebar-collapsed'

const COLLAPSED = '1'
const EXPANDED = '0'

/**
 * Resolution extracted pure so it is testable in the repo's DOM-less node env.
 * Anything other than an explicit stored collapse means expanded, so a player
 * who has never toggled — and a player whose stored value got corrupted — sees
 * the rail exactly as it was before this shipped.
 */
export function resolveInitialCollapsed(stored: string | null): boolean {
  return stored === COLLAPSED
}

interface SidebarCollapsedState {
  readonly collapsed: boolean
  readonly toggle: () => void
}

export function useSidebarCollapsed(): SidebarCollapsedState {
  // Lazy initializer: the browser read happens at mount, not at import.
  const [collapsed, setCollapsed] = useState<boolean>(() => {
    try {
      return resolveInitialCollapsed(localStorage.getItem(SIDEBAR_COLLAPSED_STORAGE_KEY))
    } catch {
      return false
    }
  })

  const toggle = useCallback(() => {
    setCollapsed((previous) => {
      const next = !previous
      try {
        localStorage.setItem(SIDEBAR_COLLAPSED_STORAGE_KEY, next ? COLLAPSED : EXPANDED)
      } catch {
        // A browser refusing storage (private mode, quota) must not cost the
        // player the toggle itself — the state still flips for this session.
      }
      return next
    })
  }, [])

  return { collapsed, toggle }
}
