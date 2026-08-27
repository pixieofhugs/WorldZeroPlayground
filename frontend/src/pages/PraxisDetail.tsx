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
 * ALL EIGHT FACTIONS NOW OVERRIDE `praxisDetail` (epic #1085, closed 2026-07-28).
 * #1089 de-registered every skin and this docstring recorded an empty registry;
 * the nine designs then landed one at a time — #1117 Coven, #1118 S.N.I.D.E.,
 * #1119 UA, #1120 Ephemerists, #1121 WOW, #1122 Singularity, #1123 Everymen,
 * #1140 Albescent — over #1090's shared page. So `surfaceMap('praxisDetail')`
 * carries a row per registered slug, and the fallback below is what `na` and any
 * unregistered slug get: `DefaultPraxisDetail`, which IS the Unaffiliated page.
 *
 * Every skin is dress over the SAME layout and the same API contract (ADR-0061),
 * which is what makes the registry uninteresting to read: nothing here branches
 * on who registered. `AlbescentPraxisDetail` is the far end of that — a wrapper
 * that forwards `DefaultPraxisDetail` whole and washes light over it, since
 * Albescent is hiding and has no palette of its own.
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

  // ADR-0062: detail is a published-only reading surface. State the rule by
  // INTENT, not by enum — drafting, mid-consensus, or waiting on a rival: all
  // composer. `in_progress` is the draft (ADR-0024, member-only); `pending` is
  // a collab mid-consensus and is collab-ONLY — a duel side that has cast is
  // `submitted` with the duel still active, so never reach for `pending` to
  // mean "waiting on the other party". Only members can load either status
  // (praxis_visibility_condition), and #1071's waiting surface gives every one
  // of them somewhere to land, so this redirect cannot strand a viewer.
  if (state.praxis.status === 'in_progress' || state.praxis.status === 'pending') {
    return <Navigate to={`/praxis/${state.praxis.id}/edit`} replace />
  }

  const Archetype = resolveVariant(
    surfaceMap('praxisDetail'),
    state.praxis.task_faction_slug,
  )
  // NOTHING IS MOUNTED AROUND THE ARCHETYPE. The two pieces of chrome that could
  // sit here both live INSIDE the page layout instead:
  //
  //  - The comment thread. ADR-0061 made comments the page's third region — the
  //    archetype mounts its own via the shared `PraxisDetailComments` slot,
  //    which carries the `visible` gate so a skin cannot forget it (amending
  //    ADR-0006's "neutral chrome below every archetype").
  //  - The duel cross-link (#313/#718, #1090) — the design's duel card, drawn in
  //    the archetype's own aside. A faction dresses the duel by dressing its
  //    `praxisDetail`, not by registering a second skin.
  return <Archetype state={state} />
}
