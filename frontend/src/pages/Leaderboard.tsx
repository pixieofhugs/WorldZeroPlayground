import { useEffect, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { getLeaderboard } from '../api/leaderboard'
import { getNearbyAirports } from '../api/me'
import { listPraxes } from '../api/praxis'
import { listRelationships } from '../api/relationships'
import { useResource } from '../hooks/useResource'
import { useGameConfig } from '../hooks/useGameConfig'
import { useAuth } from '../auth/AuthContext'
import { extractError } from '../utils/errors'
import { useFormFactor } from '../hooks/useFormFactor'
import DesktopPlayers from './players/DesktopPlayers'
import MobilePlayers from './players/MobilePlayers'
import {
  NO_RELATIONSHIPS,
  PODIUM_SIZE,
  rankPlayers,
  type LatestPraxisMap,
  type ScoreMode,
  type ViewerRelationships,
} from './players/playersData'

/**
 * The Players page (#1855) — one data layer under `DesktopPlayers` /
 * `MobilePlayers`. Reads: `/leaderboard` (faction sums derive from it), three
 * podium `/praxes` after it lands (optional), `/relationships` when signed in.
 */
export default function Leaderboard() {
  const { t } = useTranslation('common')
  const { user } = useAuth()
  const config = useGameConfig()
  const formFactor = useFormFactor()
  // ponytail: one unpaginated fetch, everything ranked client-side; fine for
  // ~42 players, breaks in the high hundreds. Then move search/rank server-side.
  const { data, loading, error } = useResource(() => getLeaderboard({ limit: 500 }), [])
  const [scoreMode, setScoreMode] = useState<ScoreMode>('era')

  const characters = useMemo(() => data ?? [], [data])
  const myCharId = user?.character?.id ?? null
  // The toggle drives podium, faction totals and roster alike.
  const ranked = useMemo(() => rankPlayers(characters, scoreMode), [characters, scoreMode])
  const podiumIds = ranked.slice(0, PODIUM_SIZE).map((row) => row.character.id)

  const latest = useLatestPraxes(podiumIds)
  const related = useViewerRelationships(myCharId)

  // From `/game-config` (signed-out readers too); blank until it lands.
  let eyebrow = t('leaderboard.eyebrowAllTime')
  if (scoreMode === 'era') {
    eyebrow = config ? t('leaderboard.eyebrowEra', { era: config.era_name }) : ''
  }

  if (loading) {
    return (
      <div className="py-8">
        <p className="font-body content-text text-muted">{t('loading')}</p>
      </div>
    )
  }
  if (error) {
    return (
      <div className="py-8">
        <p className="font-body content-text danger-text border-2 danger-edge px-3 py-2">
          {extractError(error, t('leaderboard.loadError'))}{' '}
          <button onClick={() => window.location.reload()} className="underline">
            {t('states.tryRefreshing')}
          </button>
        </p>
      </div>
    )
  }
  if (characters.length === 0) {
    return (
      <div className="py-8">
        <p className="font-body content-text text-muted">{t('leaderboard.empty')}</p>
      </div>
    )
  }

  const view = { ranked, scoreMode, onScoreMode: setScoreMode, eyebrow, myCharId, related, latest }
  return formFactor === 'mobile' ? <MobilePlayers {...view} /> : <DesktopPlayers {...view} />
}

/**
 * Newest submitted praxis of the top three; the page never waits on them.
 * Not a `CharacterOut` field: no per-character work on a list path. Three fat
 * payloads is the accepted cost (`docs/agents/load-time.md`).
 */
function useLatestPraxes(characterIds: number[]): LatestPraxisMap {
  const [latest, setLatest] = useState<LatestPraxisMap>({})
  const key = characterIds.join(',')

  useEffect(() => {
    if (characterIds.length === 0) return
    let cancelled = false
    Promise.all(
      characterIds.map((id) =>
        listPraxes({ character_id: id, status: 'submitted', sort: 'newest', limit: 1 })
          .then((praxes) => praxes[0])
          .catch(() => undefined),
      ),
    ).then((results) => {
      if (cancelled) return
      const next: LatestPraxisMap = {}
      results.forEach((praxis, index) => {
        if (praxis) {
          next[characterIds[index]] = {
            taskTitle: praxis.task_title,
            submittedAt: praxis.submitted_at,
          }
        }
      })
      setLatest(next)
    })
    return () => {
      cancelled = true
    }
    // Keyed on the id list, not the (fresh each render) array.
  }, [key])

  return latest
}

/** The viewer's outgoing friend/foe edges; no request without a character. */
function useViewerRelationships(myCharId: number | null): ViewerRelationships {
  const [related, setRelated] = useState<ViewerRelationships>(NO_RELATIONSHIPS)

  useEffect(() => {
    if (myCharId == null) {
      setRelated(NO_RELATIONSHIPS)
      return
    }
    let cancelled = false
    Promise.all([
      listRelationships({ type: 'friend', status: 'active' }).catch(() => []),
      listRelationships({ type: 'foe', status: 'active' }).catch(() => []),
      getNearbyAirports().catch(() => null),
    ]).then(([friends, foes, nearby]) => {
      if (cancelled) return
      setRelated({
        friends: new Set(friends.map((edge) => edge.to_character_id)),
        foes: new Set(foes.map((edge) => edge.to_character_id)),
        nearby: nearby ? new Set(nearby) : null,
      })
    })
    return () => {
      cancelled = true
    }
  }, [myCharId])

  return related
}

/** For tests: under SSR `<Leaderboard/>` only ever renders Loading. */
export { default as DesktopLeaderboard } from './players/DesktopPlayers'
