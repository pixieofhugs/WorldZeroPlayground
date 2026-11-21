import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useAdminMode } from '../../auth/AdminModeContext'
import { useAdminCounts } from '../../pages/admin/useAdminCounts'
import './modMode.css'

/** The You sheet's Moderation group (#3761): the phone's home for what ModControl does on desktop. Lazy, so players never fetch it or the counts. */
export default function ModGroup({ onNavigate }: { onNavigate: () => void }) {
  const { t } = useTranslation('admin')
  const { adminMode, toggleAdminMode } = useAdminMode()
  const counts = useAdminCounts('you-sheet')
  const total = (counts.reports ?? 0) + (counts.messages ?? 0) + (counts.proposals ?? 0)

  return (
    <>
      <div className="you-group">{t('nav.mod.group')}</div>
      <button
        type="button"
        role="switch"
        aria-checked={adminMode}
        className="you-row mod-item"
        onClick={toggleAdminMode}
      >
        <span className="you-row__text">{t('nav.mod.modeLabel')}</span>
        <span className="mod-switch" aria-hidden="true" />
      </button>
      <Link
        to="/admin"
        className="you-row"
        onClick={onNavigate}
        aria-label={total > 0 ? t('nav.mod.queueWithCount', { count: total }) : undefined}
      >
        <span className="you-row__text">
          {t('nav.mod.queue')}
          <span className="you-row__sub">
            {t('nav.mod.queueReports', { count: counts.reports ?? 0 })} ·{' '}
            {t('nav.mod.queueMessages', { count: counts.messages ?? 0 })} ·{' '}
            {t('nav.mod.queueProposals', { count: counts.proposals ?? 0 })}
          </span>
        </span>
        {total > 0 && (
          <span className="mod-ct" aria-hidden="true">
            {total}
          </span>
        )}
        <span aria-hidden="true">›</span>
      </Link>
    </>
  )
}
