import { useEffect, type ReactNode } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useAuth } from '../auth/AuthContext'
import NavBar from './NavBar'
import { BackdropProvider } from './backdrop/BackdropContext'
import FactionBackdrop from './backdrop/FactionBackdrop'
import LevelUpWatcher from './LevelUpWatcher'
import InvitationWatcher from './InvitationWatcher'
import Sidebar from './layout/Sidebar'

export default function Layout({ children }: { children: ReactNode }) {
  const { t } = useTranslation('common')
  const { user, loading } = useAuth()
  const navigate = useNavigate()
  const { pathname } = useLocation()

  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: 'instant' })
  }, [pathname])

  useEffect(() => {
    if (!loading && user && !user.character && pathname !== '/characters/create') {
      navigate('/characters/create')
    }
  }, [user, loading, pathname, navigate])

  return (
    <BackdropProvider>
    <div className="min-h-screen flex flex-col relative">
      <FactionBackdrop />
      <LevelUpWatcher />
      <InvitationWatcher />

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
    </div>
    </BackdropProvider>
  )
}
