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

/** System slugs hidden from the player-facing grid (not real factions). UA is
 *  shown — the design's select.card set includes its gilt-salon tile. */
const HIDDEN_SLUGS = new Set([NA_SLUG])

/**
 * Factions grid — a directory of pure PREVIEW tiles (the design select.card
 * archetypes). Each tile's CTA links to the faction's detail page
 * (`/factions/:slug`), where ALL membership actions (Join / Leave / Accept /
 * Decline) now live (issue #347). The grid itself carries no membership
 * controls; it only previews each faction's archetype + the viewer's status,
 * and orders the cards by that status.
 */
export default function Factions() {
  const formFactor = useFormFactor()
  // Fetched ABOVE the switch (#1116) so crossing 767px re-dresses the directory
  // instead of re-requesting it. Both surfaces read this one state.
  const state = useFactionsDirectory()

  // No faction skins the directory on the phone, so mobile renders the Default
  // skin directly rather than dispatching on the slug.
  if (formFactor === 'mobile') return <DefaultFactionsDirectory state={state} />

  return <DesktopFactions state={state} />
}

/** Exported for tests: the desktop grid over a controlled directory state, the
 *  same seam `FactionsDirectoryView` gives the phone skin. The page's own fetch
 *  lives in `useFactionsDirectory`, above the form-factor switch. */
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

  // Build the visible faction list (exclude hidden system factions)
  const visibleFactions = factions.filter((f) => !HIDDEN_SLUGS.has(f.slug))

  // Sort: current member first, then invited, then can_return, then rest
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

  // Map the invite-gated status to the select-card's three-state model. Joining
  // itself happens on the faction detail page.
  //
  // The status alone decides it. There used to be a third `|| invitationBySlug[slug]`
  // arm here; #2310 removed it after checking that a held letter can never land
  // outside the two states above. `get_invitation_status` (backend
  // services/faction_service.py) builds the status map and the letters list from
  // ONE `InvitationLetter` select in one response (#1384), so the two cannot skew:
  // `invited_slugs` IS the letter set. Of the branches that can win ahead of
  // `invited` in that map, `member` and `can_return` are both handled above, and
  // `defected` cannot hold a letter at all since #2218 — walking out of a
  // non-rejoinable faction DELETES its letter (`defect_to_faction`) and
  // `maybe_deliver_invitations` subtracts `unjoinable_faction_slugs` before
  // posting a new one. So a letter implies member / can_return / invited, and the
  // arm could only ever re-derive `eligible` for a card already reading it.
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

      {/* Logged-out hint */}
      {!character && (
        <p className="font-body content-text text-muted mb-6">
          {t('index.loggedOutHint')}
        </p>
      )}

      {/* Faction directory grid — one uniform 360×300 archetype tile per faction.
          The tile's CTA visits the faction's detail page, which owns the Join block. */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 'var(--space-2xl)', alignItems: 'flex-start' }}>
        {sortedFactions.map((f) => (
          <div
            key={f.slug}
            style={{ opacity: statusFor(f.slug) === STATUS_DEFECTED ? 0.5 : 1 }}
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
