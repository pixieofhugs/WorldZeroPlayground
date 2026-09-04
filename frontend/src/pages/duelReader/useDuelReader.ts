/**
 * The side-by-side reader's data plumbing (#1084) — the twin of
 * `praxisDetail/usePraxisDetail.ts`, and the same contract shape: one hook, one
 * `DuelReaderState`, and every archetype consumes it without knowing how it was
 * filled.
 *
 * ## BOTH BODIES ARE FETCHED CLIENT-SIDE, AND NO BACKEND CHANGED
 *
 * `get_duel_detail` (`services/duel.py`) returns name, avatar, faction,
 * `points_from_votes` and `is_submitted` per side and **deliberately never a
 * praxis body** — its docstring says so in terms. #1084 left the build a choice:
 * fetch both praxes under `can_view_praxis`, or grow the duel payload under the
 * same guard. This takes the first, by owner decision.
 *
 * It costs one extra round trip and buys three things. The guard is the one
 * that already exists — `GET /praxes/{id}` runs `can_view_praxis` and
 * `_duel_side_hidden_condition` (#999) per praxis, so a live-incomplete side
 * stays author-only without this surface restating the rule. The payload is the
 * one every other reading surface consumes, so the two columns render from
 * `PraxisOut` exactly as `praxisDetail` does rather than from a second, thinner
 * shape that would drift. And nothing about `DuelDetailOut` moves, so the
 * generated schema and every existing consumer are untouched.
 *
 * The reader is `settled` / `resolved` only ({@link readerMountsDuel}), which is
 * the state pair in which both praxes are `submitted` and therefore visible to
 * everyone. So the second fetch is not a permissions gamble: a 403 here means
 * the duel is not readable at all, and the page says so rather than drawing one
 * column and a hole.
 *
 * ## THE CAST TALLY IS MERGED ON BOTH SIDES
 *
 * Three payloads carry the same figure — each praxis and the duel's two rows —
 * and #1239 is the bug where one of them did not learn about a cast. A viewer
 * who casts on the right-hand column must see the right-hand figure move in the
 * standing above as well as in that column's own stamp, so both merges happen
 * here, using the same helpers `usePraxisDetail` uses.
 */
import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useSearchParams } from 'react-router-dom'
import { getPraxis, type PraxisOut } from '../../api/praxis'
import { getDuelDetail, type DuelDetailOut } from '../../api/duel'
import { useAuth } from '../../auth/AuthContext'
import { extractError } from '../../utils/errors'
import { useCastTally } from '../../components/vote/castTallies'
import {
  applyCastTally,
  applyDuelCastTally,
} from '../../components/vote/useVotedPraxis'
import type { CurrentUser } from '../../api/auth'
import type { DuelSideKey } from './openSide'
import { arrivedFromSide, readablePraxisId, readerMountsDuel } from './reader'

/**
 * The two entries' BODIES, keyed the way the payload names them.
 *
 * A side is `null` when its praxis is not readable — which on this surface
 * means exactly one thing, a forfeit: unsubmitting a settled duel side throws
 * the contest and drops that praxis to `in_progress`, visible to its members
 * alone. See {@link readablePraxisId}. That column renders from the duel
 * payload, which is the frame the design already draws for a forfeit.
 */
export type DuelReaderPraxes = Record<DuelSideKey, PraxisOut | null>

/**
 * Whichever of the two bodies is readable — they answer the same questions
 * about the TASK, which is the only thing this is used for.
 *
 * Both duellists complete ONE task, so `task_id`, `task_title`,
 * `task_faction_slug`, `task_point_value` and `task_level_required` are equal
 * across the pair by construction. On a forfeit only one body exists, and the
 * three places that ask the task a question — the dispatch slug, the ground and
 * the reference band — must not each pick a side and each break differently.
 */
export function duelReaderTask(praxes: DuelReaderPraxes | null): PraxisOut | null {
  return praxes?.challenger ?? praxes?.opponent ?? null
}

