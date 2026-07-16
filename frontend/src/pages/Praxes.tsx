import { useTranslation } from 'react-i18next'
import PraxisCard from '../components/PraxisCard'
import PageTitle from '../components/ui/PageTitle'
import { extractError } from '../utils/errors'
import { useFormFactor } from '../hooks/useFormFactor'
import { usePraxes } from './praxes/usePraxes'
import MobilePraxisFeed from './praxes/MobilePraxisFeed'

/**
 * Praxis feed. `usePraxes()` owns the 3-way (solo / collab / duel) fetch; on a
 * phone (#499) `useFormFactor() === 'mobile'` swaps the wrapped desktop card
 * grid for the single-column mobile proof stream. Desktop renders exactly as
 * before.
 */
export default function Praxes() {
  const { t } = useTranslation('praxis')
  const { t: tc } = useTranslation('common')
  const formFactor = useFormFactor()
  const state = usePraxes()
  const { soloItems, collabItems, loading, error, isEmpty } = state

  if (formFactor === 'mobile') return <MobilePraxisFeed state={state} />

  return (
    <div className="py-8">
      <PageTitle title={t('listPage.title')} />
      <p className="font-body text-sm text-muted mb-6">
        {t('listPage.intro')}
      </p>

      {loading ? (
        <p className="font-body text-muted">{t('listPage.loading')}</p>
      ) : error ? (
        <p className="font-body text-sm text-red-600 border-2 border-red-300 px-3 py-2">
          {extractError(error, "Couldn't load praxes.")}{' '}
          <button onClick={() => window.location.reload()} className="underline">{tc('states.tryRefreshing')}</button>
        </p>
      ) : isEmpty ? (
        <p className="font-body text-muted">{t('listPage.empty')}</p>
      ) : (
        <div className="flex flex-wrap gap-4 items-start">
          {[...soloItems, ...collabItems].map((p) => (
            <PraxisCard key={`praxis-${p.id}`} praxis={p} />
          ))}
        </div>
      )}
    </div>
  )
}
