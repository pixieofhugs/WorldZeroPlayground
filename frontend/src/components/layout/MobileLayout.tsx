import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useAuth } from '../../auth/AuthContext'
import { usePendingRequests } from '../../hooks/usePendingRequests'
import MobileTabBar from './MobileTabBar'

/**
 * Mobile shell: a minimal top wordmark bar, full-bleed main (no sidebar, no
 * desktop grid), and the bottom MobileTabBar. Secondary controls (theme,
 * logout, admin, profile) move behind the Settings affordance per the design
 * issue (#495/#520); the shared frame (backdrop, watchers, effects) lives in
 * Layout.
 */
export default function MobileLayout({ children }: { children: ReactNode }) {
  const { t } = useTranslation('common')
  const { user } = useAuth()
  // Same pending-request count the desktop sidebar surfaces; drives the bell
  // badge so the Updates page is reachable from the phone header (#572).
  const { pendingRequests } = usePendingRequests()
  const pendingCount = pendingRequests.length

  return (
    <>
      <header
        className="sticky top-0 flex items-center justify-between px-4 h-12"
        style={{
          zIndex: 10,
          background: 'var(--color-nav-bg)',
          backdropFilter: 'blur(var(--nav-blur))',
          borderBottom: '1px solid var(--color-border)',
        }}
      >
        <Link to="/" className="font-display italic" style={{ fontSize: 'var(--text-content)', color: 'var(--color-text-primary)', textDecoration: 'none' }}>
          {t('brand')}
        </Link>
        {/* Right-side header controls — only meaningful when signed in. */}
        {user && (
          <div className="flex items-center gap-3">
            {/* Bell → Updates. The only phone entry point to the Updates page
                (#572); carries the same pending-request badge as the sidebar. */}
            <Link
              to="/updates"
              aria-label={t('nav.updates')}
              className="relative flex items-center"
              style={{ color: 'var(--color-text-secondary)', textDecoration: 'none', padding: '4px 2px' }}
            >
              <svg
                width="20"
                height="20"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.75"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
              >
                <path d="M18 8a6 6 0 0 0-12 0c0 7-3 9-3 9h18s-3-2-3-9" />
                <path d="M13.73 21a2 2 0 0 1-3.46 0" />
              </svg>
              {pendingCount > 0 && (
                <span
                  aria-hidden="true"
                  className="absolute flex items-center justify-center font-body"
                  style={{
                    top: -2,
                    right: -4,
                    minWidth: 15,
                    height: 15,
                    padding: '0 3px',
                    borderRadius: 999,
                    fontSize: 'var(--text-sm)',
                    fontWeight: 700,
                    lineHeight: 1,
                    color: 'var(--color-text-on-accent)',
                    background: 'var(--badge-collab)',
                  }}
                >
                  {pendingCount}
                </span>
              )}
            </Link>
            {/* Settings / More affordance — the phone path to theme + sign out +
                character management (#520). */}
            <Link
              to="/settings"
              aria-label={t('settings.title')}
              className="eyebrow"
              style={{
                color: 'var(--color-text-secondary)',
                textDecoration: 'none',
                padding: '4px 2px',
              }}
            >
              {t('settings.open')}
            </Link>
          </div>
        )}
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
