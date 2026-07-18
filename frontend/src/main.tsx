import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { I18nextProvider } from 'react-i18next'
import App from './App'
import { AuthProvider } from './auth/AuthContext'
import { AdminModeProvider } from './auth/AdminModeContext'
import { ThemeProvider } from './hooks/useTheme'
import i18n from './i18n'
import './index.css'

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <I18nextProvider i18n={i18n}>
      {/* One theme cell for the whole app (#701) — outermost so every surface,
          NavBar and Settings included, flips together on a single toggle. */}
      <ThemeProvider>
        <BrowserRouter>
          <AuthProvider>
            <AdminModeProvider>
              <App />
            </AdminModeProvider>
          </AuthProvider>
        </BrowserRouter>
      </ThemeProvider>
    </I18nextProvider>
  </React.StrictMode>,
)
