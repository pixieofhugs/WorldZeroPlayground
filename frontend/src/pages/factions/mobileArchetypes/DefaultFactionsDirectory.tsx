import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useAuth } from '../../../auth/AuthContext'
import { extractError } from '../../../utils/errors'
import type { FactionsDirectoryState } from '../useFactionsDirectory'
import FactionsDirectoryView from './FactionsDirectoryView'

const NA_SLUG = 'na'

/**
 * The MOBILE factions-directory skin. No faction skins the directory, so
 * `Factions` renders this one directly rather than dispatching on a slug.
 *
 * It used to self-fetch. That made `/factions` remount its data every time the
 * viewport crossed 767px, because the fetch sat below the form-factor switch;
 * the shared `useFactionsDirectory` now runs in the dispatcher instead (#1116).
 * What is left here is the mobile phrasing of the failure and the navigation
 * wiring — all layout still lives in the pure `FactionsDirectoryView`, which is
 * what keeps the surface testable over controlled rows (#743).
 *
 * Card state comes from the status map and nothing else. The "Recent Invitations"
 * panel this container used to feed is gone from both form factors (#2310) — the
 * letter is actionable on the Updates feed card, the faction detail page and the
 * arrival popup, and it was actionable on none of them here. Desktop's matching
 * `|| invitationBySlug[slug]` arm went with it: the letters and the status map are
 * one `/factions/status` response built from one query (#1384), so a held letter
 * always reads `member`, `can_return` or `invited` already.
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
