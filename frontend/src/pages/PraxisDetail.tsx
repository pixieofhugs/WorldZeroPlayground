/**
 * Praxis detail dispatcher: loads via `usePraxisDetail(id)` and picks the
 * archetype by `praxis.task_faction_slug`; guards live here so archetypes can
 * assume a praxis. One archetype per faction at both widths (#1088). Every
 * skin dresses the same layout (ADR-0061); `na`/unknown get
 * `DefaultPraxisDetail`.
 */
import { useTranslation } from 'react-i18next'
import { Navigate, useParams } from 'react-router-dom'
import { usePraxisDetail } from './praxisDetail/usePraxisDetail'
import { resolveVariant } from '../utils/factionDispatch'
import { surfaceMap } from '../factions'

export default function PraxisDetail() {
  const { t } = useTranslation(['praxis', 'common'])
  const { id } = useParams<{ id: string }>()
  const state = usePraxisDetail(id)

  if (state.loading) return <div className="py-8 font-body text-muted">{t('common:loading')}</div>
  if (state.fetchError) return (
    <div className="py-8">
      <p className="font-body content-text danger-text border-2 danger-edge px-3 py-2">
        {state.fetchError}{' '}
        <button onClick={() => window.location.reload()} className="underline">{t('detail.retry')}</button>
      </p>
    </div>
  )
  if (!state.praxis) return <div className="py-8 font-body text-muted">{t('detail.notFound')}</div>

  // ADR-0062: detail is published-only; drafts (`in_progress`) and collabs
  // mid-consensus (`pending`, collab-ONLY — a cast duel side is `submitted`)
  // go to the composer. Only members can load either, so none is stranded.
  if (state.praxis.status === 'in_progress' || state.praxis.status === 'pending') {
    return <Navigate to={`/praxis/${state.praxis.id}/edit`} replace />
  }

  const Archetype = resolveVariant(
    surfaceMap('praxisDetail'),
    state.praxis.task_faction_slug,
  )
  // Comments (`PraxisDetailComments`, ADR-0061) and the duel card live inside
  // the archetype. Only an admin is sent a hidden praxis (#3257): bannered here.
  return (
    <>
      {state.praxis.moderation_status === 'hidden' && (
        <p role="status" className="font-body content-text danger-text border-2 danger-edge px-3 py-2 mb-4">
          {t('detail.hiddenBanner')}
        </p>
      )}
      <Archetype state={state} />
    </>
  )
}
