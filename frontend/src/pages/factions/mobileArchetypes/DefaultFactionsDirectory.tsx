import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useAuth } from '../../../auth/AuthContext'
import { extractError } from '../../../utils/errors'
import type { FactionsDirectoryState } from '../useFactionsDirectory'
import FactionsDirectoryView from './FactionsDirectoryView'

const NA_SLUG = 'na'

/**
 * The MOBILE factions-directory skin. It was one of two candidates for a
 * `mobileFactionsDirectory` surface, but no faction ever registered a bespoke
 * directory, so the slot was retired and Factions renders this directly.
 *
 * It used to self-fetch. That made `/factions` remount its data every time the
 * viewport crossed 767px, because the fetch sat below the form-factor switch;
 * the shared `useFactionsDirectory` now runs in the dispatcher instead (#1116).
 * What is left here is the mobile phrasing of the failure and the navigation
 * wiring — all layout still lives in the pure `FactionsDirectoryView`, which is
 * what keeps the surface testable over controlled rows (#743).
 *
 * The invitations feed backs the letters PANEL only — never card state.
 * Desktop's extra `|| invitationBySlug[slug]` arm in its `selectState` is dead
 * code: `_NON_INVITE_FACTION_SLUGS = {"na", "albescent"}` (backend
 * services/character_stats.py) means no letter is ever written for those two,
 * and `get_account_invited_faction_slugs` excludes the same pair while being
 * ACCOUNT-pooled — strictly broader than the character-scoped
 * /factions/invitations. So every slug this feed can return already reports
 * `invited` in /factions/status. The view's selectState stays as-is (#733).
 */
export default function DefaultFactionsDirectory({ state }: { state: FactionsDirectoryState }) {
  const { t } = useTranslation('factions')
  const { user } = useAuth()
  const navigate = useNavigate()
  const currentSlug = user?.character?.faction_slug ?? null
  const unaffiliated = !currentSlug || currentSlug === NA_SLUG

  const { factions, factionPage, invitations, loading } = state

  return (
    <FactionsDirectoryView
      factions={factions}
      factionPage={factionPage}
      invitations={invitations}
      loading={loading}
      error={state.error ? extractError(state.error, t('mobile.loadError')) : null}
      unaffiliated={unaffiliated}
      onVisit={(slug) => navigate(`/factions/${slug}`)}
    />
  )
}
