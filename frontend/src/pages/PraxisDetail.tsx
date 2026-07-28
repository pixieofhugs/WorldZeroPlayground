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
 * its own size set — the shape task cards and task detail already use. #1089
 * deleted the `mobilePraxisDetail` surface outright, so there is no second
 * registry left to dispatch to.
 *
 * NO FACTION OVERRIDES `praxisDetail` TODAY (#1089, ADR-0061). Every slug falls
 * through to `DefaultPraxisDetail` — the Unaffiliated page IS the shared page,
 * and the seven other designs will re-register here as dress over the same
 * layout and the same API contract. `surfaceMap('praxisDetail')` is therefore
 * legitimately empty; that is override-only working as documented, not a
 * missing wire.
 */
import { useTranslation } from 'react-i18next'
import { Navigate, useParams } from 'react-router-dom'
import { usePraxisDetail } from './praxisDetail/usePraxisDetail'
import { pickVariant } from '../utils/factionDispatch'
import { surfaceMap } from '../factions'
import DefaultPraxisDetail from './praxisDetail/archetypes/DefaultPraxisDetail'
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

  // ADR-0062: detail is a published-only reading surface. State the rule by
  // INTENT, not by enum — drafting, mid-consensus, or waiting on a rival: all
  // composer. `in_progress` is the draft (ADR-0024, member-only); `pending` is
  // a collab mid-consensus and is collab-ONLY — a duel side that has cast is
  // `submitted` with the duel still active, so never reach for `pending` to
  // mean "waiting on the other party". Only members can load either status
  // (praxis_visibility_condition), and #1071's waiting surface gives every one
  // of them somewhere to land, so this redirect cannot strand a viewer.
  if (state.praxis.status === 'in_progress' || state.praxis.status === 'pending') {
    return <Navigate to={`/praxes/${state.praxis.id}/edit`} replace />
  }

  const Archetype = pickVariant(
    surfaceMap('praxisDetail'),
    state.praxis.task_faction_slug,
    DefaultPraxisDetail,
  )
  // No CommentThread here. ADR-0061 made comments the page LAYOUT's third
  // region — the archetype mounts its own via the shared `PraxisDetailComments`
  // slot, which carries the `visible` gate so a skin cannot forget it (amending
  // ADR-0006's "neutral chrome below every archetype"). #1088's shim kept the
  // dispatcher mounting a second thread for the six legacy archetypes; they are
  // gone with #1089, and the shim with them.
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
    </>
  )
}
