import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { listPraxes, type PraxisCardOut } from '../api/praxis'
import PraxisCard from '../components/PraxisCard'
import CollaborationCard from '../components/CollaborationCard'
import PageTitle from '../components/ui/PageTitle'
import { extractError } from '../utils/errors'

export default function Praxes() {
  const { t } = useTranslation('praxis')
  const { t: tc } = useTranslation('common')
  const [soloItems, setSoloItems] = useState<PraxisCardOut[]>([])
  const [collabItems, setCollabItems] = useState<PraxisCardOut[]>([])
  const [loading, setLoading] = useState(true)
  const [fetchError, setFetchError] = useState<string | null>(null)

  useEffect(() => {
    Promise.all([
      listPraxes({ type: 'solo', status: 'submitted' }),
      listPraxes({ type: 'collab', status: 'submitted' }),
      listPraxes({ type: 'duel', status: 'submitted' }),
    ])
      .then(([solo, collab, duel]) => {
        setSoloItems(solo)
        setCollabItems([...collab, ...duel])
      })
      .catch((err) => setFetchError(extractError(err, "Couldn't load praxes.")))
      .finally(() => setLoading(false))
  }, [])

  const isEmpty = soloItems.length === 0 && collabItems.length === 0

  return (
    <div className="py-8">
      <PageTitle title={t('listPage.title')} />
      <p className="font-body text-sm text-muted mb-6">
        {t('listPage.intro')}
      </p>

      {loading ? (
        <p className="font-body text-muted">{t('listPage.loading')}</p>
      ) : fetchError ? (
        <p className="font-body text-sm text-red-600 border-2 border-red-300 px-3 py-2">
          {fetchError}{' '}
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
