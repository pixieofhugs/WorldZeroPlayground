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
import i18n from './i18n'
import './index.css'

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <I18nextProvider i18n={i18n}>
      {/* One theme cell for the whole app (#701) — outermost so every surface,
          NavBar and Settings included, flips together on a single toggle. */}
      <ThemeProvider>
        {/* The device-local animations setting (#2154), beside the theme for
            the same reason: one cell, painted onto `<html>`, read by the
            Appearance switch and by the whole stylesheet under it. */}
        <MotionProvider>
          <BrowserRouter>
            <AuthProvider>
              {/* Inside AuthProvider so it can notice the session changing, but
                  NOT waiting on it: its fetch goes out in the first wave beside
                  `/auth/me`, not behind it (#1344). */}
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
