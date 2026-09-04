/**
 * The settled-duel side-by-side reader's dispatcher (#1084) — the twin of
 * `PraxisDetail.tsx`, and deliberately the same shape.
 *
 * ## WHY THIS IS A ROUTE AND NOT A BLOCK ON A PRAXIS PAGE
 *
 * The design's turn 1 put both bodies on one duellist's page, under that
 * duellist's vote, and dropped it in its own words: *"that reads as a page that
 * can't decide whose it is."* Turn 2 splits the two views, and the split is the
 * whole point. The SIDE view stays `praxisDetail` exactly as it ships — one
 * body, one Proof, one Write-up, one vote, all the host's — and grows a single
 * link row on `DuelCard`. This is the other half: a page for the DUEL, where
 * both columns are identical in kind and neither is the host's. It also keeps
 * the brief's §6 hard no — no two-pane workspace re-rendering what the detail
 * page already owns — because the two panes are on a different page from the
 * one that owns them.
 *
 * ## The guards live here, so an archetype can assume a whole duel
 *
 * Loading, error, not-found and the outcomes-only gate are all resolved before
 * dispatch. `readerMountsDuel` is the same pair `DuelCard` draws: `declined`
 * has no duel to read out, and `pending` / `active` are the run-up, which
 * belongs to the composer (ADR-0059) and which `_duel_side_hidden_condition`
 * (#999) keeps author-only anyway. A viewer who lands on one of those is sent
 * to the challenger's praxis, which is the page that can actually tell them
 * where the duel stands.
 *
 * ## Dispatched on the TASK's faction
 *
 * The same slug `praxisDetail` and every caster in the app dispatch on, and
 * what the one-ground ruling (2026-08-27) resolves to here: both duellists
 * share one task, so the ground is the same whichever side you arrived from.
 * See the chassis header.
 */
import { useTranslation } from 'react-i18next'
import { Navigate, useParams } from 'react-router-dom'
import { resolveVariant } from '../utils/factionDispatch'
import { surfaceMap } from '../factions'
import { useDuelReader } from './duelReader/useDuelReader'
import { readerMountsDuel } from './duelReader/reader'

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

  // Outcomes only. A duel that is not readable side by side still has a side
  // that IS readable, so this lands on it rather than on a dead end.
  if (!readerMountsDuel(state.duel) || !state.praxes) {
    const fallback = state.duel.challenger.praxis_id ?? state.duel.opponent.praxis_id
    if (fallback == null) {
      return <div className="py-8 font-body text-muted">{t('detail.notFound')}</div>
    }
    return <Navigate to={`/praxis/${fallback}`} replace />
  }

  const Archetype = resolveVariant(
    surfaceMap('duelReader'),
    state.praxes.challenger.task_faction_slug,
  )
  return <Archetype state={state} />
}