export interface DuelReaderState {
  loading: boolean
  fetchError: string | null
  /** Null while in flight, and after a failed load. */
  duel: DuelDetailOut | null
  /**
   * The two bodies, or null until the fetch settles. A SIDE may be null inside
   * it even when this is not — see {@link DuelReaderPraxes}.
   */
  praxes: DuelReaderPraxes | null
  /**
   * The side whose page the reader was opened from, or `null` on a deep link.
   * Dresses the ground and decides which panel opens on a phone.
   */
  arrivedFrom: DuelSideKey | null
  /** The authenticated viewer, or null. Half of the caster gate. */
  user: CurrentUser | null
}

/**
 * A route or query id, or null where it is absent or not one.
 *
 * STRICT, not `parseInt`: `parseInt('12-and-a-half', 10)` is `12`, so a
 * malformed id would silently address a real row. Digits or nothing.
 */
function numericId(raw: string | null | undefined): number | null {
  if (raw == null || !/^\d+$/.test(raw)) return null
  return Number(raw)
}

export function useDuelReader(idParam: string | undefined): DuelReaderState {
  const { t } = useTranslation('praxis')
  const { user } = useAuth()
  const [search] = useSearchParams()

  const [duel, setDuel] = useState<DuelDetailOut | null>(null)
  const [praxes, setPraxes] = useState<DuelReaderPraxes | null>(null)
  const [loading, setLoading] = useState(true)
  const [fetchError, setFetchError] = useState<string | null>(null)

  useEffect(() => {
    const duelId = numericId(idParam)

    // Clear before anything else, on every id change. Leaving the previous
    // duel's rows up while a new one loads — or worse, under a malformed id
    // that never loads at all — shows one duel's bodies under another's
    // heading, which is worse than an empty page and looks exactly like a
    // stale render.
    setDuel(null)
    setPraxes(null)
    setFetchError(null)

    if (duelId == null) {
      setLoading(false)
      return
    }

    let cancelled = false
    setLoading(true)

    getDuelDetail(duelId)
      .then(async (payload) => {
        if (cancelled) return
        setDuel(payload)

        // THE GATE RUNS BEFORE ANY BODY IS FETCHED, and that ordering is the
        // whole point of it being here rather than only in the route. On
        // `pending` / `active` the rival's praxis is a guaranteed 403 for every
        // reader but its author (`duel_side_hidden_condition`, #999), so a
        // fetch-then-check would turn the route's designed redirect into an
        // error page — the failure would arrive first and win.
        if (!readerMountsDuel(payload)) return

        // Only the sides that are actually readable. A forfeited side keeps its
        // `praxis_id` and loses its visibility, so asking for it 403s and takes
        // the whole page down with it; that column is drawn from the duel
        // payload instead. See `readablePraxisId`.
        const challengerId = readablePraxisId(payload.challenger)
        const opponentId = readablePraxisId(payload.opponent)
        const [challenger, opponent] = await Promise.all([
          challengerId == null ? null : getPraxis(challengerId),
          opponentId == null ? null : getPraxis(opponentId),
        ])
        if (cancelled) return
        setPraxes({ challenger, opponent })
      })
      .catch((err) => {
        if (!cancelled) setFetchError(extractError(err, t('detail.errors.load')))
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [idParam, t])

  // The viewer's own just-cast vote, merged into all three payloads that carry
  // the figure (#1239) — this column's stamp AND that side's row in the
  // standing above it. `-1` is the "no praxis yet" id every caller of these
  // hooks uses; it can never collide with a real one.
  const challengerTally = useCastTally(praxes?.challenger?.id ?? -1)
  const opponentTally = useCastTally(praxes?.opponent?.id ?? -1)

  const merge = (
    praxis: PraxisOut | null,
    tally: ReturnType<typeof useCastTally>,
  ): PraxisOut | null => (praxis && tally ? applyCastTally(praxis, tally) : praxis)

  const displayPraxes: DuelReaderPraxes | null = praxes && {
    challenger: merge(praxes.challenger, challengerTally),
    opponent: merge(praxes.opponent, opponentTally),
  }
  const displayDuel = duel
    ? applyDuelCastTally(duel, {
        challenger: challengerTally,
        opponent: opponentTally,
      })
    : duel

  return {
    loading,
    fetchError,
    duel: displayDuel,
    praxes: displayPraxes,
    arrivedFrom: duel ? arrivedFromSide(duel, numericId(search.get('from'))) : null,
    user,
  }
}
