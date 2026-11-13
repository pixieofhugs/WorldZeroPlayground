import { useCallback, useState } from 'react'

/** Whether the desktop rail is folded away (#1191); per browser, `useTheme`'s storage idiom. */
export const SIDEBAR_COLLAPSED_STORAGE_KEY = 'wz-sidebar-collapsed'

const COLLAPSED = '1'
const EXPANDED = '0'

/** Only an explicit stored collapse collapses; absent/junk → expanded. */
export function resolveInitialCollapsed(stored: string | null): boolean {
  return stored === COLLAPSED
}

interface SidebarCollapsedState {
  readonly collapsed: boolean
  readonly toggle: () => void
}

export function useSidebarCollapsed(): SidebarCollapsedState {
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
        // Storage refused: still flips for this session.
      }
      return next
    })
  }, [])

  return { collapsed, toggle }
}
