import { Suspense, useEffect, useState } from 'react'
import { Link, Outlet, useLocation } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useDocumentTitle } from '../hooks/useDocumentTitle'
import AdminRail from '../components/admin/AdminRail'
import './admin/adminConsole.css'

/** The console's own layout (#3665): a rail and the page, no player chrome. */
export default function Admin() {
  const { t } = useTranslation(['admin', 'common'])
  useDocumentTitle(t('title'))
  const [menuOpen, setMenuOpen] = useState(false)
  const { pathname } = useLocation()
  useEffect(() => setMenuOpen(false), [pathname])

  return (
    <div className="adm">
      <header className="adm-bar">
        <Link to="/" className="adm-back">
          {t('console.rail.backShort')}
        </Link>
        <span className="adm-word">{t('console.rail.brand')}</span>
        <button
          type="button"
          className="adm-menu"
          aria-expanded={menuOpen}
          aria-controls="admin-rail"
          onClick={() => setMenuOpen((open) => !open)}
        >
          {t('console.rail.menu')}
        </button>
      </header>
      <AdminRail open={menuOpen} onNavigate={() => setMenuOpen(false)} />
      <main id="content" className="adm-main" tabIndex={-1}>
        <Suspense fallback={<p className="font-body text-muted">{t('common:loading')}</p>}>
          <Outlet />
        </Suspense>
      </main>
    </div>
  )
}
