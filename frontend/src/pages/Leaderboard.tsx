import { useEffect, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { getLeaderboard } from '../api/leaderboard'
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
 * The Players page (#1855) — ONE data layer under two form-factor surfaces.
 *
 * Everything fetched here is fetched once and shared: desktop and mobile draw
 * structurally different pages (see `DesktopPlayers` / `MobilePlayers`) over the
 * same rows, the same faction sums and the same relationships.
 *
 * Three reads, and no backend change behind any of them:
 *
 *  1. `GET /leaderboard` — the field. Faction points are derived from it, since
 *     a faction's score IS the sum of its members' scores (`factionStandings`).
 *  2. Three `GET /praxes` calls for the podium's "latest" footers, fired only
 *     AFTER the roster resolves. The page renders fully without them.
 *  3. `GET /relationships` for the Friends / Foes rail, only when signed in.
 */
export default function Leaderboard() {
  const { t } = useTranslation('common')
  const { user } = useAuth()
  const config = useGameConfig()
  const formFactor = useFormFactor()
  // ponytail: one unpaginated fetch — search, sort, faction filter, rank and
  // paging are all computed client-side. This is deliberate for the current
  // ~42-player field and falls over in the high hundreds; when the roster
  // outgrows a single page, move search + count + rank server-side.
  const { data, loading, error } = useResource(() => getLeaderboard({ limit: 500 }), [])
  const [scoreMode, setScoreMode] = useState<ScoreMode>('era')

  const characters = useMemo(() => data ?? [], [data])
  const myCharId = user?.character?.id ?? null
  // The toggle drives the WHOLE page: podium, faction totals and roster all
  // rank on the same resolved score.
  const ranked = useMemo(() => rankPlayers(characters, scoreMode), [characters, scoreMode])
  const podiumIds = ranked.slice(0, PODIUM_SIZE).map((row) => row.character.id)

  const latest = useLatestPraxes(podiumIds)
  const related = useViewerRelationships(myCharId)

  // The eyebrow names the live era, read from the era config — never a literal
  // (CLAUDE.md: never hardcode a value that lives in EraConfig). `/game-config`
  // answers signed-out readers too, which `user.era_name` cannot. Blank until
  // it lands, rather than a dangling separator in front of a missing name.
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
 * The podium's "latest" footers — the newest SUBMITTED praxis of the top three.
 *
 * Three requests, fired after the roster lands, and the page never waits on
 * them: a card whose call is still in flight, failed, or returned nothing
 * simply draws no footer. `CharacterOut` deliberately does not grow a
 * `latest_praxis` field for this — its docstring forbids per-character work on
 * a list path, and this is a 500-row list. `PraxisCardOut` is a fat payload;
 * three of them is the accepted cost (`docs/agents/load-time.md`).
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
    // Keyed on the id LIST, not the array: a fresh array identity every render
    // would refetch every render, and a score-mode toggle that does not change
    // who is on the podium should cost nothing.
  }, [key])

  return latest
}

/**
 * The viewer's own OUTGOING friend / foe edges, for the roster rail. Signed out
 * (or with no character) there is nothing to ask for and no rail to draw, so
 * the request is never made.
 */
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
    ]).then(([friends, foes]) => {
      if (cancelled) return
      setRelated({
        friends: new Set(friends.map((edge) => edge.to_character_id)),
        foes: new Set(foes.map((edge) => edge.to_character_id)),
      })
    })
    return () => {
      cancelled = true
    }
  }, [myCharId])

  return related
}

/** The desktop board, exported for the players tests: `<Leaderboard/>` renders
 *  its Loading branch under `renderToStaticMarkup` (no effect ever resolves the
 *  fetch), so asserting what the page draws through the wrapper would pass
 *  vacuously. */
export { default as DesktopLeaderboard } from './players/DesktopPlayers'
