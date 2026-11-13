import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useAuth } from '../../auth/AuthContext'
import { useSidebarPanels } from '../../hooks/useSidebarPanels'
import { REQUESTS_QUEUE_LINK } from '../../pages/updates/requestsQueueAnchor'
import PendingBadge from './PendingBadge'

/**
 * Mobile chrome, top: sticky wordmark bar with bell + Settings (#495/#520).
 * Does NOT wrap the page, so a breakpoint flip never remounts it (#1116).
 */
export default function MobileHeader() {
  const { t } = useTranslation('common')
  const { user } = useAuth()
  // Shared provider read; costs no request (#1344).
  const { pending_requests_count: pendingCount } = useSidebarPanels()

  // Literal keys, not a template (copy sweep / typed `t()`).
  const bellLabel =
    pendingCount > 0 ? t('nav.bellWithPending', { count: pendingCount }) : t('nav.bell')

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
      {user && (
        <div className="flex items-center gap-3">
          {/* Bell → the Requests queue (#572). Not a generic notification bell
              (#2083): it counts obligations only, which the home feed excludes
              (ADR-0070), so it is named after the queue and links its anchor. */}
          <Link
            to={REQUESTS_QUEUE_LINK}
            // Badge is aria-hidden, so the count rides the accessible name (#1457).
            aria-label={bellLabel}
            title={bellLabel}
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
            <PendingBadge count={pendingCount} className="absolute" style={{ top: -2, right: -4 }} />
          </Link>
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
