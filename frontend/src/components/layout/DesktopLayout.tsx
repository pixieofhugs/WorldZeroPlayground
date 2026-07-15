import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useAuth } from '../../auth/AuthContext'
import NavBar from '../NavBar'
import Sidebar from './Sidebar'

/**
 * Desktop shell chrome: top NavBar, centered content grid with the sidebar, and
 * the footer. The shared frame (backdrop, global watchers, scroll/redirect
 * effects) lives in Layout; this renders only the desktop-native presentation.
 */
export default function DesktopLayout({ children }: { children: ReactNode }) {
  const { t } = useTranslation('common')
  const { user } = useAuth()

  return (
    <>
      <NavBar />

      {/* Page body: main content + sidebar (Style Guide §4.1) */}
      <div
        className="flex-1 relative max-w-5xl mx-auto w-full px-4 sm:px-6 py-5"
        style={{ zIndex: 5 }}
      >
        <div className={`gap-4 items-start ${user ? 'lg:grid lg:grid-cols-[1fr_256px]' : ''}`}>
          <main className="min-w-0">{children}</main>
          {user && (
            <div className="hidden lg:block">
              <Sidebar />
            </div>
          )}
        </div>
      </div>

      <footer
        className="relative font-body text-xs flex gap-6 flex-wrap max-w-5xl mx-auto w-full px-4 sm:px-6 py-4 mt-8"
        style={{ color: 'var(--color-text-tertiary)', zIndex: 5 }}
      >
        <Link to="/about" className="hover:underline">{t('footer.about')}</Link>
        <Link to="/contact" className="hover:underline">{t('footer.contact')}</Link>
        <Link to="/disclaimer" className="hover:underline">{t('footer.disclaimer')}</Link>
        <Link to="/attributions" className="hover:underline">{t('footer.attributions')}</Link>
        <Link to="/donate" className="hover:underline">{t('footer.donate')}</Link>
      </footer>
    </>
  )
}
