import { useTranslation } from 'react-i18next'
import PraxisCard from '../../components/PraxisCard'
import CollaborationCard from '../../components/CollaborationCard'
import type { PraxesFeedState } from './usePraxes'

/**
 * Mobile praxis feed (#499/#565) — a single-column vertical proof stream. Each
 * card picks its own faction skin from its item's data (the bespoke
 * `PraxisCard` / `CollaborationCard` per-item dispatch), so a mixed feed shows
 * every faction's own card archetype instead of theming the whole page to one
 * faction. Solo + collab/duel are merged into one stream, matching the Field
 * Kit §05 praxis feed.
 *
 * Presentation-only: data arrives via {@link PraxesFeedState}. Single-column, no
 * fixed-px layout grid (SPEC-faction-ui-profile §1a).
 */
export default function MobilePraxisFeed({ state }: { state: PraxesFeedState }) {
  const { t } = useTranslation('praxis')
  const { t: tc } = useTranslation('common')
  const { soloItems, collabItems, loading, error, isEmpty } = state

  return (
    <div data-feed="mobile" className="page" style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      <header>
        <div className="eyebrow" style={{ fontSize: 8, color: 'var(--color-text-secondary)' }}>
          {tc('nav.praxis')}
        </div>
        <h1
          className="font-display italic"
          style={{ fontSize: 30, lineHeight: 1, color: 'var(--color-text-primary)', margin: 0 }}
        >
          {t('listPage.title')}
        </h1>
      </header>

      {loading ? (
        <p className="font-body text-muted">{t('listPage.loading')}</p>
      ) : error ? (
        <p className="font-body text-sm text-red-600 border-2 border-red-300 px-3 py-2">
          {t('detail.errors.load')}{' '}
          <button onClick={() => window.location.reload()} className="underline">
            {tc('states.tryRefreshing')}
          </button>
        </p>
      ) : isEmpty ? (
        <p className="font-body text-muted">{t('listPage.empty')}</p>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {soloItems.map((p) => (
            <PraxisCard key={`praxis-${p.id}`} praxis={p} />
          ))}
          {collabItems.map((c) => (
            <CollaborationCard key={`collab-${c.id}`} collab={c} />
          ))}
        </div>
      )}
    </div>
  )
}
