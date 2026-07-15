import { useTranslation } from 'react-i18next'
import { listPraxes } from '../api/praxis'
import PraxisCard from '../components/PraxisCard'
import CollaborationCard from '../components/CollaborationCard'
import PageTitle from '../components/ui/PageTitle'
import { extractError } from '../utils/errors'
import { useResource } from '../hooks/useResource'

export default function Praxes() {
  const { t } = useTranslation('praxis')
  const { t: tc } = useTranslation('common')
  const { data, loading, error } = useResource(
    () =>
      Promise.all([
        listPraxes({ type: 'solo', status: 'submitted' }),
        listPraxes({ type: 'collab', status: 'submitted' }),
        listPraxes({ type: 'duel', status: 'submitted' }),
      ]),
    [],
  )
  const soloItems = data ? data[0] : []
  const collabItems = data ? [...data[1], ...data[2]] : []

  const isEmpty = soloItems.length === 0 && collabItems.length === 0

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
