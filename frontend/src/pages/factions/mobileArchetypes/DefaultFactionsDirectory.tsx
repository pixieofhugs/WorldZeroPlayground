import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import {
  getFactions,
  getFactionStatus,
  getInvitations,
  type FactionOut,
  type FactionPageOut,
  type InvitationLetterOut,
} from '../../../api/factions'
import { useAuth } from '../../../auth/AuthContext'
import { extractError } from '../../../utils/errors'
import FactionsDirectoryView from './FactionsDirectoryView'

const NA_SLUG = 'na'

/**
 * Default MOBILE factions-directory container — the thin fetching wrapper behind
 * the pure `FactionsDirectoryView` skin. Bespoke faction directory skins register
 * in Factions' `mobileFactionsDirectory` surface.
 *
 * Self-fetches the (slug-only) faction list plus the viewer's per-faction status
 * and any invitation letters, then hands them to the view as controlled props so
 * the cards render real member/eligible/locked rather than a uniform neutral. All
 * layout lives in the view; this file owns only the fetch, so the surface is
 * testable over controlled rows (#743) — mirror of DefaultPlayers' container.
 */
export default function DefaultFactionsDirectory() {
  const { t } = useTranslation('factions')
  const { user } = useAuth()
  const navigate = useNavigate()
  const character = user?.character ?? null
  const currentSlug = character?.faction_slug ?? null
  const unaffiliated = !currentSlug || currentSlug === NA_SLUG

  const [factions, setFactions] = useState<FactionOut[]>([])
  const [factionPage, setFactionPage] = useState<FactionPageOut | null>(null)
  const [invitations, setInvitations] = useState<InvitationLetterOut[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setError(null)
    // The invitations feed backs the letters PANEL only — never card state.
    // Desktop's extra `|| invitationBySlug[slug]` arm in its `selectState` is
    // dead code: `_NON_INVITE_FACTION_SLUGS = {"na", "albescent"}` (backend
    // services/character_stats.py) means no letter is ever written for those
    // two, and `get_account_invited_faction_slugs` excludes the same pair while
    // being ACCOUNT-pooled — strictly broader than the character-scoped
    // /factions/invitations. So every slug this feed can return already reports
    // `invited` in /factions/status. The view's selectState stays as-is (#733).
    const load = async () => {
      const factionsData = await getFactions()
      if (cancelled) return
      setFactions(factionsData)
      if (!character) return
      const [statusData, invitesData] = await Promise.all([getFactionStatus(), getInvitations()])
      if (cancelled) return
      setFactionPage(statusData)
      setInvitations(invitesData)
    }
    load()
      .catch((err) => {
        if (!cancelled) setError(extractError(err, t('mobile.loadError')))
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [t, character?.id])

  return (
    <FactionsDirectoryView
      factions={factions}
      factionPage={factionPage}
      invitations={invitations}
      loading={loading}
      error={error}
      unaffiliated={unaffiliated}
      onVisit={(slug) => navigate(`/factions/${slug}`)}
    />
  )
}
