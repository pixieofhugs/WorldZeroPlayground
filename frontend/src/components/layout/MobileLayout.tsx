import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import MobileTabBar from './MobileTabBar'

/**
 * Mobile shell: a minimal top wordmark bar, full-bleed main (no sidebar, no
 * desktop grid), and the bottom MobileTabBar. Secondary controls (theme,
 * logout, admin, profile) move behind a More affordance per the design issue
 * (#495); the shared frame (backdrop, watchers, effects) lives in Layout.
 */
export default function MobileLayout({ children }: { children: ReactNode }) {
  const { t } = useTranslation('common')

  return (
    <>
      <header
        className="sticky top-0 flex items-center px-4 h-12"
        style={{
          zIndex: 10,
          background: 'var(--color-nav-bg)',
          backdropFilter: 'blur(var(--nav-blur))',
          borderBottom: '1px solid var(--color-border)',
        }}
      >
        <Link to="/" className="font-display italic" style={{ fontSize: 18, color: 'var(--color-text-primary)', textDecoration: 'none' }}>
          {t('brand')}
        </Link>
      </header>

      {/* Full-bleed main; bottom padding clears the fixed tab bar + safe area. */}
      <main
        className="flex-1 relative px-4 py-4"
        style={{ zIndex: 5, paddingBottom: 'calc(3.5rem + env(safe-area-inset-bottom))' }}
      >
        {children}
      </main>

      <MobileTabBar />
    </>
  )
}
