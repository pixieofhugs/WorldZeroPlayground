/**
 * Praxis detail dispatcher.
 *
 * Loads praxis + votes once via `usePraxisDetail(id)` and selects the right
 * faction-archetype page based on `praxis.task_faction_slug`. Every archetype
 * consumes the same `PraxisDetailState`; only the visual treatment differs.
 * Mirrors the TaskDetail / EditPraxis dispatchers. The loading / error /
 * not-found guards live here so archetypes can assume a non-null praxis.
 */
import { useTranslation } from 'react-i18next'
import { Navigate, useParams } from 'react-router-dom'
import { usePraxisDetail } from './praxisDetail/usePraxisDetail'
import { pickVariant } from '../utils/factionDispatch'
import { surfaceMap } from '../factions'
import { useFormFactor } from '../hooks/useFormFactor'
import DefaultPraxisDetail from './praxisDetail/archetypes/DefaultPraxisDetail'
import DefaultMobilePraxisDetail from './praxisDetail/mobileArchetypes/DefaultPraxisDetail'
import CommentThread from '../components/comments/CommentThread'
import DuelCrossLink from './praxisDetail/DuelCrossLink'

export default function PraxisDetail() {
  const { t } = useTranslation('praxis')
  const { id } = useParams<{ id: string }>()
  const state = usePraxisDetail(id)
  const formFactor = useFormFactor()

  if (state.loading) return <div className="py-8 font-body text-muted">{t('detail.loading')}</div>
  if (state.fetchError) return (
    <div className="py-8">
      <p className="font-body content-text text-red-600 border-2 border-red-300 px-3 py-2">
        {state.fetchError}{' '}
        <button onClick={() => window.location.reload()} className="underline">{t('detail.retry')}</button>
      </p>
    </div>
  )
  if (!state.praxis) return <div className="py-8 font-body text-muted">{t('detail.notFound')}</div>

  // ADR-0024: the public detail view never renders a draft. Only members reach
  // here (the API 404s everyone else) — route them to the editor, the sole
  // surface for in_progress work.
  if (state.praxis.status === 'in_progress') {
    return <Navigate to={`/praxes/${state.praxis.id}/edit`} replace />
  }

  const Archetype =
    formFactor === 'mobile'
      ? pickVariant(surfaceMap('mobilePraxisDetail'), state.praxis.task_faction_slug, DefaultMobilePraxisDetail)
      : pickVariant(surfaceMap('praxisDetail'), state.praxis.task_faction_slug, DefaultPraxisDetail)
  return (
    <>
      {/* Duel cross-link is neutral chrome above every archetype (#313); one
          shared faction-tokened widget, per the grilled #310 decision. */}
      {state.duel && <DuelCrossLink praxis={state.praxis} duel={state.duel} state={state} />}
      <Archetype state={state} />
      {/* Comments are neutral chrome below every archetype (ADR-0006); a thread
          renders on a visible praxis only. Mounted at the dispatcher so it covers
          all faction archetypes, not just the default. */}
      {state.praxis.moderation_status === 'visible' && (
        <div className="max-w-2xl">
          <CommentThread target="praxes" targetId={state.praxis.id} />
        </div>
      )}
    </>
  )
}
