import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import PageTitle from '../components/ui/PageTitle'
import FactionSelectCard from '../components/selectCard/FactionSelectCard'
import type { SelectState } from '../components/selectCard/FactionSelectCard'
import { extractError } from '../utils/errors'
import { useAuth } from '../auth/AuthContext'
import { useFormFactor } from '../hooks/useFormFactor'
import DefaultFactionsDirectory from './factions/mobileArchetypes/DefaultFactionsDirectory'
import { useFactionsDirectory, type FactionsDirectoryState } from './factions/useFactionsDirectory'

const NA_SLUG = 'na'

const STATUS_MEMBER = 'member'
const STATUS_INVITED = 'invited'
const STATUS_NOT_INVITED = 'not_invited'
const STATUS_DEFECTED = 'defected'
const STATUS_CAN_RETURN = 'can_return'

/** System slugs hidden from the grid. */
const HIDDEN_SLUGS = new Set([NA_SLUG])

/**
 * Factions grid of preview tiles, ordered by the viewer's status. All
 * membership actions live on `/factions/:slug` (#347).
 */
export default function Factions() {
  const formFactor = useFormFactor()
  // Above the switch (#1116): crossing 767px re-dresses, doesn't refetch.
  const state = useFactionsDirectory()

  if (formFactor === 'mobile') return <DefaultFactionsDirectory state={state} />

  return <DesktopFactions state={state} />
}

/** Exported for tests: the desktop grid over a controlled state. */
export function DesktopFactions({ state }: { state: FactionsDirectoryState }) {
  const { t } = useTranslation('factions')
  const { user } = useAuth()
  const character = user?.character ?? null
  const navigate = useNavigate()

  const { factions, factionPage, loading } = state
  const error = state.error ? extractError(state.error, 'Could not load factions.') : null

  const statusFor = (slug: string): string => {
    if (!factionPage) return STATUS_NOT_INVITED
    const entry = factionPage.all_factions.find((f) => f.slug === slug)
    return entry?.status ?? STATUS_NOT_INVITED
  }

  if (loading) return <div className="py-8 font-body text-muted">{t('index.loading')}</div>

  const visibleFactions = factions.filter((f) => !HIDDEN_SLUGS.has(f.slug))

  const statusPriority: Record<string, number> = {
    [STATUS_MEMBER]: 0,
    [STATUS_INVITED]: 1,
    [STATUS_CAN_RETURN]: 2,
    [STATUS_NOT_INVITED]: 3,
    [STATUS_DEFECTED]: 4,
  }
  const sortedFactions = [...visibleFactions].sort((a, b) => {
    const sa = statusPriority[statusFor(a.slug)] ?? 3
    const sb = statusPriority[statusFor(b.slug)] ?? 3
    return sa - sb
  })

  // Status alone decides it: a held letter always implies member / can_return
  // / invited (#2310; status and letters share one select, #1384).
  const selectState = (slug: string): SelectState => {
    const status = statusFor(slug)
    if (status === STATUS_MEMBER) return 'member'
    if (status === STATUS_INVITED || status === STATUS_CAN_RETURN) return 'eligible'
    return 'locked'
  }

  return (
    <div className="py-8">
      <PageTitle title="Factions" />

      {error && (
        <p className="font-body content-text danger-text border-2 danger-edge px-3 py-2 mb-4">{error}</p>
      )}

      {!character && (
        <p className="font-body content-text text-muted mb-6">
          {t('index.loggedOutHint')}
        </p>
      )}

      {/* Stretch + column items (#3139) so a `SelectCardFrame` fills the row
          height and the calls line up along the bottom. */}
      <div
        data-testid="faction-tile-row"
        style={{ display: 'flex', flexWrap: 'wrap', gap: 'var(--space-2xl)', alignItems: 'stretch' }}
      >
        {sortedFactions.map((f) => (
          <div
            key={f.slug}
            style={{
              display: 'flex',
              flexDirection: 'column',
              opacity: statusFor(f.slug) === STATUS_DEFECTED ? 0.5 : 1,
            }}
          >
            <FactionSelectCard
              faction={f.slug}
              state={selectState(f.slug)}
              onVisit={() => navigate(`/factions/${f.slug}`)}
            />
          </div>
        ))}
      </div>
    </div>
  )
}
