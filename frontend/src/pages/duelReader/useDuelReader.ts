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
import { arrivedFromSide } from './reader'

/** The two entries, keyed the way the payload names them. */
export type DuelReaderPraxes = Record<DuelSideKey, PraxisOut>

export interface DuelReaderState {
  loading: boolean
  fetchError: string | null
  /** Null while in flight, and after a failed load. */
  duel: DuelDetailOut | null
  /** Both praxes, or null until both have landed — this page never draws one. */
  praxes: DuelReaderPraxes | null
  /**
   * The side whose page the reader was opened from, or `null` on a deep link.
   * Dresses the ground and decides which panel opens on a phone.
   */
  arrivedFrom: DuelSideKey | null
  /** The authenticated viewer, or null. Half of the caster gate. */
  user: CurrentUser | null
}

/** `?from=<praxis id>`, or null where it is absent or not a number. */
function fromParam(raw: string | null): number | null {
  if (raw == null) return null
  const id = Number.parseInt(raw, 10)
  return Number.isNaN(id) ? null : id
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
    if (!idParam) return
    const duelId = Number.parseInt(idParam, 10)
    if (Number.isNaN(duelId)) {
      setLoading(false)
      return
    }

    let cancelled = false
    setLoading(true)
    setFetchError(null)

    getDuelDetail(duelId)
      .then(async (payload) => {
        const challengerId = payload.challenger.praxis_id
        const opponentId = payload.opponent.praxis_id
        // Half a duel is not a reading surface. The route's own guard states
        // this too; here it is what keeps `praxes` from ever being partial.
        if (challengerId == null || opponentId == null) {
          if (!cancelled) setDuel(payload)
          return
        }
        const [challenger, opponent] = await Promise.all([
          getPraxis(challengerId),
          getPraxis(opponentId),
        ])
        if (cancelled) return
        setDuel(payload)
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
  const challengerTally = useCastTally(praxes?.challenger.id ?? -1)
  const opponentTally = useCastTally(praxes?.opponent.id ?? -1)

  const displayPraxes: DuelReaderPraxes | null = praxes && {
    challenger: challengerTally
      ? applyCastTally(praxes.challenger, challengerTally)
      : praxes.challenger,
    opponent: opponentTally
      ? applyCastTally(praxes.opponent, opponentTally)
      : praxes.opponent,
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
    arrivedFrom: duel ? arrivedFromSide(duel, fromParam(search.get('from'))) : null,
    user,
  }
}
