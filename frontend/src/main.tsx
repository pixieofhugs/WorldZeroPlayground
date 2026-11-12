import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { I18nextProvider } from 'react-i18next'
import App from './App'
import { AuthProvider } from './auth/AuthContext'
import { AdminModeProvider } from './auth/AdminModeContext'
import { SidebarProvider } from './hooks/useSidebarPanels'
import { ThemeProvider } from './hooks/useTheme'
import { MotionProvider } from './hooks/useMotion'
import i18n, { loadCopyOverrides } from './i18n'
import './index.css'

// Deliberately not awaited: first paint must not wait on copy overrides.
void loadCopyOverrides()

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <I18nextProvider i18n={i18n}>
      {/* Outermost so every surface flips on one toggle (#701). */}
      <ThemeProvider>
        {/* Device-local animations setting (#2154), painted onto `<html>`. */}
        <MotionProvider>
          <BrowserRouter>
            <AuthProvider>
              {/* Inside AuthProvider to see session changes, but its fetch must
                  not wait on `/auth/me` (#1344). */}
              <SidebarProvider>
                <AdminModeProvider>
                  <App />
                </AdminModeProvider>
              </SidebarProvider>
            </AuthProvider>
          </BrowserRouter>
        </MotionProvider>
      </ThemeProvider>
    </I18nextProvider>
  </React.StrictMode>,
)
