/**
 * The settled-duel side-by-side reader's dispatcher (#1084), twin of
 * `PraxisDetail.tsx`. A page for the DUEL, separate from either side's praxis
 * page, so neither column is the host's.
 *
 * Guards resolve before dispatch, so an archetype assumes a whole readable
 * duel; `declined`/`pending`/`active` redirect to a side's praxis (ADR-0059,
 * #999). Dispatched on the TASK's faction: both sides share one ground.
 */
import { useTranslation } from 'react-i18next'
import { Navigate, useParams } from 'react-router-dom'
import { resolveVariant } from '../utils/factionDispatch'
import { surfaceMap } from '../factions'
import { duelReaderTask, useDuelReader } from './duelReader/useDuelReader'
import { readablePraxisId, readerMountsDuel } from './duelReader/reader'

export default function DuelReader() {
  const { t } = useTranslation(['praxis', 'common'])
  const { id } = useParams<{ id: string }>()
  const state = useDuelReader(id)

  if (state.loading) {
    return <div className="py-8 font-body text-muted">{t('common:loading')}</div>
  }
  if (state.fetchError) {
    return (
      <div className="py-8">
        <p className="font-body content-text danger-text border-2 danger-edge px-3 py-2">
          {state.fetchError}{' '}
          <button onClick={() => window.location.reload()} className="underline">
            {t('detail.retry')}
          </button>
        </p>
      </div>
    )
  }
  if (!state.duel) {
    return <div className="py-8 font-body text-muted">{t('detail.notFound')}</div>
  }

  // Outcomes only; else land on a readable side (submitted preferred). The
  // hook checks this gate before fetching bodies, or a 403 (#999) would show
  // as `fetchError` instead.
  if (!readerMountsDuel(state.duel) || !state.praxes) {
    const fallback =
      readablePraxisId(state.duel.challenger) ??
      readablePraxisId(state.duel.opponent) ??
      state.duel.challenger.praxis_id ??
      state.duel.opponent.praxis_id
    if (fallback == null) {
      return <div className="py-8 font-body text-muted">{t('detail.notFound')}</div>
    }
    return <Navigate to={`/praxis/${fallback}`} replace />
  }

  const Archetype = resolveVariant(
    surfaceMap('duelReader'),
    duelReaderTask(state.praxes)?.task_faction_slug,
  )
  return <Archetype state={state} />
}
