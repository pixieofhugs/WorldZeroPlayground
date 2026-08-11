import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useAuth } from '../../auth/AuthContext'
import { useSidebarPanels } from '../../hooks/useSidebarPanels'
import PendingBadge from './PendingBadge'

/**
 * Mobile shell chrome, top half: a minimal sticky wordmark bar with the bell +
 * Settings affordance. Secondary controls (theme, logout, admin, profile) live
 * behind Settings per the design issue (#495/#520).
 *
 * Chrome only — it deliberately does NOT wrap the page. `Layout` renders the
 * page region itself through `ShellContent` so that crossing the 767px
 * breakpoint swaps the chrome without remounting the page (#1116).
 */
export default function MobileHeader() {
  const { t } = useTranslation('common')
  const { user } = useAuth()
  // The same pending-request count the desktop rail surfaces, from the same
  // response; drives the bell badge so the Updates page is reachable from the
  // phone header (#572). Reading it here costs no request (#1344) — it used to
  // be a second, byte-identical limit-100 feed call, and until #1456 it was
  // still a list of items this only ever measured.
  const { pending_requests_count: pendingCount } = useSidebarPanels()

  return (
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
            // The badge is `aria-hidden` and colour-carried, so the count has to
            // ride the LINK's accessible name or it never reaches a screen
            // reader — same contract the sidebar handle's label meets (#1457).
            aria-label={
              pendingCount > 0
                ? t('nav.updatesWithPending', { count: pendingCount })
                : t('nav.updates')
            }
            className="relative flex items-center"
            style={{ color: 'var(--color-text-secondary)', textDecoration: 'none', padding: 'var(--space-xs)' }}
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
            {/* Pinned over the bell's top-right corner; the shape itself is
                shared with the sidebar handle and NavBar (#1457). */}
            <PendingBadge count={pendingCount} className="absolute" style={{ top: -2, right: -4 }} />
          </Link>
          {/* Settings / More affordance — the phone path to theme + sign out +
              character management (#520). */}
          <Link
            to="/settings"
            aria-label={t('settings.title')}
            className="label-caption"
            style={{
              textDecoration: 'none',
              padding: 'var(--space-xs)',
            }}
          >
            {t('settings.open')}
          </Link>
        </div>
      )}
    </header>
  )
}
