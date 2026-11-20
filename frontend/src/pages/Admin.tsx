import { Suspense, useEffect, useRef, useState } from 'react'
import { Link, Outlet, useLocation } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useDocumentTitle } from '../hooks/useDocumentTitle'
import AdminRail, { itemAt } from '../components/admin/AdminRail'
import { useAdminCounts } from './admin/useAdminCounts'
import './admin/adminConsole.css'

/** The console's own layout (#3665): a rail and the page, no player chrome. */
export default function Admin() {
  const { t } = useTranslation(['admin', 'common'])
  const [menuOpen, setMenuOpen] = useState(false)
  const { pathname } = useLocation()
  useEffect(() => setMenuOpen(false), [pathname])
  const { reload: reloadCounts, ...counts } = useAdminCounts(pathname)
  // Layout does this for the player pages; the console sits outside it.
  const lastPath = useRef(pathname)
  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: 'instant' })
    if (lastPath.current === pathname) return
    lastPath.current = pathname
    document.getElementById('content')?.focus({ preventScroll: true })
  }, [pathname])
  const item = itemAt(pathname)
  useDocumentTitle(item ? t(`console.rail.items.${item.key}`) : t('title'))
  const count = item?.count ? counts[item.count] : null

  return (
    <div className="adm">
      <header className="adm-bar">
        <Link to="/" className="adm-back">
          {t('console.rail.backShort')}
        </Link>
        <span className="adm-title">
          {item ? t(`console.rail.items.${item.key}`) : t('console.rail.sub')}
          {count ? (
            <span className={item?.badge === 'quiet' ? 'adm-count adm-count-q' : 'adm-count'} aria-label={t('console.rail.countLabel', { count })}>
              {count}
            </span>
          ) : null}
        </span>
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
      <AdminRail counts={counts} open={menuOpen} onNavigate={() => setMenuOpen(false)} />
      <main id="content" className="adm-main" tabIndex={-1}>
        <Suspense fallback={<p className="font-body text-muted">{t('common:loading')}</p>}>
          <Outlet context={{ reloadCounts }} />
        </Suspense>
      </main>
    </div>
  )
}
