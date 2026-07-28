/**
 * Praxis detail dispatcher.
 *
 * Loads praxis + votes once via `usePraxisDetail(id)` and selects the right
 * faction-archetype page based on `praxis.task_faction_slug`. Every archetype
 * consumes the same `PraxisDetailState`; only the visual treatment differs.
 * Mirrors the TaskDetail / EditPraxis dispatchers. The loading / error /
 * not-found guards live here so archetypes can assume a non-null praxis.
 *
 * ONE ARCHETYPE PER FACTION, NOT TWO (#1088, ADR-0056/0058 terms). The
 * `formFactor === 'mobile'` branch is gone: this always dispatches through the
 * `praxisDetail` surface and the archetype calls `useFormFactor()` itself for
 * its own size set — the shape task cards and task detail already use. The
 * `mobilePraxisDetail` archetypes stay registered but are no longer reachable
 * from here; #1089 deletes them.
 */
import { useTranslation } from 'react-i18next'
import { Navigate, useParams } from 'react-router-dom'
import { usePraxisDetail } from './praxisDetail/usePraxisDetail'
import { pickVariant } from '../utils/factionDispatch'
import { surfaceMap } from '../factions'
import DefaultPraxisDetail from './praxisDetail/archetypes/DefaultPraxisDetail'
import CommentThread from '../components/comments/CommentThread'
import DuelCrossLink from './praxisDetail/DuelCrossLink'

export default function PraxisDetail() {
  const { t } = useTranslation('praxis')
  const { id } = useParams<{ id: string }>()
  const state = usePraxisDetail(id)

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

  const Archetype = pickVariant(
    surfaceMap('praxisDetail'),
    state.praxis.task_faction_slug,
    DefaultPraxisDetail,
  )
  // ADR-0061 makes comments the page LAYOUT's third region, so the rebuilt
  // Unaffiliated page mounts its own thread (amending ADR-0006's "neutral chrome
  // below every archetype"). The six legacy faction archetypes still expect the
  // dispatcher to mount it; they go with #1089, and this shim goes with them.
  // The identity test is exact: `pickVariant` hands back this very component for
  // every faction that registers no praxis-detail archetype of its own.
  const archetypeOwnsComments = Archetype === DefaultPraxisDetail
  return (
    <>
      {/* Duel cross-link is neutral chrome above every archetype (#313); one
          shared faction-tokened widget, per the grilled #310 decision. #1090
          replaces it with the design's duel card, inside the page layout. */}
      {state.duel && (
        <DuelCrossLink
          praxis={state.praxis}
          duel={state.duel}
          state={state}
          viewerCharacterId={state.user?.character?.id ?? null}
        />
      )}
      <Archetype state={state} />
      {!archetypeOwnsComments && state.praxis.moderation_status === 'visible' && (
        <div className="max-w-2xl">
          <CommentThread target="praxes" targetId={state.praxis.id} />
        </div>
      )}
    </>
  )
}
