import { useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { getLeaderboard } from '../api/leaderboard'
import { useResource } from '../hooks/useResource'
import { useAuth } from '../auth/AuthContext'
import { extractError } from '../utils/errors'
import { FACTION_RAINBOW_ORDER, factionCssVar } from '../utils/factions'
import type { CharacterOut, CurrentUser } from '../api/auth'
import { useFormFactor } from '../hooks/useFormFactor'
import { pickVariant } from '../utils/factionDispatch'
import { useTheme } from '../hooks/useTheme'
import Constellation, { type RankedPlayer } from './players/Constellation'
import Meadow from './players/Meadow'
import SkyCanvas, { DESKTOP_SKY_MAX_WIDTH } from './players/SkyCanvas'
import SkyLegend from './players/SkyLegend'
import RosterTable from './players/RosterTable'
import DefaultPlayers, {
  type PlayersDirectoryProps,
} from './players/mobileArchetypes/DefaultPlayers'

type MobileSkin = (props: PlayersDirectoryProps) => JSX.Element
type ScoreMode = 'era' | 'alltime'

// Parallel MOBILE registry, mirroring Tasks. The players directory isn't keyed
// by a single faction slug, so this stays empty and every phone render falls
// through to the Default directory skin; bespoke faction directories can
// register here later.
export const MOBILE_ARCHETYPE_BY_SLUG: Record<string, MobileSkin> = {}

/** Orbs in the desktop sky. Mobile shows 6 (`DefaultPlayers`); at the ~294px
 *  radius the 900px stage yields there is room for 12 (#730 §2). */
const DESKTOP_SKY_POPULATION = 12

export default function Leaderboard() {
  const { user } = useAuth()
  // ponytail: one unpaginated fetch — search, sort, faction filter, rank and
  // paging are all computed client-side. This is deliberate for the current
  // ~42-player field and falls over in the high hundreds; when the roster
  // outgrows a single page, move search + count + rank server-side.
  const { data, loading, error } = useResource(() => getLeaderboard({ limit: 500 }), [])
  const formFactor = useFormFactor()
  const characters = data ?? []

  if (formFactor === 'mobile') {
    const Mobile = pickVariant(MOBILE_ARCHETYPE_BY_SLUG, null, DefaultPlayers)
    return (
      <Mobile
        characters={characters}
        loading={loading}
        error={error}
        myCharId={user?.character?.id ?? null}
      />
    )
  }

  return (
    <DesktopLeaderboard characters={characters} loading={loading} error={error} user={user} />
  )
}

/** Exported for the players tests: `<Leaderboard/>` renders its Loading branch
 *  under `renderToStaticMarkup` (no effect ever resolves the fetch), so asserting
 *  the theme→viz dispatch through the page wrapper would pass vacuously. */
export function DesktopLeaderboard({
  characters,
  loading,
  error,
  user,
}: {
  characters: CharacterOut[]
  loading: boolean
  error: Error | null
  user: CurrentUser | null
}) {
  const { t } = useTranslation('common')
  const { theme } = useTheme()
  const [scoreMode, setScoreMode] = useState<ScoreMode>('era')
  const myCharId = user?.character?.id ?? null

  // The viz is THEME-BOUND, not a user toggle (#684 §1): a night sky for dark,
  // a sunlit field for light. `useTheme` is the shared reactive cell (#701), so
  // flipping the theme swaps the viz live. Same props either way — the two are
  // siblings, not a component and its re-skin.
  const meadow = theme === 'light'

  const pointsOf = (character: CharacterOut) =>
    scoreMode === 'era' ? character.score : character.all_time_score

  // Sort is stable and the server already returns score DESC, id ASC, so ties
  // keep a deterministic order. Rank is the true global standing over everyone
  // (fixes the old 50-row-slice rank that stranded anyone past rank 50).
  const ranked: RankedPlayer[] = useMemo(() => {
    return [...characters]
      .sort((a, b) => pointsOf(b) - pointsOf(a))
      .map((character, index) => ({ character, rank: index + 1, points: pointsOf(character) }))
  }, [characters, scoreMode])

  const maxScore = ranked.length > 0 ? ranked[0].points : 0
  const factionCount = new Set(
    characters.map((c) => c.faction_slug).filter((slug): slug is string => slug != null),
  ).size

  const eyebrow =
    scoreMode === 'era'
      ? t('leaderboard.desktop.eyebrowEra', { era: user?.era_name ?? '' })
      : t('leaderboard.desktop.eyebrowAllTime')
  // The tagline names the ENCODING, so it has to follow the viz: the sky's
  // "closer to the sun" is a lie over a field where rank is depth, not radius.
  const tagline = meadow
    ? scoreMode === 'era'
      ? t('leaderboard.desktop.meadowTaglineEra')
      : t('leaderboard.desktop.meadowTaglineAllTime')
    : scoreMode === 'era'
      ? t('leaderboard.desktop.taglineEra')
      : t('leaderboard.desktop.taglineAllTime')

  if (loading) {
    return (
      <div className="py-8">
        <p className="font-body content-text text-muted">{t('leaderboard.loading')}</p>
      </div>
    )
  }
  if (error) {
    return (
      <div className="py-8">
        <p className="font-body content-text text-red-600 border-2 border-red-300 px-3 py-2">
          {extractError(error, t('leaderboard.mobile.loadError'))}{' '}
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

  return (
    <div className="py-8">
      {/* ── The sky ── */}
      <section>
        <div className="flex items-center justify-between gap-4 mb-1">
          <p className="eyebrow">{eyebrow}</p>
          <ScoreToggle mode={scoreMode} onChange={setScoreMode} />
        </div>

        <h1
          className="font-display italic font-medium leading-tight"
          style={{ fontSize: 'var(--text-display)', color: 'var(--color-text-primary)' }}
        >
          {t('leaderboard.desktop.title')}
        </h1>

        <p className="eyebrow mb-3">
          {t('leaderboard.desktop.playersCount', { count: characters.length })}
          {' · '}
          {t('leaderboard.desktop.factionsCount', { count: factionCount })}
        </p>

        {/* Rainbow rule — the faction spectrum, in canonical order. */}
        <div
          aria-hidden
          className="mb-3"
          style={{
            height: 3,
            borderRadius: 2,
            background: `linear-gradient(90deg, ${FACTION_RAINBOW_ORDER.map((slug) =>
              factionCssVar(slug),
            ).join(', ')})`,
          }}
        />

        <p
          className="mb-4"
          style={{
            fontFamily: 'var(--font-faction-script)',
            fontSize: 'var(--text-title)',
            color: 'var(--color-text-secondary)',
            lineHeight: 1.2,
          }}
        >
          {tagline}
        </p>

        {/* The stage measures itself and caps at 900px — desktop used to hand
            Constellation a hardcoded 620×460 island in a ~1200px box (#730 §1). */}
        <SkyCanvas
          players={ranked}
          maxScore={maxScore}
          myCharId={myCharId}
          population={DESKTOP_SKY_POPULATION}
          maxWidth={DESKTOP_SKY_MAX_WIDTH}
          viz={meadow ? Meadow : Constellation}
        />

        <SkyLegend scoreMode={scoreMode} variant={meadow ? 'meadow' : 'sky'} />
      </section>

      {/* ── Full roster ── */}
      <RosterTable players={ranked} myCharId={myCharId} />
    </div>
  )
}

function ScoreToggle({ mode, onChange }: { mode: ScoreMode; onChange: (mode: ScoreMode) => void }) {
  const { t } = useTranslation('common')
  const options: ReadonlyArray<{ value: ScoreMode; label: string }> = [
    { value: 'era', label: t('leaderboard.desktop.toggleEra') },
    { value: 'alltime', label: t('leaderboard.desktop.toggleAllTime') },
  ]
  return (
    <div className="flex" style={{ gap: 'var(--space-xs)', flex: 'none' }}>
      {options.map(({ value, label }) => {
        const active = mode === value
        return (
          <button
            key={value}
            type="button"
            onClick={() => onChange(value)}
            className="font-body uppercase"
            style={{
              fontSize: 'var(--text-base)',
              letterSpacing: '0.1em',
              padding: 'var(--space-xs) var(--space-md)',
              border: `2px solid ${active ? 'var(--color-text-primary)' : 'var(--color-border-strong)'}`,
              background: active ? 'var(--color-text-primary)' : 'var(--color-bg-surface)',
              color: active ? 'var(--color-bg-page)' : 'var(--color-text-primary)',
              cursor: 'pointer',
            }}
          >
            {label}
          </button>
        )
      })}
    </div>
  )
}
