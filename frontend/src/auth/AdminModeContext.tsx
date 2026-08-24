import { createContext, useContext, useState, type ReactNode } from 'react'

export const ADMIN_MODE_STORAGE_KEY = 'wz_admin_mode'

interface AdminModeState {
  adminMode: boolean
  toggleAdminMode: () => void
}

const AdminModeContext = createContext<AdminModeState>({
  adminMode: false,
  toggleAdminMode: () => {},
})

export function AdminModeProvider({ children }: { children: ReactNode }) {
  const [adminMode, setAdminMode] = useState(() => {
    try {
      return localStorage.getItem(ADMIN_MODE_STORAGE_KEY) === 'true'
    } catch {
      return false
    }
  })

  const toggleAdminMode = () => {
    setAdminMode((prev) => {
      const next = !prev
      try {
        localStorage.setItem(ADMIN_MODE_STORAGE_KEY, String(next))
      } catch {
        // localStorage unavailable
      }
      return next
    })
  }

  return (
    <AdminModeContext.Provider value={{ adminMode, toggleAdminMode }}>
      {children}
    </AdminModeContext.Provider>
  )
}

export function useAdminMode(): AdminModeState {
  return useContext(AdminModeContext)
}
