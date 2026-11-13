/**
 * The side-by-side reader's data hook (#1084), twin of `usePraxisDetail.ts`.
 *
 * `get_duel_detail` never carries a praxis body, so both bodies are fetched via
 * `GET /praxes/{id}` (owner decision): the existing `can_view_praxis` guard
 * applies and the columns render from `PraxisOut` like `praxisDetail`.
 *
 * Cast tallies merge into both the praxis and the duel's side row (#1239), so
 * the standing moves with the column's stamp.
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

/** The two bodies; a side is `null` on a forfeit ({@link readablePraxisId}). */
export type DuelReaderPraxes = Record<DuelSideKey, PraxisOut | null>

/** Whichever body is readable, for TASK fields only (equal across both sides).
 *  One helper so every task reader agrees on a forfeit. */
export function duelReaderTask(praxes: DuelReaderPraxes | null): PraxisOut | null {
  return praxes?.challenger ?? praxes?.opponent ?? null
}

export interface DuelReaderState {
  loading: boolean
  fetchError: string | null
  /** Null while in flight, and after a failed load. */
  duel: DuelDetailOut | null
  /** Null until the fetch settles; a side may still be null inside it. */
  praxes: DuelReaderPraxes | null
  /** The side opened from, or `null` on a deep link. */
  arrivedFrom: DuelSideKey | null
  /** Half of the caster gate. */
  user: CurrentUser | null
}

/** Digits or null; not `parseInt`, which reads '12-and-a-half' as 12. */
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

    // Clear on every id change so one duel's bodies never show under another.
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

        // Gate BEFORE fetching bodies: on pending/active the rival's praxis
        // 403s (#999), and that error would beat the route's redirect.
        if (!readerMountsDuel(payload)) return

        // Skip forfeited sides, which would 403 (`readablePraxisId`).
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

  // `-1` is the conventional "no praxis yet" id.
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
