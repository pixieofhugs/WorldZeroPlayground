import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { getOverview } from '../../api/admin'
import type { OverviewStats } from '../../api/admin'
import { extractError } from '../../utils/errors'

export default function OverviewTab() {
  const { t } = useTranslation(['admin', 'common'])
  const [stats, setStats] = useState<OverviewStats | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    getOverview()
      .then(setStats)
      .catch((err) => setError(extractError(err, t('overview.loadError'))))
  }, [t])

  if (error) return <p className="font-body text-sm text-red-600">{error}</p>
  if (!stats) return <div className="font-body text-muted text-sm">{t('common:loading')}</div>

  const items = [
    { label: t('overview.stats.accounts'), value: stats.accounts },
    { label: t('overview.stats.characters'), value: stats.characters },
    { label: t('overview.stats.activeTasks'), value: stats.active_tasks },
    { label: t('overview.stats.praxis'), value: stats.praxis },
    { label: t('overview.stats.votes'), value: stats.votes },
    { label: t('overview.stats.flagged'), value: stats.flagged_praxis, highlight: stats.flagged_praxis > 0 },
    { label: t('overview.stats.suspended'), value: stats.suspended_accounts, highlight: stats.suspended_accounts > 0 },
  ]

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
      {items.map(({ label, value, highlight }) => (
        <div
          key={label}
          className="card px-4 py-3 text-center"
          style={highlight ? { borderColor: 'rgba(220,38,38,0.4)' } : {}}
        >
          <p
            className="font-display text-3xl font-bold"
            style={highlight ? { color: '#dc2626' } : {}}
          >
            {value}
          </p>
          <p className="eyebrow mt-1" style={{ color: 'var(--color-text-tertiary)' }}>
            {label}
          </p>
        </div>
      ))}
    </div>
  )
}
