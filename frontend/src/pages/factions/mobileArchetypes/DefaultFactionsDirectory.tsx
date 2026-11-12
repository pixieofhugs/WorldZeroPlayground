import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useAuth } from '../../../auth/AuthContext'
import { extractError } from '../../../utils/errors'
import type { FactionsDirectoryState } from '../useFactionsDirectory'
import FactionsDirectoryView from './FactionsDirectoryView'

const NA_SLUG = 'na'

/**
 * The mobile factions-directory skin (no per-faction dispatch). Data comes from
 * the dispatcher's `useFactionsDirectory` (#1116); layout lives in the pure
 * `FactionsDirectoryView`. Card state comes from the status map alone: a held
 * letter already reads `member`, `can_return` or `invited` (#1384).
 */
export default function DefaultFactionsDirectory({ state }: { state: FactionsDirectoryState }) {
  const { t } = useTranslation('factions')
  const { user } = useAuth()
  const navigate = useNavigate()
  const currentSlug = user?.character?.faction_slug ?? null
  const unaffiliated = !currentSlug || currentSlug === NA_SLUG

  const { factions, factionPage, loading } = state

  return (
    <FactionsDirectoryView
      factions={factions}
      factionPage={factionPage}
      loading={loading}
      error={state.error ? extractError(state.error, t('mobile.loadError')) : null}
      unaffiliated={unaffiliated}
      onVisit={(slug) => navigate(`/factions/${slug}`)}
    />
  )
}
